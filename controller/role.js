const { PrimaryRole, SecondaryRole } = require("../models/role");

// Add Role in Secondary
const addRoleSecondary = async (req, res) => {

    new SecondaryRole({
        name: req.body.name,
    })
        .save()
        .then(result => {
            res.status(200).send(result);
        }).catch((err) => {
            res.status(402).send(err);
        });
};

// Add Role in Primary
const addRolePrimary = async (req, res) => {

    new PrimaryRole({
        name: req.body.name,
    })
        .save()
        .then(result => {
            res.status(200).send(result);
        }).catch((err) => {
            res.status(402).send(err);
        });
};

// Get All Roles
const getAllRoles = async (req, res) => {
    const findAllRoles = await Role.find().sort({ _id: -1 }); // -1 for descending;
    res.json(findAllRoles);
};

module.exports = { addRoleSecondary, addRolePrimary, getAllRoles };
