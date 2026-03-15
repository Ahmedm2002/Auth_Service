# Auth Service

Welcome to the Auth Service. This project serves as the security boundary and identity provider for our backend system.

Authentication is the front door of any application. We built this service because we needed a secure, reliable, and predictable way to manage user identities without tightly coupling authentication logic to other parts of our system. By extracting these concerns into a dedicated service, we make our entire backend easier to maintain and scale.

At its core, this service handles user registration, secure login flows, session management, and account recovery. It ensures that every request entering our broader system is properly authenticated and authorized.

## High-Level Architecture

We built this service using **Node.js, Express, and PostgreSQL**, and structured it using a strict layered architecture. The goal here is organization and predictability.

When you look at the codebase, you will notice distinct boundaries:

We use **routes** to define our API endpoints and map them to specific handlers. Those handlers are our **controllers**, which are strictly responsible for receiving HTTP requests, extracting the necessary data, and formatting the final response. Controllers do not contain business logic; they pass the validated data down to our **services**. 

The **services** layer is the heart of the application. This is where the actual work happens—verifying passwords, determining if a session is valid, or managing the rules around password resets. However, services do not know how to talk to the database directly. Instead, they rely on **repositories**. The repository layer contains all of our raw SQL queries, keeping our business logic perfectly isolated from our database engine.

## The Flow of a Request

To understand how the system works, it helps to follow a request from start to finish. 

When a client makes a request, it hits our API and matches a specific **route**. The route forwards the request to the appropriate **controller**. The controller pulls out the necessary information—like a user's email and password from the request body—and hands it over to the **service**. 

The service applies our business rules and asks the **repository** to fetch or update data. The repository executes the SQL query against the **database** and returns the raw data back to the service. Finally, the service finishes its work, passes the result back to the controller, and the controller sends an organized HTTP response back to the client.

## Our Database

We use PostgreSQL to store our data. The schema is intentionally kept simple to reduce complexity, focusing on three core areas:

We have a **users** table that stores core identity information like emails and securely hashed passwords. We maintain a **sessions** table to keep track of every active login, which gives us the power to forcefully log users out or track suspicious device activity. Lastly, we have a **password_reset_tokens** table that securely handles temporary tokens used when a user forgets their password.

## Deep Dive Documentation

If you are a developer looking to understand the intricate details of this service, contribute to it, or debug an active issue, we have broken down our technical documentation into dedicated files.

Please explore the following documents for a deeper dive:

- [Architecture Details](docs/architecture.md)
- [Request Flow Lifecycle](docs/request-flow.md)
- [Database Schema](docs/database-schema.md)
- [Index Strategy](docs/index-strategy.md)
- [Design Decisions](docs/design-decisions.md)
- [Limitations and Improvements](docs/limitations-and-improvements.md)
