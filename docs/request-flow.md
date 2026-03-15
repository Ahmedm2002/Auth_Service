# The Request Flow

Understanding how a request moves through the system is critical for debugging and adding new features. We follow a strict, unidirectional flow of data to ensure that every request is handled consistently.

The lifecycle of a request always follows this path:

**Client → Route → Controller → Service → Repository → Database → Response**

Here is exactly what happens at each stage of the journey.

## 1. Client

The flow begins when a client—whether that is a web browser, a mobile application, or another backend service—makes an HTTP request to our API. The client provides the method, the headers, and the payload necessary for the operation.

## 2. Route

The request hits our Express server and is intercepted by the routing layer. The router acts as a switchboard. It inspects the HTTP method and the URL path to determine which feature the client is trying to access. Once the correct endpoint is matched, the router forwards the request to the designated controller.

## 3. Controller

The controller takes over the HTTP context. Its first job is to extract the relevant data from the request. This might mean pulling an email and password out of the request body, or extracting an authorization token from the headers. 

The controller's second job is to pass this cleaned, extracted data down to the service layer. The controller essentially says to the service, "Here is the data the client provided. Please perform the requested action."

## 4. Service

The service layer receives the data and applies the business logic. 

This is where the actual work happens. If the request is for an authenticating user, the service will perform the logic to verify their identity. However, the service cannot fetch the user's hashed password from the database directly. Instead, it asks the repository layer to retrieve the user record.

## 5. Repository

The repository receives the request from the service and translates it into a SQL query. It abstracts away the complexities of database interactions, ensuring that the raw SQL is self-contained. The repository runs the query and gathers the results.

## 6. Database

Our PostgreSQL database executes the query, reads from or writes to the disk, and returns the raw rows of data back to the repository. The repository passes this data back up to the service.

## 7. Response

Once the service has the data it needs, it finalizes the business logic—for example, comparing the provided password against the hashed password returned from the database. It then returns the final success or failure state back to the controller.

The controller takes this result, determines the appropriate HTTP status code (like a `200 OK` or a `401 Unauthorized`), formats the data into a standardized JSON response, and sends it back across the wire to the originating client.
