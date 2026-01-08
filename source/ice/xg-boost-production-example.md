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

Copy the following into the Dockerfile (notice that this file doesn't have an extension)



Run this command
```
docker build -t xgb-flask .
```

> docker run -p 5000:5000 xgb-flask 

> curl -X POST http://localhost:5000/predict -H "Content-Type: application/json" -d '{"cylinders":8,"displacement":307,"acceleration":12,"weight":3504,"horsepower":130,"year":75,"origin":5,"name":"chevy ltd"}'

