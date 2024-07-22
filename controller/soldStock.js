const Sales = require("../models/sales");
const { SecondaryProduct, PrimaryProduct } = require("../models/product");


const soldStock = async (productID, stockSoldData, isUpdate = false, beforeStock = 0) => {

  // Updating sold stock
  try {

    const myProductData = await SecondaryProduct.findOne({ _id: productID });
    let myUpdatedStock = myProductData?.stock ? (myProductData?.stock - stockSoldData) : 0;
    if (isUpdate) {
      const pendingStock = Number(beforeStock) - Number(stockSoldData)
      myUpdatedStock = myProductData?.stock || myProductData?.stock === 0 ? Number(myProductData?.stock) + pendingStock : 0;
      // primaryUpdatedStock = primaryProductData?.stock ? (primaryProductData?.stock + primaryProductData?.stock - stockSoldData) : 0;

      // const pendingStock = Number(myProductData?.stock) - Number(stockSoldData)
      // myUpdatedStock = myProductData?.stock ? Number(myProductData?.stock) - pendingStock : 0;
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
      const pendingStock = Number(beforeStock) - Number(stockSoldData)
      primaryUpdatedStock = primaryProductData?.stock || primaryProductData?.stock === 0 ? Number(primaryProductData?.stock) + pendingStock : 0;
      // primaryUpdatedStock = primaryProductData?.stock ? (primaryProductData?.stock + primaryProductData?.stock - stockSoldData) : 0;
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
