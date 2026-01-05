---
title: Module 02: Overview
body-class: index-page
---

![Skittles vs M&Ms]({{URLROOT}}/shared/img/skittles_vs_mnms.jpg)

## Skittles and M&Ms – Real-World Computer Vision Counting System

**Focus Areas:**  
Object detection, data labeling, model training, real-time inference, system latency, deployment, evaluation, iterative improvement

In this project, students will design and build an end-to-end AI system modeled after real industrial production lines. The scenario is simple on the surface—M&Ms and Skittles move down a conveyor belt, and the system must **detect**, **classify**, and **count** them—but it mirrors the exact challenges faced by modern manufacturing, food processing, and logistics companies. Similar systems exist today in potato processing plants, bakery packaging lines, automotive assembly, and quality-control facilities around the world. Your goal is to turn raw visual data into automated decision-making that operates reliably and in real time.

You will label image data, train a computer vision model, export the model to a usable format, and deploy it inside a program that runs continuously as candy passes a fixed camera point. The system should count each candy accurately and produce running totals, reflecting how many M&Ms and how many Skittles have passed. Along the way, students will confront the full AI lifecycle: dataset creation, model training and experimentation, pipeline design, performance tradeoffs, and system integration.

Once the first version is working, the focus will shift to evaluation. You will measure how often the system gets it right, how quickly it can process frames, and how it behaves under real-time constraints. They will identify bottlenecks, design improvements, and implement iterations—just as real ML engineers do when models move from a research environment to production.

!!! warning "Subject to Change"
	
	Keep in mind that your instructor may deviate somewhat from the following guide, and they have final say on assignment requirements, delivery methods, and due dates. So be sure to pay attention to both in-class and Canvas announcements.



---

### Business Context

Modern manufacturing and logistics facilities rely heavily on **computer vision systems** to monitor and automate physical processes. From potato processing plants and candy factories to parcel sorting centers and warehouse conveyors, cameras are used to track items as they move through production lines.

The business requirement is deceptively simple:

> “As items move past a fixed point on a conveyor belt, detect them, count them accurately, and do so fast enough to keep up with production.”

Behind this requirement is a full AI system: cameras, labeled data, trained models, real-time inference, counting logic, and operational constraints such as latency and reliability.

In this module, you will build a **production-style computer vision system** that detects and counts candies (M&Ms and Skittles) as they move along a conveyor belt under a fixed overhead camera.

---

### Project Objectives

Your system must:

* Detect candies from a top-down camera view
* Process video captured at **30 FPS**
* Reliably operate while processing **~6 FPS**
* Count items as they cross a defined point on the conveyor belt
* Maintain running totals per candy color
* Operate in near–real time
* Be deployable as a **local production service**
* Be designed for extension to other industries and products

---

### What You Will Learn

By completing this project, you will learn how to:

* Label video data using **CVAT**
* Train an object detection model using **YOLO**
* Export and load trained models for inference
* Design reliable **line-crossing counting logic**
* Measure end-to-end system latency
* Understand trade-offs between accuracy, speed, and robustness
* Deploy a vision system using **Docker**
* Think about AI systems as operational products, not just models

---

## Phase 1 – Understanding the Physical System

### Business Question

> “What assumptions can we safely make about the environment, and what must the system handle?”

---

### Task

Analyze the physical setup:

* Fixed overhead camera
* Single-lane conveyor belt
* Known frame rate (30 FPS)
* Multiple video files at different belt speeds

---

### Deliverables (Add to your Executive Summary)

1. Written description of system assumptions
2. Diagram showing:
	* Camera position
	* Conveyor direction
	* Counting line

---

## Phase 2 – Data Labeling with CVAT

### Business Question

> “How do we create training data for a vision system?”

---

### Task

* Import provided video files into [https://app.cvat.ai/](https://app.cvat.ai/)
* Extract frames for labeling
* Label candies by **color class**
	* Skittles
		* Purple
		* Orange
		* Yellow
		* Red
		* Green
	* M&Ms
		* Brown
		* Blue
		* Orange
		* Yellow
		* Red
		* Green
	* (For this exercise, we'll group Purple Skittles and Brown M&Ms together)
* Export annotations in a YOLO-compatible format

![Skittles vs M&Ms]({{URLROOT}}/shared/img/mnm_skittles.jpg)

---

### Requirements

* Use instructor-provided video files
* Label at least **700 items per class**
* Define consistent class names and labeling rules

---

### Deliverables (Add to your Executive Summary)

1. Description of labeling strategy
2. Screenshot of CVAT labeling interface

---

## Phase 3 – Training a YOLO Detection Model

### Business Question

> “Can we reliably detect candies under real operating conditions?”

---

### Task

* Train a YOLOv8 detection model using labeled data
* Validate the model on held-out frames
* Export the trained model for inference

---

### Requirements

* Use YOLOv8 (Ultralytics)
* Train a detection-only model
* Document training parameters

---

### Deliverables (Add to your Executive Summary)

1. Description of model architecture
2. Training and validation results
3. Example detection output on unseen frames

---

## Phase 4 – Counting via Line-Crossing Logic

### Business Question

> “Detection alone is not enough—how do we count reliably?”

---

### Task

Build counting logic that:

* Defines a virtual counting line
* Detects when an object crosses the line
* Prevents double-counting
* Maintains per-class totals

---

### Requirements

* Frame-based inference (~6 FPS)
* Line-crossing detection
* Robust handling of overlapping objects

---

### Deliverables (Add to your Executive Summary)

1. Explanation of counting logic
2. Example sequence showing:
	* Detection
	* Line crossing
	* Count increment

---

## Phase 5 – Evaluating System Performance

### Business Question

> “Is this system good enough for production?”

---

### Task

Evaluate your system on a full video:

* Measure total counts per class
* Compare to known ground truth
* Measure processing latency

---

### Metrics

* Counting accuracy (per class)
* Frames processed per second
* End-to-end latency per frame

---

### Deliverables (Add to your Executive Summary)

1. Final counts vs expected counts
2. Performance metrics table
3. Written analysis:
	* Where does the system fail?
	* What trade-offs were made?

---

## Phase 6 – Deployment as a Production Service

### Business Question

> “How would this run on the factory floor?”

---

### Task

Deploy the system as a local service:

* Ingest streaming video or frames
* Perform detection and counting
* Expose results via an API

---

### Requirements

* Package using **Docker**
* Provide a simple HTTP endpoint
* Designed for **local deployment** to minimize latency

---

### Deliverables

1. Running containerized system
2. Example API request/response
3. Short explanation of deployment decisions

---

## Phase 7 – Improving the System

### Business Question

> “How could this system be made better over time?”

---

### Task

Identify and propose improvements, such as:

* Better labeling strategies
* Improved counting robustness
* Handling variable belt speeds
* Model retraining strategies
* Extending to new product types

---

### Stretch Goals

* Improve classification accuracy
* Add support for additional candy types
* Handle variable belt speeds within a single video

---

### Deliverables (Add to your Executive Summary)

1. List of proposed improvements
2. Justification tied to:
	* Business value
	* Operational reliability
	* Scalability to other industries

---

### Final Outcome

By the end of this module, you will have built a **real computer vision system** that mirrors how AI is deployed in manufacturing, food processing, and logistics environments. More importantly, you will understand how raw video becomes reliable, actionable data through careful system design—not just model training.






