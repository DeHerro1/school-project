import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./lib/env";
import { uploadRoot } from "./lib/upload";
import { apiRouter } from "./routes";
import { errorHandler, notFound } from "./middleware/error";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  if (env.nodeEnv === "development") app.use(morgan("dev"));

  // Serve uploaded files (student photos, report PDFs)
  app.use("/files", express.static(uploadRoot));

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
