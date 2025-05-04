const sessionManager = require("../services/sessionManager");

async function start(req, res, next) {
  try {
    const options = req.body;
    const sessionId = await sessionManager.startSession(req, options);
    res.status(201).json({ sessionId });
  } catch (error) {
    next(error);
  }
}

async function close(req, res, next) {
  try {
    const currentSessionId = req.session.id;
    await sessionManager.closeSession(req);
    res.status(200).json({
      status: "success",
      message: `Session ${currentSessionId} closed and data destroyed.`,
    });
  } catch (error) {
    if (error.message.includes("Failed to destroy session")) {
      return res.status(500).json({ status: "error", error: error.message });
    }
    next(error);
  }
}

module.exports = {
  start,
  close,
};
