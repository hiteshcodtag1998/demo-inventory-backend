const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const { PrimaryAvailableStock, SecondaryAvailableStock } = require("../models/availableStock");
const ROLES = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const purchaseStock = require("./purchaseStock");
const { addHistoryData } = require("./history");
const { SecondaryProduct } = require("../models/product");

// Add Purchase Details
const addPurchase = async (req, res) => {

  try {
    const prchases = req.body;

    const purchaseDocs = await Promise.all(
      prchases.map(async (product) => {

        const addPurchaseDetails = new SecondaryPurchase({
          userID: product.userID,
          ProductID: product.productID,
          QuantityPurchased: product.quantityPurchased,
          PurchaseDate: product.purchaseDate,
          // TotalPurchaseAmount: product.totalPurchaseAmount,
          SupplierName: product.supplierName,
          StoreName: product.storeName,
          BrandID: product.brandID,
          warehouseID: product.warehouseID,
          referenceNo: product?.referenceNo || ""
        });

        const purchaseProduct = await addPurchaseDetails.save();

        // Start History Data
        const productInfo = await SecondaryProduct.findOne({ _id: purchaseProduct.ProductID })
        const historyPayload = {
          productID: purchaseProduct.ProductID,
          purchaseID: purchaseProduct._id,
          description: `${productInfo?.name || ""} product purchased`,
          type: HISTORY_TYPE.ADD,
        };

        await addHistoryData(historyPayload, req?.headers?.role);
        // End History Data

        // Start update in available stock
        const availableStockPayload = {
          warehouseID: product.warehouseID,
          productID: product.productID,
          stock: product.quantityPurchased
        }

        const stocksRes = await SecondaryAvailableStock.insertMany([availableStockPayload]);
        await PrimaryAvailableStock.insertMany(stocksRes)
        // End update in available stock

        await PrimaryPurchase.insertMany([purchaseProduct]);
        purchaseStock(product.productID, product.quantityPurchased);

        return purchaseProduct;
      })
    );

    res.status(200).send(purchaseDocs);
  } catch (err) {
    res.status(402).send(err);
  }
};

// Get All Purchase Data
const getPurchaseData = async (req, res) => {
  // const findAllPurchaseData = await SecondaryPurchase.find({ "userID": req.params.userID })
  //   .sort({ _id: -1 })
  //   .populate("ProductID"); // -1 for descending order
  // res.json(findAllPurchaseData);

  let findAllPurchaseData;
  const aggregationPiepline = [{
    $lookup: {
      from: 'products',
      localField: 'ProductID',
      foreignField: '_id',
      as: 'ProductID'
    }
  },
  {
    $unwind: "$ProductID"
  },
  {
    $lookup: {
      from: 'warehouses',
      localField: 'warehouseID',
      foreignField: '_id',
      as: 'warehouseID'
    }
  },
  {
    $unwind: {
      path: "$warehouseID",
      preserveNullAndEmptyArrays: true // Preserve records without matching BrandID
    }
  },
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
      ProductID: 1,
      warehouseID: 1,
      QuantityPurchased: 1,
      PurchaseDate: 1,
      SupplierName: 1,
      StoreName: 1,
      BrandID: 1,
      TotalPurchaseAmount: 1,
      referenceNo: 1,
      isActive: 1,
      createdAt: 1,
      updatedAt: 1
    }
  },
  { $sort: { _id: -1 } }];
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    findAllPurchaseData = await PrimaryPurchase.aggregate(aggregationPiepline);
  else
    findAllPurchaseData = await SecondaryPurchase.aggregate(aggregationPiepline); // -1 for descending;
  res.json(findAllPurchaseData);
};

// Get total purchase amount
const getTotalPurchaseAmount = async (req, res) => {
  let totalPurchaseAmount = 0;

  if (req?.headers?.role === ROLES.SUPER_ADMIN) {
    const purchaseData = await PrimaryPurchase.find();
    purchaseData.forEach((purchase) => {
      totalPurchaseAmount += purchase.TotalPurchaseAmount;
    });
  }
  else {
    const purchaseData = await SecondaryPurchase.find();
    purchaseData.forEach((purchase) => {
      totalPurchaseAmount += purchase.TotalPurchaseAmount;
    });
  }
  res.json({ totalPurchaseAmount });
};

// Update Selected Product
const updateSelectedPurchaase = async (req, res) => {
  try {
    const updatedResult = await SecondaryPurchase.findByIdAndUpdate(
      { _id: req.body.purchaseID },
      {
        ProductID: req.body.productID,
        QuantityPurchased: req.body.quantityPurchased,
        PurchaseDate: req.body.purchaseDate,
        SupplierName: req.body.supplierName,
        StoreName: req.body.storeName,
        BrandID: req.body.brandID,
        warehouseID: req.body.warehouseID,
        referenceNo: req.body?.referenceNo || ""
      },
      { new: true }
    );

    // Start History Data
    const productInfo = await SecondaryProduct.findOne({ _id: updatedResult.ProductID })
    const historyPayload = {
      productID: updatedResult.ProductID,
      purchaseID: updatedResult._id,
      description: `${productInfo?.name || ""} product purchase updated`,
      type: ROLES.HISTORY_TYPE.UPDATE,
    };

    await addHistoryData(historyPayload, req?.headers?.role);
    // End History Data

    // Start update in available stock
    const existsAvailableStock = await SecondaryAvailableStock.findOne({
      warehouseID: req.body.warehouseID,
      productID: req.body.productID,
    });

    const availableStockPayload = {
      warehouseID: req.body.warehouseID,
      productID: req.body.productID,
      stock: req.body.quantityPurchased
    }

    await SecondaryAvailableStock.findByIdAndUpdate(
      { _id: existsAvailableStock._id }, availableStockPayload)
    await PrimaryAvailableStock.findByIdAndUpdate(
      { _id: existsAvailableStock._id }, availableStockPayload)

    purchaseStock(req.body.productID, req.body.quantityPurchased);

    // End update in available stock

    await PrimaryPurchase.findByIdAndUpdate({ _id: req.body.productID }, {
      name: req.body.name,
      manufacturer: req.body.manufacturer,
      description: req.body.description,
    })
    res.json(updatedResult);
  } catch (error) {
    console.log('error', error)
    res.status(402).send("Error");
  }
};

const purchasePdfDownload = (req, res) => {
  try {
    const payload = {
      title: "Purchase Note",
      supplierName: req.body?.SupplierName || "",
      storeName: req.body?.warehouseID?.name || "",
      qty: req.body?.QuantityPurchased || "",
      productName: req.body?.ProductID?.name || "",
      brandName: req.body?.BrandID?.name || "",
      referenceNo: req.body?.referenceNo || ""
    }
    // Usage
    generatePDFfromHTML(invoiceBill(payload), res);
  } catch (error) {
    console.log('error in productPdfDownload', error)
  }
}

module.exports = { addPurchase, getPurchaseData, getTotalPurchaseAmount, purchasePdfDownload, updateSelectedPurchaase };
