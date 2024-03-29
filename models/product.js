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
      required: true,
    },
    manufacturer: {
      type: String,
    },
    stock: {
      type: Number,
      required: true,
    },
    description: String,
    productCode: String,
    BrandID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "brand",
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

// const Product = mongoose.model("product", ProductSchema);
// module.exports = Product;

module.exports = {
  PrimaryProduct: primaryDB.model('product', ProductSchema),
  SecondaryProduct: secondaryDB.model('product', ProductSchema)
}
