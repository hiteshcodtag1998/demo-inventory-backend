const { PrimaryProduct, SecondaryProduct } = require("../models/product");

const purchaseStock = async (productID, purchaseStockData) => {
  // Updating Purchase stock
  try {
    // Secondary Product
    const secondaryProductData = await SecondaryProduct.findOne({ _id: productID });
    let secondaryUpdatedStock = Number(secondaryProductData.stock) + Number(purchaseStockData);

    await SecondaryProduct.findByIdAndUpdate(
      { _id: productID },
      {
        stock: secondaryUpdatedStock,
      },
      { new: true }
    );

    // Primary Product
    const primaryProductData = await PrimaryProduct.findOne({ _id: productID });
    let primaryUpdatedStock = Number(primaryProductData.stock) + Number(purchaseStockData);

    await PrimaryProduct.findByIdAndUpdate(
      { _id: productID },
      {
        stock: primaryUpdatedStock,
      },
      { new: true }
    );
  } catch (error) {
    console.error("Error updating Purchase stock ", error);
  }
};

module.exports = purchaseStock;
