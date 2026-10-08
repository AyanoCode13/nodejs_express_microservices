import express from "express";

const app = express();
const PORT = 3002;

app.use(express.json());

const orders = [
  { id: 1, userId: 101, item: "Laptop", amount: 1200 },
  { id: 2, userId: 102, item: "Phone", amount: 800 }
];

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

// GET /orders
app.get("/", (req, res) => {
  res.json({
    service: "Orders Microservice",
    data: orders
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Orders Microservice running on http://localhost:${PORT}`);
});