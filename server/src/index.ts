import path from "path";
import Sentry from "./lib/sentry";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import agentsRouter from "./routes/agents";
import webhooksRouter from "./routes/webhooks";
import repliesRouter from "./routes/replies";
import { startQueue, stopQueue } from "./lib/queue";
import { getTrustedOrigins } from "./lib/origins";
import { startGmailSync, stopGmailSync } from "./lib/gmail-sync";


if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        connectSrc: ["'self'", "https://*.sentry.io"],
        imgSrc: ["'self'", "data:", "https:"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, getTrustedOrigins().includes(origin));
    },
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  skip: () => !isProduction,
});

// Mount Better Auth handler BEFORE express.json()
// Better Auth parses its own request bodies
// toNodeHandler returns a promise; must be caught for Express 5
app.all("/api/auth/{*any}", authLimiter, (req, res, next) => {
  toNodeHandler(auth)(req, res).catch(next);
});

app.use(express.json());

// In development, redirect root to React frontend on port 5173
if (!isProduction) {
  app.get("/", (_req, res) => {
    res.redirect("http://localhost:5173");
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/tickets/:ticketId/replies", repliesRouter);
app.use("/api/webhooks", webhooksRouter);

Sentry.setupExpressErrorHandler(app);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  }
);

// In production, serve the built React client as static files
if (isProduction) {
  const clientDist = path.resolve(import.meta.dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // SPA fallback: serve index.html for any non-API route
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

if (!process.env.WEBHOOK_SECRET) {
  console.warn("Warning: WEBHOOK_SECRET is not set. Webhook endpoints will return 500.");
}

async function boot() {
  await startQueue();

  if (isProduction && process.env.DISABLE_GMAIL_SYNC !== "true") {
    void startGmailSync();
  }

  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await stopGmailSync();
    await stopQueue();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

boot().catch(async (error) => {
  Sentry.captureException(error);
  console.error("Failed to start server:", error);
  await Sentry.flush(2000);
  process.exit(1);
});
