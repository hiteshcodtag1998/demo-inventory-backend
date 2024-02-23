const express = require("express");
const app = express();
const product = require("../controller/product");

// Add Product
app.post("/add", product.addProduct);

// Get All Products
app.get("/get", product.getAllProducts);

// Delete Selected Product Item
app.delete("/delete/:id", product.deleteSelectedProduct);

// Update Selected Product
app.post("/update", product.updateSelectedProduct);

// Search Product
app.get("/search", product.searchProduct);

app.get("/product-pdf-download", product.productPdfDownload)

// http://localhost:4000/api/product/search?searchTerm=fa

module.exports = app;
