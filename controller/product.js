const { PrimaryProduct, SecondaryProduct } = require("../models/Product");
const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const { PrimarySales, SecondarySales } = require("../models/sales");
const ROLES = require("../utils/constant");

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
  ).then(async () => {
    await PrimaryProduct.findByIdAndUpdate(req.params.id, { isActive: false }).catch(() => {
      console.log('Primary product error')
    })
  });

  // const deletePurchaseProduct = await Purchase.deleteOne(
  //   { ProductID: req.params.id }
  // ).then(async () => {
  //   await PrimaryPurchase.findByIdAndUpdate(req.params.id, { isActive: false }).catch(() => {
  //     console.log('Primary purchase error')
  //   })
  // });

  // const deleteSaleProduct = await Sales.deleteOne(
  //   { ProductID: req.params.id }
  // ).then(async () => {
  //   await PrimarySales.findByIdAndUpdate(req.params.id, { isActive: false }).catch(() => {
  //     console.log('Primary sales error')
  //   })
  // });

  res.json({
    deleteProduct,
    // deletePurchaseProduct, deleteSaleProduct
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
    console.log(updatedResult);
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
