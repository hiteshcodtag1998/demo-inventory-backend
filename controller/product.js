const { PrimaryProduct, SecondaryProduct } = require("../models/Product");
const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const { PrimarySales, SecondarySales } = require("../models/sales");
const { ROLES, HISTORY_TYPE } = require("../utils/constant");
const { addHistoryData } = require("./history");

// Add Post
const addProduct = (req, res) => {
  const addProduct = new SecondaryProduct({
    userID: req.body.userId,
    name: req.body.name,
    manufacturer: req.body.manufacturer,
    stock: 0,
    description: req.body.description,
  });

  addProduct
    .save()
    .then(async (result) => {
      const historyPayload = {
        productID: result._id,
        description: `ProductId: ${result._id} added`,
        type: HISTORY_TYPE.ADD
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
  const deleteProduct = await SecondaryProduct.deleteOne(
    { _id: req.params.id }
  ).then(async (result) => {
    const historyPayload = {
      productID: req.params.id,
      description: `ProductId: ${req.params.id} deleted`,
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
    const updatedResult = await SecondaryProduct.findByIdAndUpdate(
      { _id: req.body.productID },
      {
        name: req.body.name,
        manufacturer: req.body.manufacturer,
        description: req.body.description,
      },
      { new: true }
    );

    const historyPayload = {
      productID: updatedResult._id,
      description: `ProductId: ${updatedResult._id} updated`,
      type: HISTORY_TYPE.UPDATE
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
        name: { $regex: searchTerm, $options: "i" },
      }).sort({ _id: -1 });
  else
    findAllProducts = await SecondaryProduct
      .find({
        name: { $regex: searchTerm, $options: "i" },
      }).sort({ _id: -1 }); // -1 for descending;
  res.json(findAllProducts);
};

module.exports = {
  addProduct,
  getAllProducts,
  deleteSelectedProduct,
  updateSelectedProduct,
  searchProduct,
};
