const playwright = require("playwright");

const activePlaywrightSessions = new Map();

const startSession = async (req, options = {}) => {
  const {
    browser: browserType = "chromium",
    headless = true,
    ...launchOptions
  } = options;
  const sessionId = req.session.id;

  if (activePlaywrightSessions.has(sessionId)) {
    console.log(
      `Existing Playwright resources found for session ${sessionId}, attempting cleanup.`
    );
    const existing = activePlaywrightSessions.get(sessionId);
    try {
      await existing.browser?.close();
    } catch (err) {
      console.warn(
        `Could not close previous browser for session ${sessionId}: ${err.message}`
      );
    }
    activePlaywrightSessions.delete(sessionId);
  }

  delete req.session.playwrightMarker;

  try {
    console.log(
      `Attempting to launch ${browserType} for session ${sessionId}...`
    );
    const browser = await playwright[browserType].launch({
      headless,
      ...launchOptions,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    activePlaywrightSessions.set(sessionId, { browser, context, page });

    req.session.playwrightMarker = { isActive: true, browserType: browserType };

    console.log(
      `Playwright session started and mapped for express-session ID: ${sessionId}`
    );
    return sessionId;
  } catch (error) {
    console.error(
      `Failed to start Playwright session ${sessionId}: ${error.message}`
    );
    activePlaywrightSessions.delete(sessionId);
    throw new Error(
      `Failed to launch browser ${browserType}: ${error.message}`
    );
  }
};

const getSessionPage = (req) => {
  const sessionId = req.session?.id;
  if (!sessionId || !req.session.playwrightMarker?.isActive) {
    throw new Error(
      `No active Playwright session marker found for session: ${sessionId}. Session may be invalid or expired.`
    );
  }

  const sessionData = activePlaywrightSessions.get(sessionId);
  if (!sessionData || !sessionData.page) {
    console.error(
      `Inconsistency: Playwright marker found for session ${sessionId}, but no active objects in internal map.`
    );
    delete req.session.playwrightMarker;
    throw new Error(
      `Internal state error: Playwright objects not found for active session ${sessionId}.`
    );
  }
  return sessionData.page;
};

const closeSession = async (req) => {
  const sessionId = req.session?.id;
  if (!sessionId) {
    console.log("Close request received but no active express-session found.");
    return;
  }

  const sessionData = activePlaywrightSessions.get(sessionId);

  if (sessionData && sessionData.browser) {
    console.log(`Attempting to close browser for session: ${sessionId}`);
    try {
      await sessionData.browser.close();
      console.log(`Browser closed for session: ${sessionId}`);
    } catch (error) {
      console.error(
        `Failed to close browser for session ${sessionId}: ${error.message}`
      );
    }
  } else {
    console.log(
      `No active Playwright browser found in internal map for session ${sessionId}. Cleaning up map/session data.`
    );
  }

  activePlaywrightSessions.delete(sessionId);
  console.log(
    `Removed Playwright objects from internal map for session: ${sessionId}`
  );

  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        console.error(
          `Error destroying express-session ${sessionId}: ${err.message}`
        );
        reject(new Error(`Failed to destroy session: ${err.message}`));
      } else {
        console.log(`Express-session data destroyed for ID: ${sessionId}`);
        resolve();
      }
    });
  });
};

module.exports = {
  startSession,
  getSessionPage,
  closeSession,
};
