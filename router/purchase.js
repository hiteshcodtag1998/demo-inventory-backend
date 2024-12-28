const express = require("express");
const app = express();
const purchase = require("../controller/purchase");

// Add Purchase
app.post("/add", purchase.addPurchase);

// Get All Purchase Data
app.get("/get", purchase.getAllPurchaseData);

app.get("/get/totalpurchaseamount", purchase.getTotalPurchaseAmount);

// Get Purchase Data By Id
app.get("/get/:id", purchase.getPurchaseData);

app.post("/purchase-pdf-download", purchase.purchasePdfDownload)

app.post("/purchase-multipleitems-pdf-download", purchase.purchaseMultileItemsPdfDownload)

// Update Selected Purchase
app.post("/update", purchase.updateSelectedPurchaase);

// Get Purchase Data from ProductId
app.get("/get-by-product/:productId", purchase.getPurchaseDataByProductId);

// Delete Selected Product Item
app.delete("/delete/:id", purchase.deleteSelectedPurchase);

module.exports = app;

// http://localhost:4000/api/purchase/add POST
// http://localhost:4000/api/purchase/get GET
