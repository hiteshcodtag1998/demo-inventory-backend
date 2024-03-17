const { PrimaryProduct, SecondaryProduct } = require("../models/product");
const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const { PrimarySales, SecondarySales } = require("../models/sales");
const { SecondaryBrand } = require("../models/brand");
const { ROLES, HISTORY_TYPE } = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const { addHistoryData } = require("./history");
const { ObjectId } = require('mongodb');

const { v4: uuidv4 } = require('uuid');
const { PrimaryAvailableStock, SecondaryAvailableStock } = require("../models/availableStock");

// Add Post
const addProduct = async (req, res) => {
  try {
    const products = req.body;

    const productDocs = await Promise.all(
      products.map(async (product) => {
        const brand = await SecondaryBrand.findOne({ _id: product.brandId }).lean();
        const productCode = `${(product.name?.toUpperCase() || '').substring(0, 3)}-${(brand.name?.toUpperCase() || '').substring(0, 3)}-${uuidv4().split('-')[0]}`;

        const addProduct = new SecondaryProduct({
          userID: product.userId,
          name: product.name,
          BrandID: product.brandId,
          stock: 0,
          description: product.description,
          productCode
        });

        const savedProduct = await addProduct.save();

        const historyPayload = {
          productID: savedProduct._id,
          description: `${savedProduct?.name || ""} product added`,
          type: HISTORY_TYPE.ADD,
          productCode
        };

        await addHistoryData(historyPayload, req?.headers?.role);
        await PrimaryProduct.insertMany([savedProduct]);

        return savedProduct;
      })
    );

    res.status(200).send(productDocs);
  } catch (err) {
    console.error('Error adding products:', err);
    res.status(402).send(err);
  }
};


// // Get All Products
// const getAllProducts = async (req, res) => {
//   let findAllProducts;
//   if (req?.headers?.role === ROLES.SUPER_ADMIN)
//     findAllProducts = await PrimaryProduct.find().sort({ _id: -1 });
//   else
//     findAllProducts = await SecondaryProduct.find().sort({ _id: -1 }); // -1 for descending;
//   res.json(findAllProducts);
// };

// Get All Purchase Data
const getAllProducts = async (req, res) => {

  let findAllProducts;
  const aggregationPiepline = [
    {
      $lookup: {
        from: 'brands',
        localField: 'BrandID',
        foreignField: '_id',
        as: 'BrandID'
      }
    },
    {
      $unwind: {
        path: "$BrandID",
        preserveNullAndEmptyArrays: true // Preserve records without matching BrandID
      }
    },
    {
      $match: {
        $or: [
          { BrandID: { $exists: true } }, // Include records with valid BrandID
          { BrandID: undefined } // Include records where BrandID is undefined
        ]
      }
    },
    {
      $project: {
        userID: 1,
        name: 1,
        manufacturer: 1,
        stock: 1,
        description: 1,
        productCode: 1,
        BrandID: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1
      },
    },
    { $sort: { _id: -1 } }];
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    findAllProducts = await PrimaryProduct.aggregate(aggregationPiepline);
  else
    findAllProducts = await SecondaryProduct.aggregate(aggregationPiepline); // -1 for descending;
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

// Search Products
const searchProductByWarehouse = async (req, res) => {
  const searchTerm = req.query.selectWarehouse;

  let findAllProducts;
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    findAllProducts = await PrimaryAvailableStock
      .aggregate([
        {
          $lookup: {
            from: 'product',
            localField: 'productID',
            foreignField: '_id',
            as: 'productID'
          }
        },
        {
          $unwind: {
            path: "$productID",
            preserveNullAndEmptyArrays: true // Preserve records without matching BrandID
          }
        },
        {
          $match: {
            warehouseID: new ObjectId(searchTerm)
          }
        },
      ])

  else
    findAllProducts = await SecondaryAvailableStock
      .aggregate([
        {
          $match: {
            warehouseID: new ObjectId(searchTerm)
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productID',
            foreignField: '_id',
            as: 'productID'
          }
        },
        {
          $unwind: {
            path: "$productID",
            preserveNullAndEmptyArrays: true // Preserve records without matching BrandID
          }
        },
        {
          $lookup: {
            from: 'brands',
            localField: 'productID.BrandID',
            foreignField: '_id',
            as: 'productID.BrandID'
          }
        },
        {
          $unwind: {
            path: "$productID.BrandID",
            preserveNullAndEmptyArrays: true // Preserve records without matching BrandID
          }
        },

      ])
  res.json(findAllProducts);
};

module.exports = {
  addProduct,
  getAllProducts,
  deleteSelectedProduct,
  updateSelectedProduct,
  searchProduct,
  searchProductByWarehouse
};
