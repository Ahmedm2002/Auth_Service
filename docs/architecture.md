# Architecture

This service is structured using a strict layered architecture. We enforce these layers because mixing HTTP concerns, business logic, and database queries in a single file makes a system incredibly difficult to test and maintain. By separating responsibilities, we ensure that the codebase remains predictable and approachable as it grows.

Our architecture is broken down into four distinct layers: Routes, Controllers, Services, and Repositories.

## Routes

The `routes` layer is the entry point for all API traffic. Here, we define the URL paths and the HTTP methods for our endpoints. 

The primary responsibility of a route is to map an incoming request to the correct controller. We do not do any data processing or logic inside the routes. By keeping routes lean, developers can open a single routing file and immediately understand the entire surface area of the API without getting bogged down by implementation details.

## Controllers

Once a route receives a request, it passes control to the `controllers` layer. 

Controllers act as the orchestrators of the HTTP request lifecycle. Their job is to extract data from the incoming request—such as query parameters, URL parameters, or the request body—and pass it down to the service layer. Once the service finishes its work, the controller takes the result and formats it into a standardized HTTP response to send back to the client.

Controllers do not contain business logic, nor do they know how data is stored. They simply translate HTTP requests into function calls, and function results back into HTTP responses.

## Services

The `services` layer is the brain of the application. This is where all of our core business logic lives.

If we need to hash a password, verify a token, or determine if a user's account is locked out, that logic belongs in a service. Services are isolated from the web layer—they don't know what an HTTP request or response is. This makes them incredibly easy to test, because you can invoke a service function directly without needing to mock an entire Express server.

## Repositories

The `repositories` layer is our bridge to the database.

Services know *what* needs to be done, but they don't know *how* to talk to the database. Whenever a service needs to read or write data, it calls a repository function. The repository contains the actual, raw SQL queries required to interact with PostgreSQL.

## Why This Separation Exists

We enforce this separation because it drastically improves maintainability.

If we ever decide to change our database driver, we only need to update the repositories; the services and controllers remain untouched. If we want to expose our application through a different interface—like a CLI tool or a WebSocket server—we can reuse the exact same services and repositories, and simply write new controllers. 

This architecture prevents logic from leaking across boundaries, making the system easier to reason about, simpler to unit test, and heavily resistant to regressions.
