const express = require("express");
const actionController = require("../controllers/actionController");

const router = express.Router();

// Define routes for each action
router.post("/goto", actionController.goto);
router.post("/click", actionController.click);
router.post("/fill", actionController.fill);
router.post("/hover", actionController.hover);

// Add more action routes here...
router.post("/type", actionController.type);
router.post("/press", actionController.press);
router.post("/check", actionController.check);
router.post("/uncheck", actionController.uncheck);
router.post("/selectOption", actionController.selectOption);

module.exports = router;
