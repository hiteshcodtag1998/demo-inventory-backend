const express = require("express");
const app = express();
const warehouse = require("../controller/warehouses");

// Add Store
app.post("/add", warehouse.addWarehouse);

// Get All Store
app.get("/get", warehouse.getAllWarehouses)

module.exports = app;
