---
title: Deploy docker to AWS
body-class: index-page
---

## Deploy Docker to AWS

### Install AWS CLI

You'll need to install the AWS CLI to be able to push to AWS

Use this link to download the CLI

[https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### Update the credentials

You'll need the following information to complete the configuration (If you disconnect from the AWS Learner Lab, you'll need to complete these steps again)


* Click on the tab where you opened the AWS Lab
* Click on **i** AWS Details
* Click on Show next to AWS CLI:
* Copy the contents of that box starting at the beginning of [default]. It should have the access key id, the secret access key and the token

![AWS CLI access key]({{URLROOT}}/shared/img/aws-cli-example.jpg)

* You'll paste these pieces of information into .aws/credentials file. Then run this command:

```
aws configure
```

Verify your AWS CLI Authentication1

```
aws sts get-caller-identity
```

You should get something like this in return:

<div class="results">
{
    "UserId": "AROAIEXAMPLEID",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/RoleName/RoleSessionName"
}
</div>

Start up **Docker Desktop**

# Create the container registry

On AWS, with your leaner lab started, <span class="material-symbols-outlined">search</span>Search for ECR which will bring up Elastic Container Registry. Open this in a new tab.

* <span class="amz-orange-button">Create repository</span>
* Repository name: recommender-app
* <span class="amz-orange-button">Create repository</span>
* Click on <span class="amz-link">recommender-app</span>
* <span class="amz-white-button">View push commands</span>
* Copy the 4 commands and run them in your EC2 terminal. 

The commands should look something like this (don't use the commands below, COPY from the PUSH COMMANDS for your specific repository)

![Docker Commands]({{URLROOT}}/shared/img/docker-commands.jpg)

You should receive a response that shows the docker container was pushed to the ECR.

Go back to the ECR tab and click <span class="amz-white-button">Close</span>

* Click the <span class="amz-white-button"><span class="material-symbols-outlined">
refresh
</span></span> button.

You should see 1 image with a tag of latest in the list.

![Docker container uploaded to ecr]({{URLROOT}}/shared/img/ecr-uploaded.jpg)

!!! note "Image URI"

    You'll need the Image URI for this image later in the lab.

## Update security group

* Search for EC2 in the AWS search bar

* Click on **Security Groups** on the left
* Click on the Security Group ID (mine looked something like sg-062afafafaf0302)
* Click **Edit inboud rules**
* Add a rule
    * Type: Custom TCP
    * Port Range: 8080 or whatever your container port was 
    * Source: Custom
    * 0.0.0.0/0
* Save rules

## Create an ECS

* Search for ECS and open the Elastic Container Service in a new tab

### Create a cluster

* <span class="amz-orange-button">Create cluster</span>
* Cluster name: **RecommenderCluster**
* Use fargate
* <span class="amz-orange-button">Create</span>
* Wait for the cluster to create

!!! warning "Cluster"

    Occassionally the learner lab will fail to build the cluster. 
    
    You can go to cloudformation and rerun the build.
    
    If that fails, create a second cluster and call it RecommenderCluster2 and use it instead.

### Create a task definition

* Click <span class='amz-white-button'>Task definitions</span> on the left-hand column
* Click <span class="amz-orange-button">Create new task definition <span class="material-symbols-outlined">
arrow_drop_down
</span></span> <span class="amz-white-button">Create new task definition</span>
* Task definition family: **RecommenderSystem**
* **MAC USERS** If you are on an ARM system, make sure you select **Operating system/Architecture** options and choose Linux/ARM64 instead.
* Launch Type: Fargate
* CPU: 1 vCPU
* Memory: 3 GB
* Task role: LabRole
* Task execution role: LabRole

Under Container-1

* Name: recommender-container
* Image URI: paste in the URI from the ECR Image URI
* Port mappings: Set the container port to the port your app is running on. ie 8080, 5000, 5001
* <span class="amz-oranage-button">Create</span>

## Deploy the containers

* <span class="amz-white-button">Deploy </span> <span class="amz-white-button">Create service</span>
* Exisiting cluster: RecommenderCluster
* Under Deployment configuration
    * Service Name: RecommenderAppService
<!-- * Under Networking
    * VPC: vehicleapp-vpc
    * remove the private subnets
    * Exisiting Security Group: Add vehicle-sg and remove the default one -->
* Under Load balancing
    * Load balancer type: Application Load Balancer
    * Load balancer name: **RecommenderLoadBalancer**
* Under Service auto scaling
    * Check Use service auto scaling
    * Minimum number of tasks: 1
    * Maximum number of tasks: 3
    * Policy Name: Recommender CPU usage
    * ECS service metric: ECSServiceAverageCPUUtilization
    * Target value 70 (these look like they already have values, you need to TYPE them in)
    * Scale-out: 300
    * Scale-in: 300
* <span class="amz-orange-button">Create</span>
* Wait for the deployment to start
* Click the <span class="amz-white-button"><span class="material-symbols-outlined">
refresh
</span></span> button under Services.

You will see 1/1 Tasks running 

* Click on <span class="amz-link">RecommenderAppService</span>
* Click on <span class="amz-white-button">View load balancer <span class="material-symbols-outlined">
open_in_new
</span></span>

Copy the DNS name for the load balancer and paste it into a new tab.

You will see your app running in a container on your load balancer. If we received enough traffic, the app would auto scale up to 3 containers for us.

Test the endpoint by curling the new endpoint you have created.