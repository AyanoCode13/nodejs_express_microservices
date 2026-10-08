export const appConfig = {
    "orders":{
        PORT: process.env.ORDERS_PORT || 3002,
        ROUTE: process.env.ORDERS_ROUTE || "/orders",
        URL: process.env.ORDERS_SERVICE_URL || "http://orders:3002"
    },
    "gateway":{
        URL: process.env.URL || "http://localhost:8080",
        PORT: process.env.PORT || 8080
    }
}