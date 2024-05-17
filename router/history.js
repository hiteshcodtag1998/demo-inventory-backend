const express = require("express");
const app = express();
const history = require("../controller/history");

// Add History
app.post("/add", history.addHistory);

// Get All History
app.get("/get", history.getAllHistory);

// Delete Selected History Item
app.delete("/delete/:id", history.deleteSelectedHistory);

// Update Selected History
app.post("/update", history.updateSelectedHistory);

// Delete Selected History Item
app.delete("/delete/:id", history.deleteSelectedHistory);

module.exports = app;
