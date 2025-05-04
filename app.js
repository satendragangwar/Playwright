const express = require("express");
const session = require("express-session");
const crypto = require("crypto");

const sessionRoutes = require("./src/routes/sessionRoutes");
const actionRoutes = require("./src/routes/actionRoutes");

const app = express();
const port = process.env.PORT || 3000;

const sessionSecret =
  process.env.SESSION_SECRET || crypto.randomBytes(64).toString("hex");

app.use(express.json());

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Routes
app.use("/session", sessionRoutes);
app.use("/action", actionRoutes);

// Basic error handler (can be improved)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    error: err.message || "Internal Server Error",
  });
});

app.listen(port, () => {
  console.log(`Playwright Action API server listening on port ${port}`);
});

module.exports = app;
