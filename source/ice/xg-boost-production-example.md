---
title: XGBoost to Docker
body-class: index-page
---

![Monolithic App]({{URLROOT}}/shared/img/xgb_production.png)
*[Photo by ChatGPT](https://chatgpt.com)*

## XGBoost to Docker

Open this example in Colab

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/byui-cse/cse455-course/blob/main/docs/course/notebooks/XGBRegressor_example.ipynb){:target="_blank"}

### Review the Notebook

You may have similar notebooks that you have previously built. This example demonstrates a straightforward workflow to prepare an XGBoost model for deployment within a Docker container.

First, we define a **preprocessing function** that performs all necessary data transformations. Centralizing preprocessing in a single function ensures consistency and maintainability, allowing us to apply the same transformations during both training and inference. It is essential to replicate all the transformations applied in the original notebook to maintain model accuracy and integrity.

Next, we **persist the trained model** using **`joblib`**, a Python library optimized for serializing and deserializing large NumPy arrays and machine learning models efficiently. `joblib` enables us to save the model to disk and later load it back into memory for inference without retraining.

Additionally, we save the **feature names** into a JSON file. This ensures that during deployment, the input data aligns exactly with the features expected by the model, preventing mismatches or errors when feeding new data for prediction.

By following these steps—centralized preprocessing, saving the model with `joblib`, and storing feature metadata—we create a robust and reproducible workflow that simplifies deploying machine learning models in Dockerized production environments.

Python’s **`pickle`** module is commonly used to serialize and save Python objects, including machine learning models. **`joblib`** serves a similar purpose but is optimized for objects that contain large NumPy arrays, making it faster and more memory-efficient for most machine learning models. In practice, both `pickle` and `joblib` allow you to save and load models for later use, but `joblib` is generally preferred for models with large numerical data, while `pickle` works for general-purpose Python objects.

Run the notebook and it will produce a couple of artifacts that we will need to download:

* feature_names.json
* xgb_model.joblib

### Prepare things for containerization

Start up Docker Desktop.

Next we will create the following folders and files.

![Basic Folder Structure]({{URLROOT}}/shared/img/docker_folders.jpg)

Copy the two files into the v1 folder inside of models. Then rename xgb_model.joblib to model.joblib

Copy the following into the `Dockerfile` (notice that this file doesn't have an extension)

```
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Copy this into the `requirements.txt` file:

```
fastapi
uvicorn
pandas
xgboost
scikit-learn==1.5.2
joblib
pydantic
```

Next copy this into the main.py file:

```
from fastapi import FastAPI
from .router import router as process_router

app = FastAPI()
app.include_router(process_router)
```

Copy this into the router.py file:
```
from fastapi import APIRouter
from . import endpoint

router = APIRouter()
router.include_router(endpoint.router, prefix="/mpg", tags=["mpg"])
```

And finally this into the endpoint.py file:
```
import json
from http import HTTPStatus

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import Response
from typing import Optional, Union, List
import pandas as pd
from joblib import load
from pathlib import Path

router = APIRouter()

# Load model and feature list at startup
CURRENT_VERSION_PATH = Path('models/v1')
MODEL_PATH = CURRENT_VERSION_PATH / 'model.joblib'
FEATURES_PATH = CURRENT_VERSION_PATH / 'feature_names.json'

model = load(MODEL_PATH)

with open(FEATURES_PATH, 'r') as f:
    expected_features = json.load(f)


class CarSchema(BaseModel):
    """Schema for a single car record."""

    cylinders: Optional[int] = Field(None, description="Number of cylinders", example=8)
    displacement: Optional[float] = Field(None, description="Engine displacement", example=307.0)
    acceleration: Optional[float] = Field(None, description="Time to accelerate (seconds)", example=12.0)
    weight: Optional[float] = Field(None, description="Vehicle weight (lbs)", example=3504.0)
    horsepower: Optional[float] = Field(None, description="Engine horsepower", example=130.0)
    year: Optional[int] = Field(None, description="Model year", example=75)
    origin: Optional[int] = Field(None, description="Origin (1=USA, 2=Europe, 3=Japan)", example=1)
    name: Optional[str] = Field(None, description="Car name", example="chevy ltd")


class PredictionInput(BaseModel):
    data: Union[CarSchema, List[CarSchema]] = Field(
        ..., description="A single car record or a list of car records"
    )

    


def preprocess_for_prod_from_json(payload):
    if isinstance(payload, list):
        records = [item.model_dump(exclude_none=True) for item in payload]
    else:
        records = [payload.model_dump(exclude_none=True)]

    df = pd.DataFrame(records)

    # --- Numeric preprocessing ---
    if 'horsepower' in df.columns:
        df['horsepower'] = df['horsepower'].replace('?', 0).astype(float)

    # --- Categorical preprocessing ---
    if 'origin' in df.columns:
        df['origin'] = df['origin'].map({1: 'USA', 2: 'Europe', 3: 'Japan'}).fillna('Unknown')

    if 'name' in df.columns:
        df['maker'] = df['name'].astype(str).str.split(' ').str[0]
    else:
        df['maker'] = 'Unknown'

    # --- One-hot encoding ---
    origin_dummies = pd.get_dummies(df['origin'], prefix='', prefix_sep='') if 'origin' in df.columns else pd.DataFrame(index=df.index)
    maker_dummies = pd.get_dummies(df[['maker']]) if 'maker' in df.columns else pd.DataFrame(index=df.index)

    # --- Combine ---
    numeric_cols = [c for c in ['cylinders','displacement','acceleration','weight','horsepower','year'] if c in df.columns]
    Xcand = pd.concat([df[numeric_cols], origin_dummies, maker_dummies], axis=1)

    # Align columns
    for col in expected_features:
        if col not in Xcand.columns:
            Xcand[col] = 0

    Xcand = Xcand[expected_features]

    return Xcand


@router.post("/predict")
async def predict(input_data: PredictionInput) -> Response:
    try:
        Xp = preprocess_for_prod_from_json(input_data.data)
        preds = model.predict(Xp)
        return Response(
            content=json.dumps({"predictions": preds.tolist()}),
            status_code=HTTPStatus.OK,
            media_type="application/json",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health() -> Response:
    return Response(
        content=json.dumps({"status": "ok"}),
        status_code=HTTPStatus.OK,
        media_type="application/json",
    )
```

### Test your app

You can test your app with this code:
```
cd deploy
uvicorn app.main:app --port 8000
```


Run this command to build the container. Make sure you are in the folder with the Dockerfile 

!!! warning "Docker Must Be Running"

    If you get an error, you may have forgotten to start Docker!

    Make sure you have Docker Desktop running.

```
docker build -t xgb-fastapi .
```

Then let's run it locally

```
docker run --rm -p 8000:8000 xgb-fastapi 
```


You can test your container by going to this address and clicking on mpg/health and "Try it out" -> Execute.


[http://localhost:8000/docs](http://localhost:8000/docs)

!!! note "docs"

    FastApi automatically creates swagger docs for your endpoint.


Your endpoints should be 

[http://localhost:8000/mpg/health](http://localhost:8000/mpg/health)

and

[http://localhost:8000/mpg/predict](http://localhost:8000/mpg/predict)



