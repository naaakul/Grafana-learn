const express = require("express");
const client = require("prom-client");
const pino = require("pino");
const pinoHttp = require("pino-http");

const app = express();
const port = 3000;

const logger = pino({
  transport: {
    target: "pino/file",
    options: {
      destination: "./logs/app.log"
    }
  }
});

app.use(
  pinoHttp({
    logger
  })
);

const register = new client.Registry();

client.collectDefaultMetrics({
  register
});

const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP Requests",
  labelNames: ["method", "route", "status"]
});

register.registerMetric(requestCounter);

app.get("/", (req, res) => {
  requestCounter.inc({
    method: "GET",
    route: "/",
    status: 200
  });

  req.log.info("Home endpoint hit");

  res.send("Hello World");
});

app.get("/slow", async (req, res) => {
  await new Promise((resolve) =>
    setTimeout(resolve, 5000)
  );

  requestCounter.inc({
    method: "GET",
    route: "/slow",
    status: 200
  });

  req.log.info("Slow endpoint hit");

  res.send("Slow response");
});

app.get("/error", (req, res) => {
  requestCounter.inc({
    method: "GET",
    route: "/error",
    status: 500
  });

  req.log.error("Intentional error");

  res.status(500).json({
    message: "Something broke"
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});