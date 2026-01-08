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

# Install system deps for xgboost if needed (kept minimal)
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and model artifacts (ensure these exist in build context)
COPY . /app

EXPOSE 5000
# Use gunicorn for production; fallback to Flask dev server if not installed
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app.app:app"]
```

Copy this into the `requirements.txt` file:

```
flask
gunicorn
pandas
xgboost
scikit-learn==1.5.2
joblib
```

Next copy this into the app.py file:

```
from flask import Flask, request, jsonify
import pandas as pd
import json
from joblib import load
from pathlib import Path

app = Flask(__name__)

# Load model and feature list at startup
CURRENT_VERSION_PATH = Path('models/v1')
MODEL_PATH = CURRENT_VERSION_PATH / 'model.joblib'
FEATURES_PATH = CURRENT_VERSION_PATH / 'feature_names.json'

# Load the model
model = load(MODEL_PATH)

# Load expected features
with open(FEATURES_PATH, 'r') as f:
    expected_features = json.load(f)


def preprocess_for_prod_from_json(payload):
    if isinstance(payload, dict):
        records = [payload]
    else:
        records = payload    
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
    
    # --- Combine numeric + dummies ---
    numeric_cols = [c for c in ['cylinders','displacement','acceleration','weight','horsepower','year'] if c in df.columns]
    Xcand = pd.concat([df[numeric_cols], origin_dummies, maker_dummies], axis=1)
    
  
    # Add missing columns
    for col in expected_features:
        if col not in Xcand.columns:
            Xcand[col] = 0
    # Keep only expected columns in order
    Xcand = Xcand[expected_features]
    
    return Xcand


@app.route('/predict', methods=['POST'])
def predict():
    payload = request.get_json()
    if payload is None:
        return jsonify({'error': 'Invalid or missing JSON payload'}), 400
    try:
        Xp = preprocess_for_prod_from_json(payload)
        preds = model.predict(Xp)
        return jsonify({'predictions': preds.tolist()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Run this command to build the container. Make sure you are in the folder with the Dockerfile 

!!! warning "Docker Must Be Running"

    If you get an error, you may have forgotten to start Docker!

    Make sure you have Docker Desktop running.

```
docker build -t xgb-flask .
```

Then let's run it locally

```
docker run --rm -p 5000:5000 xgb-flask 
```
You can test your code from `git bash` or the `terminal`

```
curl -X POST http://localhost:5000/predict -H "Content-Type: application/json" -d '{"cylinders":8,"displacement":307,"acceleration":12,"weight":3504,"horsepower":130,"year":75,"origin":5,"name":"chevy ltd"}'
```

