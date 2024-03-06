const mongoose = require("mongoose");
const { main } = require("./index")

const AvailableStockSchema = new mongoose.Schema(
    {
        stock: {
            type: Number,
            required: true,
        },
        productID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        warehouseID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "warehouse",
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const { primaryDB, secondaryDB } = main()

module.exports = {
    PrimaryAvailableStock: primaryDB.model('availablestock', AvailableStockSchema),
    SecondaryAvailableStock: secondaryDB.model('availablestock', AvailableStockSchema)
}
