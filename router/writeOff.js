const express = require("express");
const app = express();
const writeOff = require("../controller/writeOff");

// Add WriteOff
app.post("/add", writeOff.addWriteOff);

// Get All WriteOff Data
app.get("/get", writeOff.getWriteOffData);

app.post("/writeOff-pdf-download", writeOff.writeOffPdfDownload)

// Update Selected writeoff
app.post("/update", writeOff.updateSelectedWriteOff);

// Delete Selected writeoff Item
app.delete("/delete/:id", writeOff.deleteSelectedWriteOff);

app.post("/writeOff-multipleitems-pdf-download", writeOff.writeOffMultileItemsPdfDownload)

module.exports = app;

