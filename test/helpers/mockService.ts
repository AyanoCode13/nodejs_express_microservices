import express, { type Application } from "express";
import type { Server } from "http";

interface MockServiceOptions {
  port: number;
  routes?: Record<string, object>; // path -> JSON response
}

export function createMockService({ port, routes = {} }: MockServiceOptions): { app: Application; server: Server } {
  const app = express();
  app.use(express.json());

  // Default health check endpoint for all mocks
  app.get("/healthy", (req, res) => {
    res.status(200).json({ status: "UP", port });
  });

  // Register custom routes dynamically
  Object.entries(routes).forEach(([path, responseData]) => {
    app.get(path, (req, res) => {
      res.status(200).json(responseData);
    });
  });

  const server = app.listen(port);
  return { app, server };
}