import client from "prom-client";

const DEFAULT_METRICS_PREFIX = "app_";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
  prefix: DEFAULT_METRICS_PREFIX,
  register: metricsRegistry,
});

export const httpRequestsTotal = new client.Counter({
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  name: "http_requests_total",
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new client.Histogram({
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  name: "http_request_duration_seconds",
  registers: [metricsRegistry],
});

export const httpErrorsTotal = new client.Counter({
  help: "Total number of HTTP 5xx responses",
  labelNames: ["method", "route", "status_code"] as const,
  name: "http_errors_total",
  registers: [metricsRegistry],
});

export const resetMetrics = () => {
  metricsRegistry.resetMetrics();
};
