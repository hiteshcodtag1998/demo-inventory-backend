const { PrimaryBrand, SecondaryBrand } = require("../models/brand");
const ROLES = require("../utils/constant");

// Add Store
const addBrand = async (req, res) => {
    const addBrand = await new SecondaryBrand({
        name: req.body.name
    });

    addBrand.save().then(async (result) => {
        await PrimaryBrand.insertMany([result]).catch(err => console.log('Err', err))
        res.status(200).send(result);
    })
        .catch((err) => {
            res.status(402).send(err);
        });
};

// Get All Stores
const getAllBrands = async (req, res) => {
    let findAllBrands;
    if (req?.headers?.role === ROLES.SUPER_ADMIN)
        findAllBrands = await PrimaryBrand.find().sort({ _id: -1 });
    else
        findAllBrands = await SecondaryBrand.find().sort({ _id: -1 }); // -1 for descending;
    res.json(findAllBrands);

};

module.exports = { addBrand, getAllBrands };
