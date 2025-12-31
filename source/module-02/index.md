---
title: Module 02: Overview
body-class: index-page
---

![Monolithic App]({{URLROOT}}/shared/img/bread_on_table.jpg)
*[Photo by Nano Banana](https://gemini.google.com)*

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
* **Never** recommend **out-of-stock items**
* Adapt to **new customer behavior over time**
* Support **cold-start products**
* Serve recommendations in **under 500 milliseconds**
* Be deployable as an **online API**

---

### What You Will Learn

By completing this project, you will learn how to:

* Build cart-based recommendation models using real transaction data
* Measure performance with business-relevant metrics
* Understand how recommendation quality degrades over time without retraining
* Identify when and why **retraining** is necessary
* Handle cold-start products in production systems
* Separate **modeling logic** from **business rules**
* Design a recommender system as an **end-to-end service**, not just a model

---

## Phase 1 – Baseline Model: Conditional Probability

### Business Question

> “We know customers often buy certain products together. Can we use our historical sales data to suggest the next most likely item and increase average order value?”

---

### Task

Build a simple recommender based on **co-purchase frequency**:

Given items **A, B, C** in a cart, recommend items that are most frequently purchased together with those items.

![Conditional Probability]({{URLROOT}}/shared/img/conditional_b.png)

What is the probability of A occuring given B already occured?

---

### Requirements

* Use [cart_export_11-15.csv](../course/data/cart/cart_export_11-15.csv) (data from 2011–2015)
* Train on historical carts
* Test on [January Data from answer_2016-01.csv](../course/data/cart/answer_2016-01.csv)
* Recommend **Top-10 items**

---

### Evaluation Metric

* **HitRate@10**
    * Did the true purchased item appear in the top 10 recommendations?

---

### Deliverables (Add to your Executive Summary)

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
* Evaluate it on [December Data from answer_2016-01.csv](../course/data/cart/answer_2016-12.csv)

	!!! note "2016 Information"

        * 2 items were discontinued
        * 37 new items were introduced

---

### Deliverables (Add to your Executive Summary)

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

* Retrain your model using [cart_export_16_11.csv](../course/data/cart/cart_export_16_11.csv)
* Re-evaluate it on [December Data from answer_2016-01.csv](../course/data/cart/answer_2016-12.csv)

---

### Deliverables (Add to your Executive Summary)

1. Updated performance metrics
2. Comparison before and after retraining
3. Written analysis:
    * Did retraining fix the issues identified in Phase 2?
    * What problems remain?
    * What types of issues **cannot** be solved by retraining alone?

---


## Phase 4 – Deploying the Recommender as an API

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

1. Running API endpoint
2. Example request/response
3. Short explanation of deployment choices

---

## Phase 5 – More Data and the Cold-Start Problem

### Business Question

> “How do we recommend products that have never been sold before?”

In 2017:

* **32 new products** were introduced throughout the year
* **4 products** were discontinued

New products create a **cold-start problem** where new users or items in the system lack sufficient interaction data to make reliable recommendations

If an item has no purchase history, your recommender will never recommend it — which biases our recommender to only items that have sales history. In 2016 the number of items available for sale increased 13.7%, and in 2017 it increased another 7%. 

How do we recommend products that are new or have limited sales?


!!! note "Problems with Cold Starts and Popularity"

    One of the primary issues is data sparsity; even with large datasets, the user-item interactions are often too few, leading to challenges in generating accurate recommendations. Another critical hurdle is the cold-start problem, where new users or items in the system lack sufficient interaction data to make reliable recommendations. Furthermore, general bias issues, such as user or item biases, can skew the recommendations towards certain products or users, thereby limiting the diversity of recommendations

    Among these challenges, the issue of popularity bias is particularly detrimental. This bias causes recommender systems to disproportionately favor popular items, resulting in a narrow concentration of recommendations. Such a trend not only undermines the visibility of less popular or new items but also stifles diversity and novelty in the recommendations. [See EquiRate: balanced rating injection approach for popularity bias mitigation in recommender systems](https://peerj.com/articles/cs-3055/){:target="_blank"}

---

### Task

* Retrain your model using [cart_export_17_10.csv](../course/data/cart/cart_export_17_10.csv)
* Re-evaluate it on [November Data from answer_2017-11.csv](../course/data/cart/answer_2017-11.csv)

Analyze the implications of catalog churn and answer the following:

---

### Deliverables

1. Proposal for a **retraining schedule**
    * How often should retraining occur?
    * What signals would trigger retraining?
2. Strategies for handling cold-start products, such as:
    * Promotional overrides
    * Randomized exploration
3. Written justification connecting your strategy to:
    * Business goals
    * Customer experience
    * Long-term data collection

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

* Proposed automation pipeline
* Explanation of:
    * What runs nightly
    * What runs weekly or monthly
    * What requires human approval
* Risks and failure modes to monitor

---

### Final Outcome

By the end of this module, you will have built **not just a recommender model**, but a **real recommendation system** — one that reflects how production systems are designed, evaluated, deployed, and maintained in industry.
