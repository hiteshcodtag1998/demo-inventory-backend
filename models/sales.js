const mongoose = require("mongoose");
const { main } = require("./index");

const SaleSchema = new mongoose.Schema(
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
    StoreID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "store",
    },
    StockSold: {
      type: Number,
      required: true,
    },
    SaleDate: {
      type: String,
      required: true,
    },
    TotalSaleAmount: {
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
    referenceNo: {
      type: String
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
  PrimarySales: primaryDB.model('sales', SaleSchema),
  SecondarySales: secondaryDB.model('sales', SaleSchema)
}

// const Sales = mongoose.model("sales", SaleSchema);
// module.exports = Sales;
