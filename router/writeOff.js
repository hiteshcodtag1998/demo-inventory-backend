const express = require("express");
const app = express();
const writeOff = require("../controller/writeOff");

// Add WriteOff
app.post("/add", writeOff.addWriteOff);

// Get All WriteOff Data
app.get("/get", writeOff.getWriteOffData);

app.post("/writeOff-pdf-download", writeOff.writeOffPdfDownload)

module.exports = app;

