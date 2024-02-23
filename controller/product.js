const { PrimaryProduct, SecondaryProduct } = require("../models/Product");
const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const { PrimarySales, SecondarySales } = require("../models/sales");
const { ROLES, HISTORY_TYPE } = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const { addHistoryData } = require("./history");

const { v4: uuidv4 } = require('uuid');

// Add Post
const addProduct = (req, res) => {
  const productCode = `${req.body.name?.toUpperCase()}-${uuidv4().split('-')[0]}`

  const addProduct = new SecondaryProduct({
    userID: req.body.userId,
    name: req.body.name,
    manufacturer: req.body.manufacturer,
    stock: 0,
    description: req.body.description,
    productCode
  });

  addProduct
    .save()
    .then(async (result) => {
      const historyPayload = {
        productID: result._id,
        description: `${result?.name || ""} product added`,
        type: HISTORY_TYPE.ADD,
        productCode
      }
      addHistoryData(historyPayload, req?.headers?.role).catch(err => console.log('Err', err))
      await PrimaryProduct.insertMany([result]).catch(err => console.log('Err', err))
      res.status(200).send(result);
    })
    .catch((err) => {
      res.status(402).send(err);
    });
};

// Get All Products
const getAllProducts = async (req, res) => {
  let findAllProducts;
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    findAllProducts = await PrimaryProduct.find().sort({ _id: -1 });
  else
    findAllProducts = await SecondaryProduct.find().sort({ _id: -1 }); // -1 for descending;
  res.json(findAllProducts);
};

// Delete Selected Product
const deleteSelectedProduct = async (req, res) => {
  const product = await SecondaryProduct.findOne({ _id: req.params.id }).lean();
  const deleteProduct = await SecondaryProduct.deleteOne(
    { _id: req.params.id }
  ).then(async (result) => {
    const historyPayload = {
      productID: req.params.id,
      description: `${product?.name || ""} product deleted`,
      type: HISTORY_TYPE.DELETE
    }
    addHistoryData(historyPayload, req?.headers?.role, HISTORY_TYPE.DELETE).catch(err => console.log('Err', err))
    await PrimaryProduct.findByIdAndUpdate(req.params.id, { isActive: false }).catch(() => {
      console.log('Primary product error')
    })
  });

  const deletePurchaseProduct = await SecondaryPurchase.deleteOne(
    { ProductID: req.params.id }
  ).then(async () => {
    await PrimaryPurchase.findByIdAndUpdate({ ProductID: req.params.id }, { isActive: false }).catch(() => {
      console.log('Primary purchase error')
    })
  });

  const deleteSaleProduct = await SecondarySales.deleteOne(
    { ProductID: req.params.id }
  ).then(async () => {
    await PrimarySales.findByIdAndUpdate({ ProductID: req.params.id }, { isActive: false }).catch(() => {
      console.log('Primary sales error')
    })
  });

  res.json({
    deleteProduct,
    deletePurchaseProduct, deleteSaleProduct
  });
};

// Update Selected Product
const updateSelectedProduct = async (req, res) => {
  try {
    const productCode = `${req.body.name?.toUpperCase()}-${uuidv4().split('-')[0]}`
    const updatedResult = await SecondaryProduct.findByIdAndUpdate(
      { _id: req.body.productID },
      {
        name: req.body.name,
        manufacturer: req.body.manufacturer,
        description: req.body.description,
        productCode
      },
      { new: true }
    );

    const historyPayload = {
      productID: updatedResult._id,
      description: `${updatedResult?.name || ""} product updated`,
      type: HISTORY_TYPE.UPDATE,
      productCode
    }
    addHistoryData(historyPayload, req?.headers?.role).catch(err => console.log('Err', err))

    await PrimaryProduct.findByIdAndUpdate({ _id: req.body.productID }, {
      name: req.body.name,
      manufacturer: req.body.manufacturer,
      description: req.body.description,
    })
    res.json(updatedResult);
  } catch (error) {
    res.status(402).send("Error");
  }
};

// Search Products
const searchProduct = async (req, res) => {
  const searchTerm = req.query.searchTerm;

  let findAllProducts;
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    findAllProducts = await PrimaryProduct
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { productCode: { $regex: searchTerm, $options: "i" } }
        ],
      }).sort({ _id: -1 });
  else
    findAllProducts = await SecondaryProduct
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { productCode: { $regex: searchTerm, $options: "i" } }
        ],
      }).sort({ _id: -1 }); // -1 for descending;
  res.json(findAllProducts);
};

const productPdfDownload = (req, res) => {
  try {
    console.log('productPdfDownload')
    // Usage
    generatePDFfromHTML(invoiceBill(), res);
  } catch (error) {
    console.log('error in productPdfDownload', error)
  }
}

module.exports = {
  addProduct,
  getAllProducts,
  deleteSelectedProduct,
  updateSelectedProduct,
  searchProduct,
  productPdfDownload
};
