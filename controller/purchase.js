const { PrimaryPurchase, SecondaryPurchase } = require("../models/purchase");
const { PrimaryAvailableStock, SecondaryAvailableStock } = require("../models/availableStock");
const { ROLES, HISTORY_TYPE, METHODS } = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const purchaseStock = require("./purchaseStock");
const { addHistoryData } = require("./history");
const { SecondaryProduct, PrimaryProduct } = require("../models/product");
const { ObjectId } = require('mongodb');
const { SecondaryWarehouse } = require("../models/warehouses");
const { invoiceBillMultipleItems } = require("../utils/templates/invoice-bill-multiple-item");
const moment = require("moment-timezone");
const { getTimezoneWiseDate } = require("../utils/handler");
const { SecondarySales, PrimarySales } = require("../models/sales");
const { SecondaryWriteOff, PrimaryWriteOff } = require("../models/writeOff");

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

        let purchaseProduct = await addPurchaseDetails.save();

        const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""
        // Start History Data
        const productInfo = await SecondaryProduct.findOne({ _id: purchaseProduct.ProductID })

        const historyPayload = {
          productID: purchaseProduct.ProductID,
          purchaseID: purchaseProduct._id,
          description: `${productInfo?.name || ""} product purchased ${product.quantityPurchased ? `(No of purchase: ${product.quantityPurchased})` : ""}`,
          type: HISTORY_TYPE.ADD,
          createdById: requestby,
          historyDate: getTimezoneWiseDate(product.purchaseDate),
          updatedById: requestby
        };
        console.log('historyPayload', historyPayload)


        const { primaryResult, secondaryResult } = await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.ADD);
        // End History Data

        // Start update in available stock
        const availableStockPayload = {
          warehouseID: product.warehouseID,
          productID: product.productID,
          $inc: {
            stock: product.quantityPurchased  // Increment the stock by the quantity purchased
          }
        }

        await SecondaryAvailableStock.updateOne({
          warehouseID: product.warehouseID,
          productID: product.productID,
        }, availableStockPayload, { upsert: true });
        const secRes = await SecondaryAvailableStock.findOne({
          warehouseID: product.warehouseID,
          productID: product.productID,
        })
        await PrimaryAvailableStock.updateOne({
          warehouseID: product.warehouseID,
          productID: product.productID,
        }, secRes, { upsert: true });
        // End update in available stock

        purchaseProduct = { ...purchaseProduct._doc, HistoryID: secondaryResult?.[0]?._id }
        await Promise.all([
          PrimaryPurchase.insertMany([purchaseProduct]),
          SecondaryPurchase.updateOne({ _id: new ObjectId(purchaseProduct._id) }, { HistoryID: secondaryResult?.[0]?._id })
        ]);

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
const getAllPurchaseData = async (req, res) => {
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
  if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
    findAllPurchaseData = await PrimaryPurchase.aggregate(aggregationPiepline);
  else
    findAllPurchaseData = await SecondaryPurchase.aggregate(aggregationPiepline); // -1 for descending;
  res.json(findAllPurchaseData);
};

// Get All Purchase Data
const getPurchaseData = async (req, res) => {

  let findPurchaseData;

  if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
    findPurchaseData = await PrimaryPurchase.findById(req?.params?.id).sort({ createdAt: -1 }).lean();
  else
    findPurchaseData = await SecondaryPurchase.findById(req?.params?.id).sort({ createdAt: -1 }).lean(); // -1 for descending;
  res.json(findPurchaseData);
};

// Get total purchase amount
const getTotalPurchaseAmount = async (req, res) => {
  let totalPurchaseAmount = 0;

  if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN) {
    const purchaseData = await PrimaryPurchase.find().lean();

    if (purchaseData && purchaseData?.length > 0)
      purchaseData.forEach((purchase) => {
        totalPurchaseAmount += purchase.TotalPurchaseAmount;
      });
  }
  else {
    const purchaseData = await SecondaryPurchase.find().lean();
    if (purchaseData && purchaseData?.length > 0)
      purchaseData.forEach((purchase) => {
        totalPurchaseAmount += purchase.TotalPurchaseAmount;
      });
  }
  res.json({ totalPurchaseAmount });
};

