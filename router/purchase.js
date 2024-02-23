const express = require("express");
const app = express();
const purchase = require("../controller/purchase");

// Add Purchase
app.post("/add", purchase.addPurchase);

// Get All Purchase Data
app.get("/get", purchase.getPurchaseData);

app.get("/get/totalpurchaseamount", purchase.getTotalPurchaseAmount);

app.post("/purchase-pdf-download", purchase.purchasePdfDownload)

module.exports = app;

// http://localhost:4000/api/purchase/add POST
// http://localhost:4000/api/purchase/get GET
