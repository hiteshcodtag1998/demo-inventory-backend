const express = require("express");
const app = express();
const brand = require("../controller/brand");

// Add Store
app.post("/add", brand.addBrand);

// Get All Store
app.get("/get", brand.getAllBrands)

module.exports = app;
