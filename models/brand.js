const mongoose = require("mongoose");
const { main } = require("./index");

const BrandSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const { primaryDB, secondaryDB } = main()

module.exports = {
    PrimaryBrand: primaryDB.model('brand', BrandSchema),
    SecondaryBrand: secondaryDB.model('brand', BrandSchema)
}

