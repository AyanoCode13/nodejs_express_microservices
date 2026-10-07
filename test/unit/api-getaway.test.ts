import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import express from "express";
import proxy from "express-http-proxy";
import type { Server } from "http";
import { createMockService } from "../helpers/mockService"; // or your mock helper path

let gatewayApp: express.Application;
let mockOrdersServer: Server;

beforeAll(() => {
  // 1. Register mock routes AT THE ROOT LEVEL (since /orders gets stripped)
  const ordersMock = createMockService({
    port: 4002,
    routes: {
      "/": { service: "Orders Microservice", mocked: true },
      "/health": { status: "UP" }
    }
  });
  mockOrdersServer = ordersMock.server;

  // 2. Setup Gateway App with stripped path forwarding
  gatewayApp = express();
  
  gatewayApp.get("/", (req, res) => {
    res.json({ message: "API Gateway is active" });
  });

  gatewayApp.use(
    "/orders",
    proxy("http://localhost:4002", {
      proxyReqPathResolver: (req) => req.url
    })
  );
});

afterAll(() => {
  mockOrdersServer.close();
});

describe("API Gateway", () => {
  test("GET / returns the gateway status", async () => {
    const response = await request(gatewayApp).get("/");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("API Gateway is active");
  });

  test("should proxy /orders requests", async () => {
    // Requesting /orders forwards GET / to target port 4002
    const response = await request(gatewayApp).get("/orders");
    expect(response.status).toBe(200);
  });

  test("should proxy /orders/health route", async () => {
    // Requesting /orders/health forwards GET /health to target port 3002
    const response = await request(gatewayApp).get("/orders/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("UP");
  });

  test("unknown routes return 404", async () => {
    const response = await request(gatewayApp).get("/unknown");
    expect(response.status).toBe(404);
  });
});