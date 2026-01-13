# Payload Server

A simple Express.js server with SQLite database for storing and retrieving payloads.

## Features

- Store payloads with API key authentication
- Retrieve stored payloads by API key
- SQLite database for persistent storage

## Installation

```bash
npm install
```

## Running the Server

```bash
node server.js
```

The server will run on `http://localhost:3000`

## API Endpoints

### POST /API/payload
Store a payload with an API key.

Request body:
```json
{
  "key": "your_api_key",
  "payload": "your_payload_data"
}
```

### POST /API/open_result
Retrieve all payloads for a specific API key.

Request body:
```json
{
  "key": "your_api_key"
}
```

## License

MIT
