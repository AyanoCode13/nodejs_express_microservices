import express from "express";
import { db } from "../../src/prisma/db";

const app = express();
const PORT = 3002;

app.use(express.json());



app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

// GET /orders
app.get("/", async (req, res) => {
   const query = db.sql.public.orders
    .select("id", "item")
    .limit(2)
    .build();
  const rows = await db.runtime().query(query);
  console.log(rows);
  res.json({
    service: "Orders Microservice",
    data: rows
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Orders Microservice running on http://localhost:${PORT}`);
});