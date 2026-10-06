import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import express from "express";
import proxy from "express-http-proxy";
import type { Server } from "http";
import { createMockService } from "../../test/helpers/mockService";

let gatewayApp: express.Application;
let mockOrdersServer: Server;

beforeAll(() => {
  // Spin up mock orders service on port 3002 with custom responses
  const ordersMock = createMockService({
    port: 3002,
    routes: {
      "/orders": { success: true, mocked: true }
    }
  });
  mockOrdersServer = ordersMock.server;

  // Set up API Gateway
  gatewayApp = express();
  gatewayApp.use(
    "/orders",
    proxy("http://localhost:3002", {
      proxyReqPathResolver: (req) => "/orders" + req.url
    })
  );
});

afterAll(() => {
  mockOrdersServer.close();
});

describe("API Gateway", () => {
  test("should proxy /orders requests", async () => {
    const response = await request(gatewayApp).get("/orders");
    expect(response.status).toBe(200);
    expect(response.body.mocked).toBe(true);
  });

  test("should proxy /healthy route", async () => {
    const response = await request(gatewayApp).get("/orders/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("UP");
  });
});