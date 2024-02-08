const { PrimaryUser, SecondaryUser } = require("../models/users");

// Add AdminUser
const addAdminUser = async (req, res) => {
    const user = new SecondaryUser(req.body);

    user.save().then((result) => {
        res.status(200).send(result);
    })
        .catch((err) => {
            res.status(402).send(err);
        });
};

// Add Super AdminUser
const addSuperAdminUser = async (req, res) => {
    const user = new PrimaryUser(req.body);

    user.save().then((result) => {
        res.status(200).send(result);
    })
        .catch((err) => {
            res.status(402).send(err);
        });
};

// Get All Users
const getAllUsers = async (req, res) => {
    const findAllUsers = await SecondaryUser.find().populate("roleID").sort({ _id: -1 }); // -1 for descending;
    res.json(findAllUsers);
};

module.exports = { addAdminUser, addSuperAdminUser, getAllUsers };
