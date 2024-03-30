const mongoose = require("mongoose");
const { main } = require("./index")

const ProductSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
    },
    name: {
      type: String,
    },
    manufacturer: {
      type: String,
    },
    stock: {
      type: Number,
    },
    description: String,
    productCode: String,
    BrandID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "brand",
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

// const Product = mongoose.model("product", ProductSchema);
// module.exports = Product;

module.exports = {
  PrimaryProduct: primaryDB.model('product', ProductSchema),
  SecondaryProduct: secondaryDB.model('product', ProductSchema)
}
