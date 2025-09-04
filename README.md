# URL Shortener Microservice

This is a Node.js-based HTTP URL Shortener Microservice that provides URL shortening with custom shortcodes, link expiry, redirection, and detailed click analytics. It includes a reusable logging middleware that logs informative events to a remote logging service.

***

## Features

- Shorten long URLs with optional custom shortcodes
- Default or custom expiry duration (in minutes)
- Redirect to the original URL via the short URL
- Track clicks with timestamp, referrer, and geo-location
- Retrieve detailed statistics about shortened URLs
- Logging middleware with structured logs sent to an external API
- In-memory data storage (Map) for demo purpose

***

## Technologies Used

- Node.js
- Express.js
- geoip-lite (for geo-location by IP)
- valid-url (URL validation)
- Axios (for HTTP request to logging API)
- Custom logging middleware (writes logs locally and remotely)
- Native `fs` module for async file logging

***

## API Endpoints

### 1. Create Short URL

- **Endpoint:** `POST /shorturls`
- **Request Body:**

```json
{
  "url": "https://very-long-url.com/...",
  "validity": 30,              
  "shortcode": "customCode1"   
}
```

- **Response 201 Created:**

```json
{
  "shortLink": "http://localhost:3000/customCode1",
  "expiry": "2025-09-04T12:30:00.000Z"
}
```

### 2. Redirect Short URL

- **Endpoint:** `GET /:shortcode`
- Redirects the visitor to the original URL if not expired
- Returns 404 if shortcode not found
- Returns 410 if shortcode expired

### 3. Get Short URL Statistics

- **Endpoint:** `GET /shorturls/:shortcode`
- **Response JSON:**

```json
{
  "originalUrl": "https://very-long-url.com/...",
  "createdAt": "2025-09-04T12:00:00.000Z",
  "expiry": "2025-09-04T12:30:00.000Z",
  "totalClicks": 5,
  "clicks": [
    {
      "timestamp": "2025-09-04T12:05:10.123Z",
      "referrer": "direct",
      "geo": "US"
    }
  ]
}
```

***

## Logging

- Logs created events, warnings, errors, and fatal failures.
- Uses a reusable `Log(stack, level, package, message)` function that sends logs to a protected external logging API.
- Logs asynchronously buffered to a local file `logs.txt`.
- Example Log usage in route handlers for meaningful context.

***

## Installation & Setup

1. Clone repository or copy files.
2. Navigate to project directory.
3. Install dependencies:

```bash
npm install
```

4. Create `.env` file (optional) to set `LOG_API_AUTH_TOKEN` if required.
5. Start the server:

```bash
npm start
```

***

## Testing

- Use `curl`, Postman, or any HTTP client for API requests.
- Create short URLs with `POST /shorturls` (validity defaults 30 mins).
- Use returned `shortCode` part to access short URL and generate clicks.
- Check statistics with `GET /shorturls/:shortcode`.
- Access after expiry returns 410 Gone with message `"Shortcode expired."`

***

## Notes

- This implementation uses in-memory storage (`Map`), so data is lost on server restart.
- For production use, replace with persistent database storage.
- Geo-location may return `"unknown"` for localhost or private IPs during local testing.
- Logging API requires network connectivity and authentication token if applicable.

***

## License

This project is released under the MIT License.

***

## Author

Your Name / Organization

***

This README provides a complete overview for setup, usage, testing, and understanding the backend microservice functionality. Let me know if you want help generating automated tests or Dockerizing this service!
