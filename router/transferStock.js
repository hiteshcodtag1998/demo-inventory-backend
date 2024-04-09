const express = require("express");
const app = express();
const transferStock = require("../controller/transferStock");

// Add TransferStock
app.post("/add", transferStock.addTransferStock);

// Get All TransferStock Data
app.get("/get", transferStock.getTransferStockData);

app.post("/transfterstock-pdf-download", transferStock.transferStockPdfDownload)

module.exports = app;

