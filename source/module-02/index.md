---
title: Module 02: Overview
body-class: index-page
---

<!-- ![Monolithic App]({{URLROOT}}/shared/img/technology-product-development-sprint2.jpg)
*[Photo by Dall-E-3](https://openai.com/dall-e-3)*

## Module 02 - Real-World Cart-Based Recommender System

**Focus Areas:** Sequential recommendation, temporal modeling, cold start, product lifecycle, business constraints

In this project, you will build a production-style recommender system that suggests products to add to a shopping cart based on items already present. You will work with multi-year real retail transaction data in which:

* new products enter the catalog over time
* products are discontinued
* seasonal items surge and decline
* products are temporarily sold-out and unavailable
* customer behavior shifts from year to year

Your task is to:
    * Design an end-to-end recommendation system
    * Handle changing product catalogs (additions and discontinuations)
    * Never recommend a discontinued item
    * Build and test mupltiple recommendation models
    * Identify a retraining schedule
    * Improve recommendations over time
    * Deploy the recommendation system online
    * Provide recommendations in less than 500 milliseconds

By completing this project you will learn how to:

* Build recommendation models using real-world patterns
* Avoid future data leakage using time-based splits
* Handle cold-start products with limited history
* Prevent discontinued and out-of-stock items from being recommended
* Detect and account for seasonality
* Evaluate models using cart-completion metrics
* Design serving-layer logic separate from modeling logic
* Produce business-oriented analysis and design decisions

## Phase 1 Baseline Model Conditional Probability

Build a simple product recommender:

Given items A,B,C in a cart

Recommend items most frequently co-purchased with A,B,C

Requirements

Use *cart_export_11-15* which includes data from 2011 through 2015

Test on January

Evaluation Metric

HitRate@10

Deliverables
Metrics for January

Filter training data to only use 2015 and test on January again.

What where your results?
How did they change when you used less data?
Why did they change? Explain.

## Phase 2 - Examine changes in customer purchaing patterns over time

Use your best model to make predictions on the answers_2016_12.csv 

This is data from December of 2016. Throughout 2016 there were 2 discontinued items and 37 new items added to site.
What were your results?
How did they change from the January 2016 test?
Why did they change?
What could be the causes? Explain. 
What would happen as time continues?

## Phase 3 - Retraining

Retrain your model on the data cart_export_2016_11.csv
Does this take care of the causes you identified above? What else do you need to improve your recommender?

## Phase 4 - More data and Cold Start Problem

2017 - 32 new items added:
1 - January
7 - February
3 - May
1 - June
14 - August
6 - October

4 Items discontinued 
2 - May
1 - July
1 - October

How often should we be retraining?
How do we deal with recommending new items? If they've never been sold before, our recommender won't ever recommend them and they'll be less likely to be purchased. This is a cold item start problem.

## Phase 5 - Deploying to an API

* Pickle
* Docker
* Deploy

## Phase 6 - Separating Filter Logic and Modeling Logic

* Out of Stock Items
* Discontinued Items
* Holiday Specials
* Cold Starts and Promotional Items

## Phase 7 - Automating training and filtering -->


## Module 02 – Real-World Cart-Based Recommender System

**Focus Areas:**
Sequential recommendation, temporal modeling, cold start, product lifecycle, retraining strategy, business constraints, production deployment

---

### Business Context

Modern e-commerce recommendation systems do **not** operate in static environments. Over time:

* New products are introduced
* Old products are discontinued
* Some products temporarily go out of stock
* Customer behavior evolves due to trends, seasonality, and promotions

The business expectation is simple but demanding:

> “When a customer adds items to their cart, recommend additional products they are likely to purchase — quickly, accurately, and without violating business constraints.”

Behind that expectation lies a complex engineering and modeling problem.

In this module, you will build a **production-style cart-based recommender system** using multi-year retail transaction data. The goal is not just accuracy, but **robustness over time** and **deployability in a real system**.

---

### Project Objectives

Your recommender system must:

* Suggest products based on items already in a cart
* Handle **changing product catalogs**
* **Never** recommend discontinued items
* Avoid recommending **out-of-stock items**
* Adapt to **new customer behavior over time**
* Support **cold-start products**
* Serve recommendations in **under 500 milliseconds**
* Be deployable as an **online API**

---

### What You Will Learn

By completing this project, you will learn how to:

* Build cart-based recommendation models using real transaction data
* Use **time-based splits** to prevent future data leakage
* Measure performance with business-relevant metrics
* Understand how recommendation quality degrades over time
* Identify when and why **retraining** is necessary
* Handle cold-start products in production systems
* Separate **modeling logic** from **business rules**
* Design a recommender system as an **end-to-end service**, not just a model

---

## Phase 1 – Baseline Model: Conditional Probability

### Business Question

> “If customers frequently buy certain items together, can we use that information to recommend products?”

This phase establishes a **baseline** recommender that the business can understand and trust.

---

### Task

Build a simple recommender based on **co-purchase frequency**:

Given items **A, B, C** in a cart, recommend items that are most frequently purchased together with those items.

---

### Requirements

* Use `cart_export_11-15.csv` (data from 2011–2015)
* Train on historical carts
* Test on **January data**
* Recommend **Top-10 items**

---

### Evaluation Metric

* **HitRate@10**

  * Did the true purchased item appear in the top 10 recommendations?

---

### Deliverables

1. Description of your baseline algorithm
2. January HitRate@10 using all available training data
3. January HitRate@10 when training **only on 2015 data**
4. Written analysis answering:

   * How did performance change?
   * Why did using less data affect results?
   * What trade-offs does the business face when limiting training data?

---

## Phase 2 – Changing Customer Behavior Over Time

### Business Question

> “If we build a recommender today, how long will it stay accurate?”

Customer behavior is **not stationary**. Products change, preferences shift, and recommendations can silently degrade.

---

### Task

* Use your best Phase 1 model
* Evaluate it on `answers_2016_12.csv` (December 2016)
* During 2016:

  * 2 items were discontinued
  * 37 new items were introduced

---

### Deliverables

1. Performance metrics on December 2016
2. Comparison to January 2016 results
3. Written analysis addressing:

   * How did performance change?
   * Why did it change?
   * What role did new and discontinued products play?
   * What would happen if the model were **never retrained**?

---

## Phase 3 – Retraining the Model

### Business Question

> “Can retraining fix performance degradation?”

Retraining costs time, money, and engineering effort. The business wants to know **when retraining helps — and when it doesn’t**.

---

### Task

* Retrain your model using `cart_export_2016_11.csv`
* Re-evaluate on December 2016

---

### Deliverables

1. Updated performance metrics
2. Comparison before and after retraining
3. Written analysis:

   * Did retraining fix the issues identified in Phase 2?
   * What problems remain?
   * What types of issues **cannot** be solved by retraining alone?

---

## Phase 4 – More Data and the Cold-Start Problem

### Business Question

> “How do we recommend products that have never been sold before?”

In 2017:

* **32 new products** were introduced throughout the year
* **4 products** were discontinued

New products create a **cold-start problem**:
If an item has no purchase history, your recommender will never recommend it — which guarantees it will never get purchased.

---

### Task

Analyze the implications of catalog churn and answer the following:

---

### Deliverables

1. Proposal for a **retraining schedule**

   * How often should retraining occur?
   * What signals would trigger retraining?
2. Strategies for handling cold-start products, such as:

   * Popularity-based injection
   * Promotional overrides
   * Randomized exploration
3. Written justification connecting your strategy to:

   * Business goals
   * Customer experience
   * Long-term data collection

---

## Phase 5 – Deploying the Recommender as an API

### Business Question

> “How does this model actually get used by the website?”

Models are useless unless they can be **served reliably**.

---

### Task

Deploy your recommender as a production-style API.

---

### Requirements

* Serialize model artifacts using **Pickle**
* Package the system using **Docker**
* Serve recommendations via an HTTP endpoint
* Respond in under **500 ms**

---

### Deliverables

1. Dockerfile
2. Running API endpoint
3. Example request/response
4. Short explanation of deployment choices

---

## Phase 6 – Separating Modeling Logic from Business Rules

### Business Question

> “Why is the model recommending items we can’t sell?”

Not all recommendation logic belongs in the model.

---

### Task

Separate **model predictions** from **business constraints**, including:

* Discontinued items
* Out-of-stock items
* Holiday or promotional items
* Cold-start product promotion

---

### Deliverables

1. Diagram or explanation of your system architecture
2. Description of:

   * What logic belongs in the model
   * What logic belongs in the serving layer
3. Example showing how business rules override model output

---

## Phase 7 – Automating Training and Filtering

### Business Question

> “Can this system run without constant human intervention?”

---

### Task

Design an automation strategy for:

* Periodic retraining
* Updating discontinued and out-of-stock lists
* Safely deploying updated models

---

### Deliverables

1. Proposed automation pipeline
2. Explanation of:

   * What runs nightly
   * What runs weekly or monthly
   * What requires human approval
3. Risks and failure modes to monitor

---

### Final Outcome

By the end of this module, you will have built **not just a recommender model**, but a **real recommendation system** — one that reflects how production systems are designed, evaluated, deployed, and maintained in industry.
