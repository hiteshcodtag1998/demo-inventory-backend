const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const ROLES = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const purchaseStock = require("./purchaseStock");

// Add Purchase Details
const addPurchase = (req, res) => {
  const addPurchaseDetails = new SecondaryPurchase({
    userID: req.body.userID,
    ProductID: req.body.productID,
    QuantityPurchased: req.body.quantityPurchased,
    PurchaseDate: req.body.purchaseDate,
    // TotalPurchaseAmount: req.body.totalPurchaseAmount,
    SupplierName: req.body.supplierName,
    StoreName: req.body.storeName,
    BrandID: req.body.brandID
  });

  addPurchaseDetails
    .save()
    .then(async (result) => {
      await PrimaryPurchase.insertMany([result]).catch(err => console.log('Err', err))
      purchaseStock(req.body.productID, req.body.quantityPurchased);
      res.status(200).send(result);
    })
    .catch((err) => {
      res.status(402).send(err);
    });
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
      QuantityPurchased: 1,
      PurchaseDate: 1,
      SupplierName: 1,
      StoreName: 1,
      BrandID: 1,
      TotalPurchaseAmount: 1,
      isActive: 1,
      createdAt: 1,
      updatedAt: 1
    }
  }];
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
    console.log('req', req.body)
    const payload = {
      supplierName: req.body?.SupplierName || "",
      storeName: req.body?.StoreName || "",
      qty: req.body?.QuantityPurchased || "",
      productName: req.body?.ProductID?.name || "",
      brandName: req.body?.BrandID?.name || ""
    }
    // Usage
    generatePDFfromHTML(invoiceBill(payload), res);
  } catch (error) {
    console.log('error in productPdfDownload', error)
  }
}

module.exports = { addPurchase, getPurchaseData, getTotalPurchaseAmount, purchasePdfDownload };
