const express = require("express");
const app = express();
const user = require("../controller/user");

// Add AdminUser
app.post("/add-admin-user", user.addAdminUser);

// Add Super AdminUser
app.post("/add-super-admin-user", user.addSuperAdminUser);

// Get All User
app.get("/", user.getAllUsers)

module.exports = app;
