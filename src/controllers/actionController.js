const sessionManager = require("../services/sessionManager");

const getLocator = (page, locatorData) => {
  if (typeof locatorData === "string") {
    return page.locator(locatorData);
  } else if (typeof locatorData === "object" && locatorData.role) {
    const options = {};
    if (locatorData.name) {
      options.name = locatorData.name;
    }
    return page.getByRole(locatorData.role, options);
  } else {
    throw new Error(
      "Invalid locator format. Use string selector or { role, name } object."
    );
  }
};

const takeScreenshot = async (page) => {
  try {
    const buffer = await page.screenshot({ type: "png" });
    return buffer.toString("base64");
  } catch (error) {
    console.error("Failed to take screenshot:", error);
    throw new Error(`Failed to take screenshot: ${error.message}`);
  }
};

const handleAction = async (req, res, next, actionFn) => {
  const { locator, value, url, options } = req.body;

  try {
    const page = sessionManager.getSessionPage(req);

    await actionFn(page, { locator, value, url, options });

    const screenshot = await takeScreenshot(page);

    res.status(200).json({ status: "success", screenshot });
  } catch (error) {
    const errorSessionId = req.session?.id || "unknown";
    if (error.message.startsWith("Playwright page not found")) {
      return res.status(404).json({
        status: "error",
        error: `Session ${errorSessionId} invalid or expired. ${error.message}`,
      });
    }

    if (
      error.name === "TimeoutError" ||
      error.message.includes("failed to find element") ||
      error.message.includes("no element found")
    ) {
      return res.status(404).json({
        status: "error",
        error: `Action failed in session ${errorSessionId}: ${error.message}`,
      });
    }

    if (error.message.startsWith("Invalid locator format")) {
      return res.status(400).json({ status: "error", error: error.message });
    }

    if (error.message.startsWith("Failed to take screenshot")) {
      console.error("Screenshot failed after action.");
      return res.status(500).json({ status: "error", error: error.message });
    }

    next(error);
  }
};

const goto = async (req, res, next) => {
  await handleAction(req, res, next, async (page, { url, options }) => {
    if (!url) throw new Error("url is required for goto action");
    await page.goto(url, options);
  });
};

const click = async (req, res, next) => {
  await handleAction(req, res, next, async (page, { locator, options }) => {
    if (!locator) throw new Error("locator is required for click action");
    const targetLocator = getLocator(page, locator);
    await targetLocator.click(options);
  });
};

const fill = async (req, res, next) => {
  await handleAction(
    req,
    res,
    next,
    async (page, { locator, value, options }) => {
      if (!locator) throw new Error("locator is required for fill action");
      if (value === undefined || value === null)
        throw new Error("value is required for fill action");
      const targetLocator = getLocator(page, locator);
      await targetLocator.fill(String(value), options);
    }
  );
};

const hover = async (req, res, next) => {
  await handleAction(req, res, next, async (page, { locator, options }) => {
    if (!locator) throw new Error("locator is required for hover action");
    const targetLocator = getLocator(page, locator);
    await targetLocator.hover(options);
  });
};

// Add more actions here following the pattern (e.g., type, press, check, selectOption)

const type = async (req, res, next) => {
  await handleAction(
    req,
    res,
    next,
    async (page, { locator, value, options }) => {
      if (!locator) throw new Error("locator is required for type action");
      if (value === undefined || value === null)
        throw new Error("value is required for type action (text to type)");
      const targetLocator = getLocator(page, locator);
      await targetLocator.type(String(value), options); // options like { delay: 100 }
    }
  );
};

const press = async (req, res, next) => {
  await handleAction(
    req,
    res,
    next,
    async (page, { locator, value, options }) => {
      // Using 'value' for the key to press for consistency
      if (!locator) throw new Error("locator is required for press action");
      if (!value)
        throw new Error("value is required for press action (key to press)");
      const targetLocator = getLocator(page, locator);
      await targetLocator.press(String(value), options); // e.g., value: "Enter", options: { delay: 50 }
    }
  );
};

const check = async (req, res, next) => {
  await handleAction(req, res, next, async (page, { locator, options }) => {
    if (!locator) throw new Error("locator is required for check action");
    const targetLocator = getLocator(page, locator);
    await targetLocator.check(options); // options like { force: true }
  });
};

const uncheck = async (req, res, next) => {
  await handleAction(req, res, next, async (page, { locator, options }) => {
    if (!locator) throw new Error("locator is required for uncheck action");
    const targetLocator = getLocator(page, locator);
    await targetLocator.uncheck(options);
  });
};

const selectOption = async (req, res, next) => {
  await handleAction(
    req,
    res,
    next,
    async (page, { locator, value, options }) => {
      // value can be string, array, or { label?, value?, index? }
      if (!locator)
        throw new Error("locator is required for selectOption action");
      if (value === undefined || value === null)
        throw new Error(
          "value is required for selectOption action (option(s) to select)"
        );
      const targetLocator = getLocator(page, locator);
      await targetLocator.selectOption(value, options); // e.g., value: 'blue' or ['red', 'green'] or { label: 'Option 1' }
    }
  );
};

module.exports = {
  goto,
  click,
  fill,
  hover,
  type,
  press,
  check,
  uncheck,
  selectOption,
  // Export other actions as they are added
};
