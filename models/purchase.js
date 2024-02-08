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
  PrimaryPurchase: primaryDB.model('purchase', PurchaseSchema),
  SecondaryPurchase: secondaryDB.model('purchase', PurchaseSchema)
}

// const Purchase = mongoose.model("purchase", PurchaseSchema);
// module.exports = Purchase;