// Update Selected Purchase
const updateSelectedPurchaase = async (req, res) => {
  try {
    let updatedResult = null;
    const availableStockPayload = {
      warehouseID: req.body.warehouseID,
      productID: req.body.productID,
      stock: req.body.quantityPurchased
    }

    /**
     * This is for Super Admin and Admin
     */
    if (![ROLES.HIDE_MASTER_SUPER_ADMIN].includes(req?.headers?.role)) {

      updatedResult = await SecondaryPurchase.findByIdAndUpdate(
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

      const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""
      // Start History Data
      const productInfo = await SecondaryProduct.findOne({ _id: updatedResult.ProductID })
      const historyPayload = {
        productID: updatedResult.ProductID,
        purchaseID: updatedResult._id,
        description: `${productInfo?.name || ""} product purchase updated ${req.body?.quantityPurchased ? `(No of purchase: ${req.body?.quantityPurchased})` : ""}`,
        type: HISTORY_TYPE.UPDATE,
        createdById: requestby,
        updatedById: requestby,
        historyDate: getTimezoneWiseDate(req.body.purchaseDate),
        historyID: updatedResult?.HistoryID || ""
      };

      await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.UPDATE);
      // End History Data

      // Start update in available stock
      const existsAvailableStock = await SecondaryAvailableStock.findOne({
        warehouseID: req.body.warehouseID,
        productID: req.body.productID,
      });
      await SecondaryAvailableStock.findByIdAndUpdate(
        { _id: existsAvailableStock._id }, availableStockPayload)
      // End update in available stock

    }
    /**
     * This is for Hide Super Admin
     */
    else {
      // Start update in available stock
      const existsAvailableStock = await PrimaryAvailableStock.findOne({
        warehouseID: req.body.warehouseID,
        productID: req.body.productID,
      });
      await PrimaryAvailableStock.findByIdAndUpdate(
        { _id: existsAvailableStock._id }, availableStockPayload)
      // End update in available stock

      updatedResult = await PrimaryPurchase.findByIdAndUpdate({ _id: req.body.purchaseID }, {
        QuantityPurchased: req.body.quantityPurchased,
        PurchaseDate: req.body.purchaseDate,
        SupplierName: req.body.supplierName,
        referenceNo: req.body?.referenceNo || ""
      })

      const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""
      // Start History Data
      const productInfo = await PrimaryProduct.findOne({ _id: updatedResult.ProductID })
      const historyPayload = {
        productID: updatedResult.ProductID,
        purchaseID: updatedResult._id,
        description: `${productInfo?.name || ""} product purchase updated ${req.body?.quantityPurchased ? `(No of purchase: ${req.body?.quantityPurchased})` : ""}`,
        type: HISTORY_TYPE.UPDATE,
        createdById: requestby,
        updatedById: requestby,
        historyDate: getTimezoneWiseDate(req.body.purchaseDate),
        historyID: updatedResult?.HistoryID || ""
      };

      await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.UPDATE);
      // End History Data
    }

    purchaseStock(req.body.productID, req.body.quantityPurchased, true);

    res.json(updatedResult);
  } catch (error) {
    res.status(500).send({ error, message: error?.message || "" });
  }
};

