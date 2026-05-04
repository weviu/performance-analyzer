const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "next-dev",
      cwd: __dirname,
      script: path.join(__dirname, "dev-server.js"),
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "development",
      },
    },
    {
      name: "fastapi",
      cwd: path.join(__dirname, "fastapi"),
      script: path.join(__dirname, "fastapi/.venv/bin/uvicorn"),
      args: "main:app --host 0.0.0.0 --port 8000",
      interpreter: path.join(__dirname, "fastapi/.venv/bin/python3"),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
