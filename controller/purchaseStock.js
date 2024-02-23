const { SecondaryProduct } = require("../models/Product");

const purchaseStock = async (productID, purchaseStockData) => {
  // Updating Purchase stock
  try {
    console.log('--->productID, purchaseStockData', productID, purchaseStockData)
    const myProductData = await SecondaryProduct.findOne({ _id: productID });
    let myUpdatedStock = parseInt(myProductData.stock) + purchaseStockData;

    const PurchaseStock = await SecondaryProduct.findByIdAndUpdate(
      { _id: productID },
      {
        stock: myUpdatedStock,
      },
      { new: true }
    );
  } catch (error) {
    console.error("Error updating Purchase stock ", error);
  }
};

module.exports = purchaseStock;
