const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");
const TARGET_URL = "https://practice.expandtesting.com/tracalorie/";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const saveScreenshot = (data, filename) => {
  if (data.screenshot) {
    const filePath = path.join(SCREENSHOT_DIR, filename);
    try {
      fs.writeFileSync(filePath, Buffer.from(data.screenshot, "base64"));
      console.log(`Saved screenshot: ${filename}`);
    } catch (err) {
      console.error(`Error saving screenshot ${filename}:`, err);
    }
  } else {
    console.warn(`No screenshot data received for ${filename}`);
  }
};

const callApi = async (endpoint, body, currentCookie) => {
  console.log(`\nCalling: ${endpoint} with body:`, body);
  const headers = {
    "Content-Type": "application/json",
  };
  if (currentCookie) {
    headers["Cookie"] = currentCookie;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error(
      `API Call Error (${endpoint}): ${response.status}`,
      responseData
    );
    throw new Error(
      `API Call Failed (${endpoint}): ${JSON.stringify(responseData)}`
    );
  }

  console.log(
    `API Call Success (${endpoint}). Screenshot length: ${responseData.screenshot?.length}`
  );

  const newSetCookie = response.headers.get("set-cookie");
  const updatedCookie = newSetCookie
    ? newSetCookie.split(";")[0]
    : currentCookie;
  if (newSetCookie && updatedCookie !== currentCookie) {
    console.log(`Session cookie updated after ${endpoint}: ${updatedCookie}`);
  }

  return { responseData, updatedCookie };
};

const runTracalorieTest = async () => {
  let sessionCookie = null;
  console.log("--- Starting Tracalorie Test ---");
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Screenshots will be saved to: ${SCREENSHOT_DIR}`);

  try {
    // 1. Start Session
    console.log("\n1. Starting session...");
    const startResponse = await fetch(`${BASE_URL}/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browser: "chromium", headless: true }),
    });
    const startData = await startResponse.json();
    const setCookieHeader = startResponse.headers.get("set-cookie");
    if (!setCookieHeader) throw new Error("Session cookie not received");
    sessionCookie = setCookieHeader.split(";")[0];
    if (!startResponse.ok)
      throw new Error(`Start failed: ${JSON.stringify(startData)}`);
    console.log(`Session started. Cookie: ${sessionCookie}`);

    // 2. Go to Tracalorie page
    let result = await callApi(
      "/action/goto",
      { url: TARGET_URL },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    saveScreenshot(result.responseData, "01_goto_tracalorie.png");

    // 3. Add Steak Dinner
    result = await callApi(
      "/action/type",
      { locator: "#item-name", value: "Steak Dinner" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    result = await callApi(
      "/action/type",
      { locator: "#item-calories", value: "800" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    result = await callApi(
      "/action/click",
      { locator: ".add-btn" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    saveScreenshot(result.responseData, "02_added_steak.png");

    // 4. Add Apple
    result = await callApi(
      "/action/type",
      { locator: "#item-name", value: "Apple" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    result = await callApi(
      "/action/type",
      { locator: "#item-calories", value: "95" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    result = await callApi(
      "/action/click",
      { locator: ".add-btn" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    saveScreenshot(result.responseData, "03_added_apple.png");

    // 5. Select Steak for editing
    result = await callApi(
      "/action/click",
      { locator: 'ul#item-list li:has-text("Steak Dinner") .edit-item' },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    saveScreenshot(result.responseData, "04_edit_steak_selected.png");

    // 6. Update Steak calories
    result = await callApi(
      "/action/fill",
      { locator: "#item-calories", value: "950" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    result = await callApi(
      "/action/click",
      { locator: ".update-btn" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    saveScreenshot(result.responseData, "05_edit_steak_updated.png");

    // 7. Delete Apple
    result = await callApi(
      "/action/click",
      { locator: 'ul#item-list li:has-text("Apple") .edit-item' },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    result = await callApi(
      "/action/click",
      { locator: ".delete-btn" },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    saveScreenshot(result.responseData, "07_deleted_apple.png");

    // 8. Clear All
    result = await callApi(
      "/action/click",
      { locator: 'text="Clear All"' },
      sessionCookie
    );
    sessionCookie = result.updatedCookie;
    saveScreenshot(result.responseData, "08_cleared_all.png");
  } catch (error) {
    console.error("\n--- Test Failed ---");
    console.error("Error:", error.message);

    if (sessionCookie) {
      try {
        console.log("Attempting to take failure screenshot...");
        const failureResponse = await fetch(`${BASE_URL}/action/click`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ locator: "body" }),
        });
        const failureData = await failureResponse.json();
        saveScreenshot(failureData, "99_failure_screenshot.png");
      } catch (screenshotError) {
        console.error("Could not take failure screenshot:", screenshotError);
      }
    }
  } finally {
    // 9. Close the session
    if (sessionCookie) {
      console.log("\n9. Closing session...");
      try {
        await callApi("/session/close", {}, sessionCookie);
        console.log("Session close request sent successfully.");
      } catch (closeError) {
        console.error("Session close failed.");
      }
    }
    console.log("\n--- Test Finished ---");
  }
};

runTracalorieTest();
