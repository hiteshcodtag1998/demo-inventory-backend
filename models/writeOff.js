const mongoose = require("mongoose");
const { main } = require("./index");

const WriteOffSchema = new mongoose.Schema(
    {
        userID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        ProductID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        StockSold: {
            type: Number,
            required: true,
        },
        SaleDate: {
            type: String,
            required: true,
        },
        TotalPurchaseAmount: {
            type: Number,
        },
        SupplierName: {
            type: String,
        },
        BrandID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "brand",
            required: true,
        },
        warehouseID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "warehouse",
            required: true,
        },
        StoreName: {
            type: String,
        },
        reason: {
            type: String,
        },
        HistoryID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "history"
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
    PrimaryWriteOff: primaryDB.model('writeOff', WriteOffSchema),
    SecondaryWriteOff: secondaryDB.model('writeOff', WriteOffSchema)
}