const purchasePdfDownload = async (req, res) => {
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

const purchaseMultileItemsPdfDownload = async (req, res) => {
  try {
    const prchases = req.body;

    // const payload = {
    //   title: "Purchase Note",
    //   supplierName: req.body?.SupplierName || "",
    //   storeName: req.body?.warehouseID?.name || "",
    //   qty: req.body?.QuantityPurchased || "",
    //   productName: req.body?.ProductID?.name || "",
    //   brandName: req.body?.BrandID?.name || "",
    //   referenceNo: req.body?.referenceNo || ""
    // }

    const payload = {
      title: "Purchase Note",
      supplierName: req.body?.[0]?.SupplierName || "",
      qty: [],
      productName: [],
      brandName: [],
      referenceNo: req.body?.[0]?.referenceNo || ""
    }

    if (req.body?.[0]?.warehouseID) {
      const warehouseInfos = await SecondaryWarehouse.findOne({ _id: new ObjectId(req.body?.[0]?.warehouseID) }).lean();
      payload.storeName = warehouseInfos?.name || ""
    }
    await Promise.all(
      prchases.map(async (purchase) => {
        const aggregationPiepline = [
          {
            $match: {
              _id: new ObjectId(purchase.productID)
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
          }];

        const productInfos = await SecondaryProduct.aggregate(aggregationPiepline);
        if (productInfos?.length > 0) {
          payload.productName.push(productInfos[0]?.name || "")
          payload.qty.push(purchase.quantityPurchased || "")
          payload.brandName.push(productInfos[0]?.BrandID?.name || "")
        }
      }));
    generatePDFfromHTML(invoiceBillMultipleItems(payload), res);
  } catch (error) {
    console.log('error in productPdfDownload', error)
  }
}

// Get All Purchase Data by Product Id
const getPurchaseDataByProductId = async (req, res) => {

  let findPurchaseData;

  if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
    findPurchaseData = await PrimaryPurchase.find({ ProductID: req?.params?.productId }).sort({ createdAt: -1 }).lean();
  else
    findPurchaseData = await SecondaryPurchase.find({ ProductID: req?.params?.productId }).sort({ createdAt: -1 }).lean(); // -1 for descending;
  res.json(findPurchaseData);
};

// Delete Selected Product
const deleteSelectedPurchase = async (req, res) => {
  let needToRemoveItem = 0;

  const purchaseInfo = await SecondaryPurchase.findOne({ _id: req.params.id }).lean();
  console.log('purchaseInfo', purchaseInfo)
  if (!purchaseInfo) {
    throw new Error("Purchase not found");
  }

  needToRemoveItem = purchaseInfo?.QuantityPurchased || 0

  const deletePurchase = await SecondaryPurchase.deleteOne(
    { _id: req.params.id }
  ).then(async () => {
    const historyPayload = {
      purchaseID: req.params.id,
      description: `${purchaseInfo?.ProductID?.name || ""} purchase deleted`,
      type: HISTORY_TYPE.DELETE
    }
    addHistoryData(historyPayload, req?.headers?.role, HISTORY_TYPE.DELETE).catch(err => console.log('Err', err))
    await PrimaryPurchase.findByIdAndUpdate(req.params.id, { isActive: false }).catch(() => {
      console.log('Delete primary purchase error')
    })
  });

  needToRemoveItem = await deleteOrUpdateSaleByPurchase(purchaseInfo, needToRemoveItem);

  needToRemoveItem = await deleteOrUpdateWriteOffByPurchase(purchaseInfo, needToRemoveItem);

  // await pullStockFromAvailableStock(purchaseInfo)

  res.json({
    deletePurchase
  });
};

const deleteOrUpdateSaleByPurchase = async (purchaseInfo, needToRemoveItem) => {
  try {
    if (needToRemoveItem <= 0) return;

    const { _id: purchaseId } = purchaseInfo; // The purchase ID to process

    // Find sales that are linked to this purchase
    const sales = await SecondarySales.find({
      linkedPurchaseId: purchaseId,
    }).lean();


    if (!sales.length) {
      console.log('No sales found for this purchase')
      return needToRemoveItem;
    }

    // Process each sale that is linked to the purchase
    for (const sale of sales) {
      const linkedPurchases = sale.linkedPurchaseId; // Array of linked purchases

      if (linkedPurchases.length === 1 && linkedPurchases[0].toString() === purchaseId?.toString()) {

        // Case 1: Single linked purchase - delete the sale
        await SecondarySales.deleteOne({ _id: sale._id });
        await PrimarySales.findByIdAndUpdate(
          sale._id,
          { isActive: false },
          { new: true }
        );
        console.log(`Sale ${sale._id} deleted as it was only linked to purchase ${purchaseId}`);
      } else {
        // Case 2: Multiple linked purchases - decrease the stock
        const stockToDecrease = purchaseInfo.QuantityPurchased;

        // Update the sale directly
        await SecondarySales.findByIdAndUpdate(
          sale._id,
          {
            $inc: { StockSold: -needToRemoveItem }, // Decrease StockSold
            $pull: { linkedPurchaseId: purchaseId }, // Remove purchaseId from linkedPurchaseId
          },
          { new: true }
        );

        // Update the corresponding record in PrimarySales
        await PrimarySales.findByIdAndUpdate(
          sale._id,
          {
            $inc: { StockSold: -needToRemoveItem },
            $pull: { linkedPurchaseId: purchaseId },
          },
          { new: true }
        );

        console.log(
          `Stock for sale ${sale._id} decreased by ${stockToDecrease} and purchase ${purchaseId} unlinked`
        );
      }

      needToRemoveItem -= sale?.StockSold || 0

      // If all items are removed, break out of the loop
      if (needToRemoveItem <= 0) break;
    }
    return needToRemoveItem
  } catch (error) {
    console.log('Error while deleteOrUpdateSaleByPurchase', error)
    return needToRemoveItem;
  }
};

const deleteOrUpdateWriteOffByPurchase = async (purchaseInfo, needToRemoveItem) => {
  try {
    if (needToRemoveItem <= 0) return;

    const { _id: purchaseId, QuantityPurchased } = purchaseInfo; // The purchase ID to process

    // Find write-offs that are linked to this purchase
    const writeOffs = await SecondaryWriteOff.find({
      linkedPurchaseId: purchaseId,
    }).lean();

    // If no write-offs are linked to the purchase, log and return
    if (!writeOffs.length) {
      console.log('No write-offs found for this purchase');
      return needToRemoveItem;
    }

    // Process each write-off that is linked to the purchase
    for (const writeOff of writeOffs) {
      const linkedPurchases = writeOff.linkedPurchaseId; // Array of linked purchases

      if (linkedPurchases.length === 1 && linkedPurchases[0].toString() === purchaseId?.toString()) {
        // Case 1: Single linked purchase - delete the write-off
        await SecondaryWriteOff.deleteOne({ _id: writeOff._id });
        await PrimaryWriteOff.findByIdAndUpdate(
          writeOff._id,
          { isActive: false },
          { new: true }
        );
        console.log(`Write-off ${writeOff._id} deleted as it was only linked to purchase ${purchaseId}`);
      } else {
        // Case 2: Multiple linked purchases - decrease the stock
        const stockToDecrease = QuantityPurchased;
        // Update the write-off directly
        await SecondaryWriteOff.findByIdAndUpdate(
          writeOff._id,
          {
            $inc: { StockSold: -needToRemoveItem }, // Decrease StockSold
            $pull: { linkedPurchaseId: purchaseId }, // Remove purchaseId from linkedPurchaseId
          },
          { new: true }
        );

        // Update the corresponding record in PrimaryWriteOff
        await PrimaryWriteOff.findByIdAndUpdate(
          writeOff._id,
          {
            $inc: { StockSold: -needToRemoveItem },
            $pull: { linkedPurchaseId: purchaseId },
          },
          { new: true }
        );

        console.log(
          `Stock for write-off ${writeOff._id} decreased by ${stockToDecrease} and purchase ${purchaseId} unlinked`
        );
      }

      needToRemoveItem -= writeOff?.StockSold || 0

      // If all items are removed, break out of the loop
      if (needToRemoveItem <= 0) break;
    }
    return needToRemoveItem
  } catch (error) {
    console.log('Error while deleteOrUpdateWriteOffByPurchase', error);
  }
};


const pullStockFromAvailableStock = async (purchaseInfo) => {
  try {
    const { ProductID: productId, warehouseID: warehouseId, QuantityPurchased } = purchaseInfo;

    // Pull stock from SecondaryAvailableStock collection
    const secondaryStock = await SecondaryAvailableStock.findOneAndUpdate(
      { productID: new ObjectId(productId), warehouseID: new ObjectId(warehouseId) },
      { $inc: { stock: -QuantityPurchased } }, // Decrease stock by QuantityPurchased
      { new: true }
    );

    if (!secondaryStock) {
      console.log('Stock entry not found in SecondaryAvailableStock');
      return;
    }

    // Pull stock from PrimaryAvailableStock collection
    const primaryStock = await PrimaryAvailableStock.findOneAndUpdate(
      { productID: new ObjectId(productId), warehouseID: new ObjectId(warehouseId) },
      { $inc: { stock: -QuantityPurchased } }, // Decrease stock by QuantityPurchased
      { new: true }
    );

    if (!primaryStock) {
      console.log('Stock entry not found in PrimaryAvailableStock');
      return;
    }

    console.log(`Removed ${QuantityPurchased} stock for product ${productId} from both Primary and Secondary collections`);

    purchaseStock(productId, QuantityPurchased, true)
  } catch (error) {
    console.log('Error while pulling stock and updating product stocks', error);
  }
};


module.exports = { addPurchase, getAllPurchaseData, getPurchaseData, getTotalPurchaseAmount, purchasePdfDownload, purchaseMultileItemsPdfDownload, updateSelectedPurchaase, getPurchaseDataByProductId, deleteSelectedPurchase };
