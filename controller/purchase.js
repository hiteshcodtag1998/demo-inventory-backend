const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const ROLES = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const purchaseStock = require("./purchaseStock");

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

module.exports = { addPurchase, getPurchaseData, getTotalPurchaseAmount, purchasePdfDownload };
