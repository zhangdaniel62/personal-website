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


# Project 4: Hosting a site with HTTPS and a custom domain

The goal of the following project was to host a static website on the internet using a custom domain and HTTPS. In order to achieve this, multiple services were used, each to accomplish a specific role.

---

## Services Used

### Namecheap: Domain Registration

Namecheap was used to purchase a domain ([zhangdaniel62csce412.me](zhangdaniel62csce412.me)). This was used to have a human-readable domain name that users could use to access said website. It provides a readable and memorable address that users can enter in a browser.

### Amazon S3: Hosting Service

Amazon S3 is a cloud storage service used to host static content such as HTML, CSS, and JavaScript files. It acts as a simple web server for static content.

### Amazon Route 53: DNS Service

Route 53 is used to route users that visit the domain to the correct AWS resource. This is important as it allows for traffic for the domain to the correct location. In addition, it is used for certificate validation through ACM. It translates the domain name into the appropriate Cloudfront distribution, allowing users to access the website using a human-readable URL.

### AWS Certificate Manager (ACM): SSL Certificate

ACM was used to provision and deploy a secure HTTPS certificate. It is essential to convert the website from HTTP to HTTPS, which in essence encrypts the data between the user and the website. 

### Amazon Cloudfront: CDN + HTTPS Layer

Cloudfront is responsible for distributing the website hosted on S3 globally and enabling HTTPS using the ACM certificate that was provisioned by ACM. It caches content on edge servers (servers that are closest to the user) to improve latency and the general responsiveness of the website. This includes images, files, and stylesheets. In addition, Cloudfront is required because S3 does not natively support HTTPS for custom domains (such as the one that was purchased off of Namecheap).

Together, these  services allowed the website to be securely accessed through a custom domain ([zhangdaniel62csce412.me](zhangdaniel62csce412.me)). The structure used is scalable and cost-efficient, as it does not require the management of physical servers.

---

## Flow Chart

The following flow chart shows the order and dependencies of each service that was used to host my website ([zhangdaniel62csce412.me](zhangdaniel62csce412.me)) remotely:

\includegraphics{assets/images/flowchart.png}

When a user enters the domain name into their browser, a DNS query is sent to Route 53, which acts as the DNS service, resolving the domain name to the next step. Route 53 contains a record that then points the domain to Cloudfront using an alias record. This allows the user to access the website using the custom domain name that was purchased off of Namecheap.

Once the request reaches Cloudfront, the service then handles HTTPS by using the certificate that was provisioned by AWS Certificate Manager (ACM). This ensures that the data between the user and the website is encrypted and secure. The service then checks to see whether the requested data is already cached at an edge location close to the user. If it is cached, the content is returned immediately to the user, improving performance and reducing latency. If the content is not cached, Cloudfront then forwards the request to Amazon S3, where the static content is stored. This includes HTML, CSS, and JavaScript files.

S3 then returns the requested content to Cloudfront then caches the content for future requests and delivers the website back to the user over a secure HTTPS connection.

---

## Screenshot of the [website](zhangdaniel62csce412.me) with proof that it is secured

\includegraphics{assets/images/https-proof.png}

