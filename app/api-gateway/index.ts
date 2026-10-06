import express from "express";
import proxy from "express-http-proxy";

const app = express();
const PORT = 8080;

// Route /orders requests to Order Service (port 3002)
app.use("/orders", proxy("http://localhost:3002"));



app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});