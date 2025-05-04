# Playwright Action API

This project provides a REST API service built with Node.js and Express.js to expose Playwright browser automation actions as HTTP endpoints.

## Features

- Start and close browser sessions (Chromium, Firefox, WebKit).
- Support for multiple concurrent sessions using standard cookie-based sessions (`express-session`).
- Expose Playwright actions (`goto`, `click`, `fill`, `hover`, etc.) via REST endpoints, identified by session cookie.
- Support for string selectors and structured locators (`{ role, name }`).
- Returns a base64 encoded PNG screenshot after each successful action.
- In-memory session management.

## Prerequisites

- Node.js (v16 or later recommended)
- npm

## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd playwright-action-api
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Install Playwright browsers:**
    This step downloads the necessary browser binaries.
    ```bash
    npx playwright install
    ```
    You can also install specific browsers:
    ```bash
    npx playwright install chromium firefox webkit
    ```

## Running the Server

```bash
npm start
```

Or for development with automatic restarts (if `nodemon` is installed globally or as a dev dependency):

```bash
nodemon app.js
```

The server will start, typically on `http://localhost:3000`.

## Running the Test Script (Optional)

A sample test script is provided in the `scripts/` directory to demonstrate API usage.

1.  **Ensure the API server is running** in one terminal:

    ```bash
    npm start
    ```

2.  **Run the test script** in another terminal:
    ```bash
    node scripts/test-api.js
    ```

This script will:

- Start a browser session.
- Navigate to `https://example.com`.
- Click the "More information..." link.
- Save screenshots (`goto_screenshot.png`, `click_screenshot.png`) to the `scripts/screenshots/` directory.
- Close the session.

## API Endpoints

**Base URL:** `http://localhost:3000`

### Session Management

#### `POST /session/start`

Starts a new browser session.

- **Request Body:**

  ```json
  {
    "browser": "chromium", // Optional, defaults to "chromium". Can be "firefox" or "webkit".
    "headless": true // Optional, defaults to true.
    // Other Playwright launch options can be added here (e.g., "slowMo": 100)
  }
  ```

- **Success Response (201 Created):**

  ```json
  {
    "sessionId": "uuid-string-generated-by-server"
  }
  ```

- **Error Response (500 Internal Server Error):**
  ```json
  {
    "status": "error",
    "error": "Failed to launch browser chromium: ..."
  }
  ```

#### `POST /session/close`

Closes an active browser session.

- **Request Body:**

  ```json
  {
    "sessionId": "uuid-string-from-start-session"
  }
  ```

- **Success Response (200 OK):**

  ```json
  {
    "status": "success",
    "message": "Session uuid-string-from-start-session closed."
  }
  ```

- **Error Response (400 Bad Request):**

  ```json
  {
    "status": "error",
    "error": "sessionId is required"
  }
  ```

- **Error Response (404 Not Found):**
  ```json
  {
    "status": "error",
    "error": "Session not found: uuid-string-from-start-session"
  }
  ```

### Browser Actions

All action endpoints require a valid session cookie (obtained from `/session/start`) to be sent with the request. The `sessionId` parameter is **no longer used** in the request body for actions.
They return a `screenshot` (base64 PNG) on success.

#### `POST /action/goto`

Navigates the page to a URL.

- **Request Body:**
  ```json
  {
    "url": "https://example.com",
    "options": { "waitUntil": "domcontentloaded" } // Optional Playwright goto options
  }
  ```

#### `POST /action/click`

Clicks an element matching the locator.

- **Request Body (String Locator):**
  ```json
  {
    "locator": "#submit-button",
    "options": { "delay": 50 } // Optional Playwright click options
  }
  ```
- **Request Body (Structured Locator):**
  ```json
  {
    "locator": {
      "role": "button",
      "name": "Log In"
    }
  }
  ```

#### `POST /action/fill`

Fills an input element matching the locator with the provided value.

- **Request Body:**
  ```json
  {
    "locator": "input[name='email']",
    "value": "test@example.com",
    "options": { "force": true } // Optional Playwright fill options
  }
  ```

#### `POST /action/hover`

Hovers over an element matching the locator.

- **Request Body:**
  ```json
  {
    "locator": ".user-menu"
  }
  ```

#### `POST /action/type`

Types text into an element matching the locator.

- **Request Body:**
  ```json
  {
    "locator": "#search-input",
    "value": "Playwright testing",
    "options": { "delay": 50 } // Optional Playwright type options
  }
  ```

#### `POST /action/press`

Presses a key on the keyboard after focusing the element matching the locator.

- **Request Body:**
  ```json
  {
    "locator": "#search-input",
    "value": "Enter", // The key to press (e.g., "Enter", "ArrowLeft", "a", "$")
    "options": { "delay": 100 } // Optional Playwright press options
  }
  ```

#### `POST /action/check`

Checks a checkbox or radio button matching the locator.

- **Request Body:**
  ```json
  {
    "locator": "input[type='checkbox'][name='terms']"
  }
  ```

#### `POST /action/uncheck`

Unchecks a checkbox matching the locator.

- **Request Body:**
  ```json
  {
    "locator": "#subscribe-newsletter"
  }
  ```

#### `POST /action/selectOption`

Selects one or more options in a `<select>` element matching the locator.

- **Request Body (by value):**
  ```json
  {
    "locator": "#color-select",
    "value": "blue" // Can be string for single value
  }
  ```
- **Request Body (by label):**
  ```json
  {
    "locator": "#country-select",
    "value": { "label": "United States" }
  }
  ```
- **Request Body (multiple values):**
  ```json
  {
    "locator": "#multi-select-options",
    "value": ["option1", "option3"] // Array of values
  }
  ```

---

**General Success Response (200 OK) for Actions:**

```json
{
  "status": "success",
  "screenshot": "base64_png_data..."
}
```

**General Error Responses for Actions:**

- **400 Bad Request (Missing parameters/Invalid Locator):**
  ```json
  {
    "status": "error",
    "error": "locator is required for click action"
    // or "url is required for goto action"
    // or "Invalid locator format..."
  }
  ```
- **404 Not Found (Session or Element not found):**
  ```json
  {
    "status": "error",
    "error": "Session not found: your-session-id"
    // or "Action failed: TimeoutError: waiting for locator..."
    // or "Action failed: Error: failed to find element matching selector..."
  }
  ```
- **404 Not Found (Session invalid/expired or Element not found):**
  ```json
  {
    "status": "error",
    "error": "Session [session-id] invalid or expired. Playwright page not found..."
    // or "Action failed in session [session-id]: TimeoutError: waiting for locator..."
    // or "Action failed in session [session-id]: Error: failed to find element matching selector..."
  }
  ```
- **500 Internal Server Error (Other unexpected errors):**
  ```json
  {
    "status": "error",
    "error": "Internal Server Error message..."
  }
  ```

## Adding Further Actions

To add more Playwright actions (e.g., `dblclick`, `dragAndDrop`, `waitForSelector`):

1.  Add a new async function to `src/controllers/actionController.js` following the pattern of existing actions (`click`, `fill`, etc.), using the `handleAction` helper.
2.  Export the new function from `actionController.js`.
3.  Add a corresponding route in `src/routes/actionRoutes.js`.

Refer to the [Playwright Input Actions Documentation](https://playwright.dev/docs/input) for details on available actions and their options.