# Limitations and Improvements

Building backend systems is an ongoing process of iteration. The current iteration of the Auth Service is stable and secure, but we made deliberate trade-offs to ship quickly without over-engineering initially. 

This document outlines the current limitations of our architecture and our roadmap for realistic, long-term improvements.

## Current Limitations

### The Simple Repository Pattern

Our current implementation of the repository pattern is incredibly simple. We are manually calling raw SQL strings inside repository functions. While this works well for a small application, it lacks abstraction. We do not currently use an Object Relational Mapper (ORM) or a robust query builder, which means handling complex relational queries or dynamic filtering requires writing repetitive SQL boilerplate.

### Missing Caching Layer

Every time an authenticated request enters the system, we execute a read query against the PostgreSQL database to validate the session token. Because we lack an intermediate caching layer, our primary database handles the entire read load of our API. This places unnecessary stress on the database and increases query latency for highly active endpoints.

### Limited Rate Limiting

Our current rate limiting strategy relies heavily on in-memory counters. If we spin up multiple instances of the service behind a load balancer, each instance tracks its own independent rate limits. This means a malicious user could bypass our limits by sending requests across different servers. Our API remains vulnerable to aggressive brute-force attacks because we do not share rate-limiting state globally across the infrastructure.

### Limited Validation Layer

We currently handle data validation inside the controllers before passing the data to the services. However, this validation is somewhat manual and relies on basic conditional checks rather than a comprehensive, deeply nested validation library. This creates the possibility of subtle validation errors slipping through and reaching the core business logic.

## Planned Improvements

### Implementing Dependency Injection

As our services and repositories grow in complexity, managing their imports and instantiations is becoming difficult to test. We plan to introduce a proper Dependency Injection (DI) container. By injecting our repositories into our services, we will fully decouple the layers and make our test suite significantly faster and much easier to mock.

### Redis Caching Integration

To alleviate the read-heavy load on our PostgreSQL instance, we plan to implement a Redis caching layer. We will cache active session tokens in Redis. When a request arrives, the service will check Redis first. If the token is valid, we completely bypass the relational database, drastically reducing latency and freeing up database connections for write operations.

### Distributed Rate Limiting

We plan to replace our in-memory rate limiters with a distributed, Redis-backed rate limiting solution. By storing rate limit counters in a centralized Redis cluster, we can enforce strict login throttling globally, regardless of which individual server processes the incoming request.

### Audit Logging

Currently, we only track the latest login activity for a user. We plan to introduce a robust audit logging system that records every security-sensitive action—such as password changes, failed login attempts, and multi-factor authentication enrollment. This will allow us to track suspicious behavior over time and give our users detailed security histories.

### Improved Token Lifecycle Management

We manage session cleanup somewhat manually through an intermittent background job. In the future, we will improve token lifecycle management by leveraging time-to-live (TTL) indexing in Redis or implementing more aggressive and efficient batch-deletion strategies for expired tokens within PostgreSQL.
