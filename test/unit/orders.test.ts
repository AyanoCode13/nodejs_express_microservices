import { describe, expect, test } from "bun:test";
import request from "supertest";
import express from "express";

// Re-create or import your Express app instance
const app = express();
app.use(express.json());

const orders = [
  { id: 1, userId: 101, item: "Laptop", amount: 1200 },
  { id: 2, userId: 102, item: "Phone", amount: 800 }
];


app.get("/", (req, res) => {
  res.json({ service: "Orders Microservice", data: orders });
});
describe("Orders Microservice", () => {
  test("GET /orders should return list of orders", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.service).toBe("Orders Microservice");
    expect(response.body.data).toHaveLength(2);
  });
});


describe("Orders Microservice", () => {
  test("GET /orders should return list of orders", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.service).toBe("Orders Microservice");
    expect(response.body.data).toHaveLength(2);
  });
});