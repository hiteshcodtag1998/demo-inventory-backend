const express = require("express");
const app = express();
const role = require("../controller/role");

// Add Role Primary
app.post("/add-primary", role.addRolePrimary);

// Add Role Secondary
app.post("/add-secondary", role.addRoleSecondary);

// Get All Role
app.get("/", role.getAllRoles)

module.exports = app;
