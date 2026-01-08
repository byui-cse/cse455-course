---
title: NN to Docker
body-class: index-page
---

![Monolithic App]({{URLROOT}}/shared/img/nn_production.png)
*[Photo by ChatGPT](https://chatgpt.com)*

## NN to Docker

You should review the [XGB Example]({{URLROOT}}/ice/xg-boost-production-example.html) before completing these instructions.

Open this example in Colab

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/byui-cse/cse455-course/blob/main/docs/course/notebooks/Simple_NN_example.ipynb){:target="_blank"}

### Review the Notebook

When moving from **XGBoost to a neural network**, the overall deployment pattern remains the same—preprocess inputs, load a trained model, and serve predictions—but several **important production details change**. Neural networks are far more sensitive to input scaling, model format, and runtime environment, which makes consistency between training and inference even more critical.

Unlike tree-based models, neural networks **require normalized inputs** to behave correctly. During training, we fit a `MinMaxScaler` on the training data and apply it to all inputs. In production, this exact same scaler must be reused. As a result, the scaler itself becomes a **first-class production artifact**, saved alongside the model and loaded at application startup. Failing to reuse the same scaler will silently degrade model performance, even if the model loads correctly.

The neural network model is persisted using **Keras’s native `.keras` format** rather than `joblib`. This format stores the full model architecture, weights, and configuration in a single file and is designed specifically for TensorFlow/Keras models. Unlike `joblib`, which serializes Python objects, the `.keras` format is framework-aware and ensures the model can be reliably reloaded for inference. This also means that the runtime environment must include compatible versions of TensorFlow and Keras.

Another key difference is **runtime behavior under load**. XGBoost models perform fast, deterministic CPU-bound inference with minimal overhead. Neural networks, even when small, rely on dense numerical computation and underlying linear algebra libraries. In production, this can lead to higher CPU utilization, increased latency under concurrency, and sensitivity to threading and worker configuration in tools like Gunicorn. These differences become visible when stress testing the service.

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
flask>=2.0
gunicorn
tensorflow>=2.10
pandas
scikit-learn==1.6.1
joblib
numpy
```

Next copy this into the app.py file:

```
from flask import Flask, request, jsonify
import pandas as pd
import json
from pathlib import Path
from joblib import load
from tensorflow.keras.models import load_model
import numpy as np

app = Flask(__name__)

# ----------------------------
# Load model artifacts at startup
# ----------------------------
CURRENT_VERSION_PATH = Path("models/v1")

MODEL_PATH = CURRENT_VERSION_PATH / "model.keras"
FEATURES_PATH = CURRENT_VERSION_PATH / "feature_names.json"
SCALER_PATH = CURRENT_VERSION_PATH / "scaler.joblib"

# Load model
model = load_model(MODEL_PATH)

# Load feature list
with open(FEATURES_PATH, "r") as f:
    expected_features = json.load(f)

# Load scaler
scaler = load(SCALER_PATH)


def preprocess_for_prod_from_json(payload):
    if isinstance(payload, dict):
        records = [payload]
    else:
        records = payload

    df = pd.DataFrame(records)

    # --- Numeric preprocessing ---
    if "horsepower" in df.columns:
        df["horsepower"] = df["horsepower"].replace("?", 0).astype(float)

    # --- Categorical preprocessing ---
    if "origin" in df.columns:
        df["origin"] = (
            df["origin"]
            .map({1: "USA", 2: "Europe", 3: "Japan"})
            .fillna("Unknown")
        )

    if "name" in df.columns:
        df["maker"] = df["name"].astype(str).str.split(" ").str[0]
    else:
        df["maker"] = "Unknown"

    # --- One-hot encoding ---
    origin_dummies = (
        pd.get_dummies(df["origin"], prefix="", prefix_sep="")
        if "origin" in df.columns
        else pd.DataFrame(index=df.index)
    )

    maker_dummies = (
        pd.get_dummies(df[["maker"]])
        if "maker" in df.columns
        else pd.DataFrame(index=df.index)
    )

    # --- Combine numeric + dummies ---
    numeric_cols = [
        c for c in [
            "cylinders",
            "displacement",
            "acceleration",
            "weight",
            "horsepower",
            "year"
        ]
        if c in df.columns
    ]

    Xcand = pd.concat(
        [df[numeric_cols], origin_dummies, maker_dummies],
        axis=1
    )

    # --- Enforce feature contract ---
    for col in expected_features:
        if col not in Xcand.columns:
            Xcand[col] = 0

    Xcand = Xcand[expected_features]

    # --- Scaling (critical for NN) ---
    X_scaled = scaler.transform(Xcand)

    return X_scaled


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json()
    if payload is None:
        return jsonify({"error": "Invalid or missing JSON payload"}), 400

    try:
        Xp = preprocess_for_prod_from_json(payload)

        preds = model.predict(Xp)
        preds = preds.ravel().tolist()  # JSON-safe

        return jsonify({"predictions": preds})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

```

Run this command to build the container. Make sure you are in the folder with the Dockerfile 

!!! warning "Docker Must Be Running"

    If you get an error, you may have forgotten to start Docker!

    Make sure you have Docker Desktop running.

```
docker build -t nn-flask .
```

Then let's run it locally

```
docker run --rm -p 5000:5000 nn-flask 
```
You can test your code from `git bash` or the `terminal`

```
curl -X POST http://localhost:5000/predict -H "Content-Type: application/json" -d '{"cylinders":8,"displacement":307,"acceleration":12,"weight":3504,"horsepower":130,"year":75,"origin":5,"name":"chevy ltd"}'
```

