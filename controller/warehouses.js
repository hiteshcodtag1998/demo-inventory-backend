const { PrimaryWarehouse, SecondaryWarehouse } = require("../models/warehouses");
const ROLES = require("../utils/constant");

// Add Store
const addWarehouse = async (req, res) => {
    const addWarehouse = await new SecondaryWarehouse({
        name: req.body.name,
        category: req.body.category,
        address: req.body.address,
        city: req.body.city,
    });

    addWarehouse.save().then(async (result) => {
        await PrimaryWarehouse.insertMany([result]).catch(err => console.log('Err', err))
        res.status(200).send(result);
    })
        .catch((err) => {
            res.status(402).send(err);
        });
};

// Get All Stores
const getAllWarehouses = async (req, res) => {
    let findAllWarehouses;
    if (req?.headers?.role === ROLES.SUPER_ADMIN)
        findAllWarehouses = await PrimaryWarehouse.find().sort({ _id: -1 });
    else
        findAllWarehouses = await SecondaryWarehouse.find().sort({ _id: -1 }); // -1 for descending;
    res.json(findAllWarehouses);

};

module.exports = { addWarehouse, getAllWarehouses };
