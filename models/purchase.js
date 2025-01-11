const mongoose = require("mongoose");
const { main } = require("./index");

const PurchaseSchema = new mongoose.Schema(
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
    warehouseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "warehouse",
      required: true,
    },
    BrandID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "brand",
      required: true,
    },
    StoreName: {
      type: String,
    },
    referenceNo: {
      type: String
    },
    HistoryID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "history"
    },
    remainingStock: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const { primaryDB, secondaryDB } = main()

module.exports = {
  PrimaryPurchase: primaryDB.model('purchase', PurchaseSchema),
  SecondaryPurchase: secondaryDB.model('purchase', PurchaseSchema)
}

// const Purchase = mongoose.model("purchase", PurchaseSchema);
// module.exports = Purchase;
