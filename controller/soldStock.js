const Sales = require("../models/sales");
const { SecondaryProduct } = require("../models/Product");


const soldStock = async (productID, stockSoldData) => {

  // Updating sold stock
  try {

    const myProductData = await SecondaryProduct.findOne({ _id: productID });
    let myUpdatedStock = myProductData.stock - stockSoldData;

    const SoldStock = await SecondaryProduct.findByIdAndUpdate(
      { _id: productID },
      {
        stock: myUpdatedStock,
      },
      { new: true }
    );

  } catch (error) {
    console.error("Error updating sold stock ", error);
  }
};

module.exports = soldStock;
