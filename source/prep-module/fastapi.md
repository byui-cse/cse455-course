---
title: Module Prep: Fast API
body-class: index-page
---

# FastAPI for AI Applications

## What is FastAPI?

[FastAPI](https://fastapi.tiangolo.com/) is a modern, high-performance web framework for building APIs with Python. For AI apps, it serves as the interface between your AI models and the outside world, allowing external systems to send data to your models and receive predictions or processing results back. What makes FastAPI particularly appealing is its simplicity.

### Why FastAPI for AI Engineering?

1. **Performance**: Built on Starlette and Pydantic, FastAPI is fast and just works.
2. **Automatic Documentation**: FastAPI automatically generates interactive API documentation (via Swagger UI and ReDoc) from your code and type annotations, making it easier for teams to collaborate.
3. **Type Safety**: Leveraging Pydantic, FastAPI provides automatic request validation and clear error messages, reducing the likelihood of runtime errors.
4. **Asynchronous Support**: Native support for async/await patterns allows your API to handle multiple requests efficiently while waiting for AI model responses.

## Learn More

Beyond this README, [this tutorial](https://fastapi.tiangolo.com/tutorial/) shows you how to use FastAPI with most of its features, step by step. 

### About Uvicorn

Uvicorn is an ASGI(Asynchronous Server Gateway Interface) server that actually runs your FastAPI application. While FastAPI defines your API structure and logic, Uvicorn is the server that handles HTTP connections and serves your application. 

Think of FastAPI as the blueprint for your API, and Uvicorn as the engine that powers it.

The command `uvicorn app.main:app --reload` means:
- `app.`: The folder where your application resides
- `main`: Use the file named `main.py`
- `:app`: Look for a variable named `app` within that file
- `--reload`: Automatically restart the server when you change your code (useful during development)

### Default Port

By default, Uvicorn runs on port 8000. This means:
- Your API will be accessible at `http://localhost:8000`
- `localhost` refers to your own computer
- `8000` is the "door" or port number through which requests can access your API

You can change this with the `--port` flag if needed:
uvicorn main:app --port 5000


## Structure

- `main.py`: Application entry point that creates the FastAPI app
- `router.py`: Routes incoming requests to the appropriate endpoint handlers
- `endpoint.py`: Defines data models and endpoint logic for processing events

This modular approach keeps your code organized as your AI application grows in complexity.

> For comprehensive documentation, visit the [FastAPI official docs](https://fastapi.tiangolo.com/).

## Code Walkthrough

Let's examine how our three files work together to create a clean API for processing AI events.

### 1. `main.py` - Application Entry Point

```python
from fastapi import FastAPI
from router import router as process_router

app = FastAPI()
app.include_router(process_router)
```

This file:

- Creates the main FastAPI application instance
- Imports and includes our router
- Serves as the entry point for Uvicorn to run our application

### 2. `router.py` - Request Routing

```python
from fastapi import APIRouter
import endpoint

router = APIRouter()
router.include_router(endpoint.router, prefix="/events", tags=["events"])
```

This file:

- Creates a main router
- Imports our endpoint module with its router
- Adds the endpoint router with the prefix `/events`
- Uses tags for documentation organization
- Routes all requests that start with `/events` to our endpoint

### 3. `endpoint.py` - Core Logic

```python
import json
from http import HTTPStatus

from fastapi import APIRouter
from pydantic import BaseModel
from starlette.responses import Response

router = APIRouter()


class EventSchema(BaseModel):
    """Event Schema"""

    event_id: str
    event_type: str
    event_data: dict


@router.post("/", dependencies=[])
def handle_event(
    data: EventSchema,
) -> Response:
    print(data)

    # Return acceptance response
    return Response(
        content=json.dumps({"message": "Data received!"}),
        status_code=HTTPStatus.ACCEPTED,
    )
```

This file:

- Defines a Pydantic model `EventSchema` that validates incoming data
- Creates an endpoint router
- Defines a POST handler at `/` (which becomes `/events/` when mounted in router.py)
- Accepts and validates incoming data against our schema
- Returns a JSON response with HTTP status code 202 (Accepted)

#### Key Components:

1. **Pydantic Model**: `EventSchema` defines the structure of valid incoming data:
   - `event_id`: A unique identifier for the event
   - `event_type`: The category or type of event
   - `event_data`: A dictionary containing the actual event data

2. **Router Decorator**: `@router.post("/")` creates a POST endpoint at the base path

3. **Request Handler**: `handle_event()` processes incoming data:
   - FastAPI automatically validates incoming JSON against `EventSchema`
   - Invalid data will be rejected with appropriate error messages
   - Valid data is passed to our function where we can process it

4. **Response**: Returns a simple JSON confirmation with status code 202 (Accepted)

