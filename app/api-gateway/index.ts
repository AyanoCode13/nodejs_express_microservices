import express from "express";
import proxy from "express-http-proxy";
import { appConfig } from "../env";

const app = express();

// Route /orders requests to Order Service (port 3002)
app.use(
  appConfig.orders.ROUTE,
  proxy(appConfig.orders.URL, {
    proxyReqPathResolver: (req) => req.url
  }),
);



// Base route handler
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is active" });
});

app.listen(appConfig.gateway.PORT,() => {
  console.log(`API Gateway running on ${appConfig.gateway.URL}`);
});