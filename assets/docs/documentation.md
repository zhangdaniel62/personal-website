---
geometry:
  - top=0.6in
  - bottom=1in
  - left=1in
  - right=1in
header-includes:
  - \usepackage{graphicx}
  - \setlength{\parskip}{0pt}
  - \usepackage{amsmath}
  - \usepackage{newunicodechar}
  - \newunicodechar{⋮}{\(\vdots\)}
---

\thispagestyle{empty}
\vspace*{-0.5in}
\begin{center}
\includegraphics[width=150pt]{assets/images/logo.png}
\end{center}
\vspace{-0.5in}


# Project 5: Creation of a CI/CD pipeline that automatically updates upon a push

A CI/CD pipeline was created to automate the deployment of the existing static website from Project 4. This pipeline integrates GitHub, AWS CodePipeline, and CodeBuild to automatically build and deploy changes to an S3 bucket whenever updates are pushed to the repository. The system builds on the previously established architecture (S3, CloudFront, Route 53, and ACM) by introducing automation and improving security through the use of a private S3 bucket and CloudFront Origin Access Control (OAC). As a result, the website can now be continuously updated with minimal manual intervention while ensuring that all content is securely delivered through the custom domain.

## Services Used

### Namecheap: Domain Registration

Namecheap was used to purchase a domain ([zhangdaniel62csce412.me](zhangdaniel62csce412.me)). This was used to have a human-readable domain name that users could use to access said website. It provides a readable and memorable address that users can enter in a browser.

### Amazon S3: Hosting Service

Amazon S3 is a cloud storage service used to host static content such as HTML, CSS, and JavaScript files. It acts as a simple web server for static content. The direct endpoint to the S3 bucket was hidden, and the website is only accessible through the Cloudfront distribution. This is done to ensure that all traffic to the website goes through Cloudfront, which provides HTTPS and caching.

### Amazon Route 53: DNS Service

Route 53 is used to route users that visit the domain to the correct AWS resource. This is important as it allows for traffic for the domain to the correct location. In addition, it is used for certificate validation through ACM. It translates the domain name into the appropriate Cloudfront distribution, allowing users to access the website using a human-readable URL.

### AWS Certificate Manager (ACM): SSL Certificate

ACM was used to provision and deploy a secure HTTPS certificate. It is essential to convert the website from HTTP to HTTPS, which in essence encrypts the data between the user and the website. 

### Amazon Cloudfront: CDN + HTTPS Layer

Cloudfront is responsible for distributing the website hosted on S3 globally and enabling HTTPS using the ACM certificate that was provisioned by ACM. It caches content on edge servers (servers that are closest to the user) to improve latency and the general responsiveness of the website. This includes images, files, and stylesheets. In addition, Cloudfront is required because S3 does not natively support HTTPS for custom domains (such as the one that was purchased off of Namecheap). An origin access identity (OAI) was also created to restrict access to the S3 bucket, ensuring that all traffic goes through Cloudfront.

### AWS CodeBuild: Build Service

CodeBuild is a fully managed build service that compiles source code, runs tests, and produces software packages that are ready to deploy. It was used to build the website and prepare it for deployment. In this case, it was used to sync the local files to the S3 bucket and create an invalidation for the Cloudfront distribution to ensure that the latest changes are reflected on the website.

### AWS CodePipeline: CI/CD Service

CodePipeline is a fully managed continuous integration and continuous delivery (CI/CD) service that helps automate the build, test, and deploy phases of the release process. It was used to create a pipeline that automatically updates the website whenever a change is pushed to the main branch of the GitHub repository. The pipeline is triggered by a webhook from GitHub, which starts the build process in CodeBuild if a change is pushed. Once the build is complete, the changes are deployed to S3 and Cloudfront is flushed of its cache to reflect the latest changes on the website.

Together, these services allowed the website to be securely accessed through a custom domain ([zhangdaniel62csce412.me](zhangdaniel62csce412.me)). The structure used is scalable and cost-efficient, as it does not require the management of physical servers.

---

## Process of the creation of the CI/CD pipeline

A CI/CD pipeline was created using AWS CodePipeline and CodeBuild to automate deployment of the static website. The pipeline pulls source code from a GitHub repository, runs a build step defined in a buildspec file, and deploys the updated files to an S3 bucket, with CloudFront invalidation to reflect changes immediately. The existing architecture from Project 4 (S3, CloudFront, Route 53, ACM) was extended by making the S3 bucket private and configuring CloudFront with Origin Access Control (OAC) so that content is only accessible through the domain. This allows any updates pushed to GitHub to automatically propagate to the live website while maintaining secure access.

### Deploying an AWS CodeBuild build project:

