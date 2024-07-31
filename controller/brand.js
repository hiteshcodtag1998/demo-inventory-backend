const { PrimaryBrand, SecondaryBrand } = require("../models/brand");
const ROLES = require("../utils/constant");

// Add Store
const addBrand = async (req, res) => {
    try {
        const brandExist = await SecondaryBrand.findOne({ name: req.body.name });
        if (brandExist) throw new Error("Brand already exists");

        const addBrand = new SecondaryBrand({
            name: req.body.name
        });

        addBrand.save().then(async (result) => {
            await PrimaryBrand.insertMany([result]).catch(err => console.log('Err', err))
            res.status(200).send(result);
        })
            .catch((err) => {
                res.status(402).send(err);
            });
    } catch (err) {
        res.status(500).send({ err, message: err?.message || "" });
    }
};

// Get All Stores
const getAllBrands = async (req, res) => {
    let findAllBrands;
    if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
        findAllBrands = await PrimaryBrand.find().sort({ _id: -1 });
    else
        findAllBrands = await SecondaryBrand.find().sort({ _id: -1 }); // -1 for descending;
    res.json(findAllBrands);

};

module.exports = { addBrand, getAllBrands };
