import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || "development",
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

if (process.env.SENTRY_DSN) {
  Sentry.setTag("service", "server");
}

export default Sentry;
