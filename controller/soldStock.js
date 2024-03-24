const Sales = require("../models/sales");
const { SecondaryProduct, PrimaryProduct } = require("../models/product");


const soldStock = async (productID, stockSoldData, isUpdate = false) => {

  // Updating sold stock
  try {

    const myProductData = await SecondaryProduct.findOne({ _id: productID });
    let myUpdatedStock = myProductData?.stock ? (myProductData?.stock - stockSoldData) : 0;

    if (isUpdate) {
      myUpdatedStock = myProductData?.stock ? (myProductData?.stock + myProductData?.stock - stockSoldData) : 0;
    }

    await SecondaryProduct.findByIdAndUpdate(
      { _id: productID },
      {
        stock: myUpdatedStock,
      },
      { new: true }
    );

    // Primary Sale
    const primaryProductData = await PrimaryProduct.findOne({ _id: productID });
    let primaryUpdatedStock = primaryProductData?.stock ? (primaryProductData?.stock - stockSoldData) : 0;

    if (isUpdate) {
      primaryUpdatedStock = primaryProductData?.stock ? (primaryProductData?.stock + primaryProductData?.stock - stockSoldData) : 0;
    }

    await PrimaryProduct.findByIdAndUpdate(
      { _id: productID },
      {
        stock: primaryUpdatedStock,
      },
      { new: true }
    );
  } catch (error) {
    console.error("Error updating sold stock ", error);
  }
};

module.exports = soldStock;
