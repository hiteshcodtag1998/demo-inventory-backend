const { PrimaryProduct, SecondaryProduct } = require("../models/product");

const purchaseStock = async (productID, purchaseStockData, isUpdate = false) => {
  // Updating Purchase stock
  try {
    // Secondary Product
    const secondaryProductData = await SecondaryProduct.findOne({ _id: productID });

    if (secondaryProductData) {
      let secondaryUpdatedStock = Number(secondaryProductData.stock) + Number(purchaseStockData);

      if (isUpdate) {
        const pendingStock = Number(secondaryProductData?.stock) - Number(purchaseStockData)
        secondaryUpdatedStock = Number(secondaryProductData?.stock) - pendingStock;
      }

      await SecondaryProduct.findByIdAndUpdate(
        { _id: productID },
        {
          stock: secondaryUpdatedStock,
        },
        { new: true }
      );
    }

    // Primary Product
    const primaryProductData = await PrimaryProduct.findOne({ _id: productID });

    if (primaryProductData) {
      let primaryUpdatedStock = Number(primaryProductData.stock) + Number(purchaseStockData);

      if (isUpdate) {
        primaryUpdatedStock = Number(primaryProductData.stock) - Number(primaryProductData.stock) + Number(purchaseStockData);
      }

      await PrimaryProduct.findByIdAndUpdate(
        { _id: productID },
        {
          stock: primaryUpdatedStock,
        },
        { new: true }
      );
    }
  } catch (error) {
    console.error("Error updating Purchase stock ", error);
  }
};

module.exports = purchaseStock;