1. Go to CodeBuild -> Build projects -> Create build project.
2. Name your project and select "Default Project" for the project type
3. Select "No source" as the source, as CodePipeline will provide the source.
4. Select the following in environment (should be the defaults): 
  - provisioning model: on-demand
  - environment image: managed image
  - compute: EC2
  - running mode: container
  - OS: Amazon Linux
  - Runtime: Standard
  - Image version: use latest
  - rest are default
5. for Buildspec, choose "insert build commands", and enter the following as a build command, which will be overridden later after the pipeline is fully built:

`echo "Build has started"`

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CodeBuild-buildspec.png}
\end{center}

6. Create the build project

### Deploying CodePipeline:

1. Click on create new pipeline, then build custom pipeline: 

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CodePipeline-creation.png}
\end{center}

2. Name the pipeline, and change the execution mode to "Superseded", which overrides a run if a new change is pushed to the website. Keep the following settings:
  - Create new service role
  - artifact store: Default location
  - encryption key: Default AWS Managed Key

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CodePipeline-pipeline-settings.png}
\end{center}

3. Select "GitHub (via GitHub App)" as the source provider, and connect a GitHub Connection to CodePipeline. If it isn't created, go ahead and create one. Install an app to connect to the repository as a bot. Choose the correct repository as well as the branch which will have changes tracked. Ensure that "Start your pipeline on push and pull request events." is enabled. 

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CodePipeline-source.png}
\end{center}

4. Add the following webhook event filter to ensure that the pipeline is run only when a change is pushed directly to main or a PR is merged into the main branch:
  - Event type: Push
  - Filter type: Branch
  - Branches or patterns: main

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CodePipeline-webhook.png}
\end{center}

5. Choose "Other build providers -> AWS CodeBuild" as the build provider, and select the CodeBuild build project made previously. 
6. Select "Insert build commands", and enter the following:

```sh
version: 0.2

phases:  
	pre_build:    
		commands:      
			- echo "Pipeline buildspec file ran"  
	build:    
		commands:      
			- aws s3 sync . s3://$S3_BUCKET --delete --exclude ".git/*" --exclude "config/buildspec.yml"      
			- aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

7. Add the following environment variables as plaintext:
  - Name of S3 bucket hosting the website
  - ID of CloudFront distribution
8. Ensure that the following are correct:
  1. Build type: Single build
  2. Input artifact contains source artifact

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CodePipeline-build-stage.png}
\end{center}

> [!IMPORTANT]
> In order to avoid potential issues, it is advised that the region of the pipeline is identical to the region that your S3 bucket is located

9. Skip the addition of a test phase, as it is not needed.
10. Skip the deploy stage, as it is not needed.
11. Ensure all information is correct, and create the pipeline.

> [!NOTE] 
> the parameter `DetectChanges` will appear to be false. This is expected, as a custom webhook was created.

### Edits to S3 and CloudFront:

1. Enable Block public access (bucket settings) in S3 under permissions. All public access should be blocked.
2. Edit the bucket policy such that CloudFront is the only service allowed to directly access the S3 bucket and replace it with

```sh
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::www.zhangdaniel62csce412.me/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::315608487286:distribution/ENKM3D1VRMFYM"
                }
            }
        }
    ]
}
```

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-S3-policychange.png}
\end{center}

3. Head to CloudFront and enter the distribution that is used for the website
4. Under the "Security" tab, click on "origin access".  Create a new OAC, and make sure that "sign requests" is on, and the origin type is S3.
\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CloudFront-OAC.png}
\end{center}  

6. Go to the "Distributions" tab, and select the distribution that is used for the website. Click on "Edit" under the "Origins and Origin Groups" section.
7. Go to the Origin tab and click on "Create Origin"
8. Choose the correct origin domain as well as a name for the origin. Change origin access from "public" to "Origin Access Controls". Select the OAC that was created earlier and create the origin.

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-CloudFront-origin.png}
\end{center}

---

## How to update the website automatically

The website is automatically updated through the CI/CD pipeline whenever changes are pushed to the main branch of the GitHub repository. When a commit is pushed (or when a pull request is merged into main), CodePipeline is triggered via a webhook, which pulls the latest code, runs the build process in CodeBuild, and deploys the updated files to the S3 bucket. After deployment, a CloudFront invalidation is performed to ensure that cached content is refreshed and the latest version of the website is served. This allows updates to be reflected on the live site without any manual intervention.

### Screenshot of the website before a change is pushed to GitHub, showing the old content:

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-before-push.png}
\end{center}

### Screenshot of the website after a change is pushed to GitHub, showing the new content:

\begin{center}
\includegraphics[width=300pt]{assets/images/documentation/proj-5-after-push.png}
\end{center}
