---
title: Module 01: API Contract
body-class: index-page
---

# Recommendation API Contract

## Overview

The Recommendation API provides product recommendations based on the contents of a customer’s shopping cart. It also provides a health-check endpoint that load balancers and monitoring systems can use to verify that the service is running.

## Base URL

The public API is available at:

```text
http://YOURLOADBALANCERDNS:8000
```

The Flask application listens internally on port `8080`. The load balancer is expected to forward public port `8000` to the application.

---

## Health Check

### Endpoint

```http
GET /health
```

### Purpose

The health-check endpoint is required. It is used to determine whether the API service is running and able to receive requests.

### Successful response

Status:

```http
200 OK
```

Body:

```json
{
  "status": "ok"
}
```

### Example request

```bash
curl http://YOURLOADBALANCERDNS:8000/health
```

### Example response

```json
{
  "status": "ok"
}
```

The health check must not require a request body or authentication.

---

## Recommendation Endpoint

### Endpoint

```http
POST /recommend
```

The complete endpoint is:

```text
http://YOURLOADBALANCERDNS:8000/recommend
```

### Required headers

```http
Content-Type: application/json
```

### Request body

```json
{
  "cart": ["240", "200", "277", "78"],
  "top_n": 10
}
```

### Request fields

| Field   | Type    | Required | Description                                                   |
| ------- | ------- | -------: | ------------------------------------------------------------- |
| `cart`  | array   |      Yes | Product IDs currently in the customer’s cart                  |
| `top_n` | integer |       No | Maximum number of recommendations to return; defaults to `10` |

### Request rules

* `cart` must be a JSON array.
* Product IDs are converted to strings by the service.
* The cart may contain up to `50` items.
* `top_n` must be between `1` and `50`.
* If `top_n` is omitted, the service uses `10`.
* Unknown product IDs are ignored by the recommendation models.
* If no known product IDs are provided, the service returns popular products.
* Recommendations should not include products already in the cart.
* Discontinued and out-of-stock products should not be recommended.

### Example request

```bash
curl -X POST \
  http://YOURLOADBALANCERDNS:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{ "cart": ["240", "200", "277", "78"], "top_n": 10 }'
```

---

## Successful Recommendation Response

### Status

```http
200 OK
```

### Response body

```json
{
  "recommendations": ["315", "122", "401"],
  "scores": [0.94, 0.89, 0.81]
}
```

### Response fields

| Field             | Type             | Description                                                       |
| ----------------- | ---------------- | ----------------------------------------------------------------- |
| `recommendations` | array of strings | Recommended product IDs, ordered from highest to lowest relevance |
| `scores`          | array of numbers | Score corresponding to each recommendation                        |

The arrays correspond by position:

```text
recommendations[0] corresponds to scores[0]
recommendations[1] corresponds to scores[1]
```

The number of returned recommendations must not exceed `top_n`. The `recommendations` and `scores` arrays must have the same length.

---

## Error Responses

### Invalid request

Status:

```http
400 Bad Request
```

Example:

```json
{
  "error": "cart must be a list"
}
```

Possible causes include:

* `cart` is not an array.
* The cart contains more than `50` items.
* `top_n` is less than `1`.
* `top_n` is greater than `50`.
* `top_n` is not a valid integer.

### Request timeout

Status:

```http
504 Gateway Timeout
```

Response:

```json
{
  "error": "request timeout"
}
```

### Internal service error

Status:

```http
500 Internal Server Error
```

Response:

```json
{
  "error": "internal error"
}
```

---

## Required Service Behavior

An implementation satisfies this contract if it:

1. Exposes `GET /health`.
2. Returns `{"status": "ok"}` with HTTP status `200` from `/health`.
3. Exposes `POST /recommend`.
4. Accepts JSON request bodies containing `cart` and optionally `top_n`.
5. Returns recommendation IDs and scores in corresponding arrays.
6. Returns no more than `top_n` recommendations.
7. Enforces the maximum cart size of `50`.
8. Enforces the `top_n` range of `1–50`.
9. Excludes cart items, discontinued items, and out-of-stock items from recommendations.
10. Returns an appropriate HTTP error status instead of crashing.
11. Listens on the application’s configured port and is reachable through the load balancer.

## Endpoint Summary

| Method | Path         | Purpose                          |
| ------ | ------------ | -------------------------------- |
| `GET`  | `/health`    | Required service health check    |
| `POST` | `/recommend` | Generate product recommendations |
