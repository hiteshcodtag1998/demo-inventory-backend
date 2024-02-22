const mongoose = require("mongoose");
const { main } = require("./index");

const TransferStockSchema = new mongoose.Schema(
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
        QuantityPurchased: {
            type: Number,
            required: true,
        },
        PurchaseDate: {
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
        StoreName: {
            type: String,
        },
        SendinLocation: {
            type: String,
        },
        ReceivingLocation: {
            type: String,
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
    PrimaryTransferStock: primaryDB.model('transferStock', TransferStockSchema),
    SecondaryTransferStock: secondaryDB.model('transferStock', TransferStockSchema)
}
