const mongoose = require("mongoose");
const { main } = require("./index");
const { HISTORY_TYPE } = require("../utils/constant");

const HistorySchema = new mongoose.Schema(
    {
        productID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
        },
        description: {
            type: String,
        },
        notes: {
            type: String
        },
        type: {
            type: String,
            enum: [HISTORY_TYPE.ADD, HISTORY_TYPE.UPDATE, HISTORY_TYPE.DELETE],
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
    PrimaryHistory: primaryDB.model('history', HistorySchema),
    SecondaryHistory: secondaryDB.model('history', HistorySchema)
}
