---
title: NN to Docker
body-class: index-page
---

![Monolithic App]({{URLROOT}}/shared/img/nn_production.jpg)
*[Photo by ChatGPT](https://chatgpt.com)*

## NN to Docker

You should review the [XGB Example]({{URLROOT}}/ice/xg-boost-production-example.html) before completing these instructions.

Open this example in Colab

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/byui-cse/cse455-course/blob/main/docs/course/notebooks/Simple_NN_example.ipynb){:target="_blank"}

### Review the Notebook

When moving from **XGBoost to a neural network**, the overall deployment pattern remains the same—preprocess inputs, load a trained model, and serve predictions—but several **important production details change**. Neural networks are far more sensitive to input scaling, model format, and runtime environment, which makes consistency between training and inference even more critical.

Unlike tree-based models, neural networks **require normalized inputs** to behave correctly. During training, we fit a `MinMaxScaler` on the training data and apply it to all inputs. In production, this exact same scaler must be reused. As a result, the scaler itself becomes a **first-class production artifact**, saved alongside the model and loaded at application startup. Failing to reuse the same scaler will silently degrade model performance, even if the model loads correctly.

The neural network model is persisted using **Keras’s native `.keras` format** rather than `joblib`. This format stores the full model architecture, weights, and configuration in a single file and is designed specifically for TensorFlow/Keras models. Unlike `joblib`, which serializes Python objects, the `.keras` format is framework-aware and ensures the model can be reliably reloaded for inference. This also means that the runtime environment must include compatible versions of TensorFlow and Keras.

Another key difference is **runtime behavior under load**. XGBoost models perform fast, deterministic CPU-bound inference with minimal overhead. Neural networks, even when small, rely on dense numerical computation and underlying linear algebra libraries. In production, this can lead to higher CPU utilization, increased latency under concurrency, and sensitivity to threading and worker configuration in tools like Uvicorn. These differences become visible when stress testing the service.

Finally, neural network deployments often emit additional **runtime warnings** related to hardware acceleration (such as missing CUDA drivers) or numerical optimizations. These warnings are normal in CPU-only environments and do not indicate errors, but they highlight that neural networks are more tightly coupled to the execution environment than traditional ML models.

Run the notebook and it will produce a couple of artifacts that we will need to download:

* feature_names.json
* model.keras
* scaler.joblib

### Prepare things for containerization

Start up Docker Desktop.

Next we will create the following folders and files.

![Basic Folder Structure]({{URLROOT}}/shared/img/nn_docker_folders.jpg)

Copy the three files into the v1 folder inside of models.

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
tensorflow>=2.10
scikit-learn==1.6.1
joblib
pydantic
numpy
```

Next copy this into the `main.py` file:

```
from fastapi import FastAPI
from .router import router as process_router

app = FastAPI()
app.include_router(process_router)
```

Copy this into the `router.py` file:
```
from fastapi import APIRouter
from . import endpoint

router = APIRouter()
router.include_router(endpoint.router, prefix="/mpg", tags=["mpg"])
```

And finally this into the `endpoint.py` file:
```
import json
import os
from http import HTTPStatus
from pathlib import Path
from typing import List, Optional, Union

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import pandas as pd
from fastapi import APIRouter, HTTPException
from joblib import load
from pydantic import BaseModel, Field
from starlette.responses import Response
from tensorflow.keras.models import load_model


router = APIRouter()

# Keep the artifact layout identical to the original deployment.
CURRENT_VERSION_PATH = Path("models/v1")
MODEL_PATH = CURRENT_VERSION_PATH / "model.keras"
FEATURES_PATH = CURRENT_VERSION_PATH / "feature_names.json"
SCALER_PATH = CURRENT_VERSION_PATH / "scaler.joblib"

model = load_model(MODEL_PATH, compile=False)

with FEATURES_PATH.open("r") as feature_file:
    expected_features = json.load(feature_file)

scaler = load(SCALER_PATH)


class CarSchema(BaseModel):
    """A single record from the Auto MPG data set."""

    cylinders: Optional[int] = Field(None, description="Number of cylinders", example=8)
    displacement: Optional[float] = Field(None, description="Engine displacement", example=307.0)
    acceleration: Optional[float] = Field(None, description="Acceleration time in seconds", example=12.0)
    weight: Optional[float] = Field(None, description="Vehicle weight in pounds", example=3504.0)
    horsepower: Optional[float] = Field(None, description="Horsepower; '?' is treated as 0", example=130.0)
    year: Optional[int] = Field(None, description="Model year", example=75)
    origin: Optional[int] = Field(None, description="Origin (1=USA, 2=Europe, 3=Japan)", example=1)
    name: Optional[str] = Field(None, description="Vehicle name", example="chevy ltd")


class PredictionInput(BaseModel):
    data: Union[CarSchema, List[CarSchema]] = Field(
        ..., description="A single car record or a list of car records"
    )


def preprocess_for_prod(payload: Union[CarSchema, List[CarSchema]]):
    if isinstance(payload, list):
        records = [item.model_dump(exclude_none=True) for item in payload]
    else:
        records = [payload.model_dump(exclude_none=True)]

    df = pd.DataFrame(records)

    if "horsepower" in df.columns:
        df["horsepower"] = df["horsepower"].replace("?", 0).astype(float)

    if "origin" in df.columns:
        df["origin"] = df["origin"].map(
            {1: "USA", 2: "Europe", 3: "Japan"}
        ).fillna("Unknown")

    if "name" in df.columns:
        df["maker"] = df["name"].astype(str).str.split(" ").str[0]
    else:
        df["maker"] = "Unknown"

    origin_dummies = (
        pd.get_dummies(df["origin"], prefix="", prefix_sep="")
        if "origin" in df.columns
        else pd.DataFrame(index=df.index)
    )
    maker_dummies = pd.get_dummies(df[["maker"]])

    numeric_cols = [
        column
        for column in [
            "cylinders",
            "displacement",
            "acceleration",
            "weight",
            "horsepower",
            "year",
        ]
        if column in df.columns
    ]
    candidates = pd.concat([df[numeric_cols], origin_dummies, maker_dummies], axis=1)

    for feature in expected_features:
        if feature not in candidates.columns:
            candidates[feature] = 0

    candidates = candidates[expected_features]
    return scaler.transform(candidates)


@router.post("/predict")
async def predict(input_data: PredictionInput) -> Response:
    try:
        features = preprocess_for_prod(input_data.data)
        predictions = model.predict(features, verbose=0).ravel().tolist()
        return Response(
            content=json.dumps({"predictions": predictions}),
            status_code=HTTPStatus.OK,
            media_type="application/json",
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


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
docker build -t nn-fastapi .
```

Then let's run it locally

```
docker run --rm -p 8000:8000 nn-fastapi
```

You can test your container by going to this address and clicking on mpg/health and "Try it out" -> Execute.

[http://localhost:8000/docs](http://localhost:8000/docs)

!!! note "docs"

    FastApi automatically creates swagger docs for your endpoint.

Your endpoints should be

[http://localhost:8000/mpg/health](http://localhost:8000/mpg/health)

and

[http://localhost:8000/mpg/predict](http://localhost:8000/mpg/predict)

You can also test the prediction endpoint from `git bash` or the `terminal`:
```
curl -X POST http://localhost:8000/mpg/predict -H "Content-Type: application/json" -d '{"data":{"cylinders":8,"displacement":307,"acceleration":12,"weight":3504,"horsepower":130,"year":75,"origin":1,"name":"chevy ltd"}}'
```

