const mongoose = require("mongoose");
const { main } = require("./index");

const TransferStockSchema = new mongoose.Schema(
    {
        userID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        productID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        transferDate: {
            type: String,
            required: true,
        },
        fromWarehouseID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "warehouse",
            required: true,
        },
        toWarehouseID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "warehouse",
            required: true,
        },
        // TotalPurchaseAmount: {
        //     type: Number,
        // },
        // SupplierName: {
        //     type: String,
        // },
        brandID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "brand",
            required: true,
        },
        // StoreName: {
        //     type: String,
        // },
        // SendinLocation: {
        //     type: String,
        // },
        // ReceivingLocation: {
        //     type: String,
        // },
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
