const { PrimarySales, SecondarySales } = require("../models/sales");
const soldStock = require("../controller/soldStock");
const { ROLES, HISTORY_TYPE, METHODS } = require("../utils/constant");
const { SecondaryProduct } = require("../models/product");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const { SecondaryAvailableStock, PrimaryAvailableStock } = require("../models/availableStock");
const { ObjectId } = require('mongodb');
const { addHistoryData } = require("./history");
const { invoiceBillMultipleItems } = require("../utils/templates/invoice-bill-multiple-item");
const { SecondaryWarehouse } = require("../models/warehouses");
const moment = require("moment-timezone");
const { getTimezoneWiseDate } = require("../utils/handler");
const { SecondaryPurchase } = require("../models/purchase");

// Add Sales
const addSales = async (req, res) => {
  try {
    const sales = req.body;

    const saleDocs = await Promise.all(
      sales.map(async (sale) => {
        const existsAvailableStock = await SecondaryAvailableStock.findOne({
          warehouseID: sale.warehouseID,
          productID: sale.productID,
        });

        if (!existsAvailableStock || existsAvailableStock?.stock < sale.stockSold) {
          throw new Error("Stock is not available");
        }

        const isExistProduct = await SecondaryProduct.findById(sale.productID);

        if (!isExistProduct) {
          throw new Error("Product does not exist");
        }

        let remainingStock = sale.stockSold;
        const linkedPurchases = [];

        // Fetch purchases (FIFO order)
        const purchases = await SecondaryPurchase.find({
          ProductID: sale.productID,
          warehouseID: sale.warehouseID,
        }).sort({ PurchaseDate: 1 });

        // Deduct stock from purchases (without updating or deleting purchases)
        for (const purchase of purchases) {
          if (remainingStock <= 0) break;

          const deductStock = Math.min(remainingStock, purchase.stock);

          linkedPurchases.push({
            purchaseID: purchase._id,
            quantity: deductStock,
          });

          remainingStock -= deductStock;

          // No updates or deletions to the purchase document
        }

        if (remainingStock > 0) {
          throw new Error("Insufficient purchase stock to fulfill the sale");
        }

        // Create the sale payload
        const payload = {
          userID: sale.userID,
          ProductID: sale.productID,
          StockSold: sale.stockSold,
          SaleDate: sale.saleDate,
          SupplierName: sale.supplierName,
          StoreName: sale.storeName,
          BrandID: sale.brandID,
          warehouseID: sale.warehouseID,
          referenceNo: sale.referenceNo || "",
          linkedPurchaseId: linkedPurchases.map((lp) => lp.purchaseID), // Save linked purchases
        };

        // Create secondary sale record
        const addSalesDetails = new SecondarySales(payload);
        let salesProduct = await addSalesDetails.save();

        // Create primary sale record (to insert in PrimarySales collection)
        const primarySalesPayload = {
          ...payload,
          _id: salesProduct._id,
          HistoryID: salesProduct._id, // Linking history ID for consistency
        };
        await PrimarySales.insertMany([primarySalesPayload]);

        // Update available stock
        const availableStockPayload = {
          warehouseID: sale.warehouseID,
          productID: sale.productID,
          stock: existsAvailableStock.stock - sale.stockSold,
        };
        await SecondaryAvailableStock.findByIdAndUpdate(existsAvailableStock._id, availableStockPayload);

        // Call soldStock function to update stock in both available stock collections
        await soldStock(sale.productID, sale.stockSold);

        // Add history for the sale
        const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : "";
        const productInfo = await SecondaryProduct.findById(sale.productID);
        const historyPayload = {
          productID: sale.productID,
          saleID: salesProduct._id,
          description: `${productInfo?.name || ""} product sold (No of sale: ${sale.stockSold})`,
          type: HISTORY_TYPE.ADD,
          historyDate: getTimezoneWiseDate(sale.saleDate),
          createdById: requestby,
          updatedById: requestby,
        };
        const { secondaryResult } = await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.ADD);

        // Update history in sales
        salesProduct = { ...salesProduct._doc, HistoryID: secondaryResult?.[0]?._id };
        await SecondarySales.updateOne({ _id: salesProduct._id }, { HistoryID: secondaryResult?.[0]?._id });

        // Return final sales product
        return salesProduct;
      })
    );

    res.status(200).send(saleDocs);
  } catch (err) {
    res.status(500).send({ err, message: err?.message || "" });
  }
};

// The soldStock function
// const soldStock = async (productID, soldQuantity) => {
//   try {
//     // Update the stock in the available stock collections
//     const availableStock = await SecondaryAvailableStock.findOne({ productID });

//     if (availableStock) {
//       // Deduct sold quantity from the available stock
//       availableStock.stock -= soldQuantity;

//       // Save the updated stock
//       await availableStock.save();
//     }

//     // You might also want to update the PrimaryAvailableStock (if it's used as a backup)
//     const primaryAvailableStock = await PrimaryAvailableStock.findOne({ productID });
//     if (primaryAvailableStock) {
//       primaryAvailableStock.stock -= soldQuantity;
//       await primaryAvailableStock.save();
//     }

//   } catch (err) {
//     console.error("Error updating sold stock:", err);
//     throw new Error("Error updating sold stock");
//   }
// };

// const addSales = async (req, res) => {

//   try {
//     const sales = req.body;

//     const saleDocs = await Promise.all(
//       sales.map(async (sale) => {

//         const existsAvailableStock = await SecondaryAvailableStock.findOne({
//           warehouseID: sale.warehouseID,
//           productID: sale.productID,
//         });

//         if (!existsAvailableStock || existsAvailableStock?.stock < sale.stockSold) {
//           throw new Error("Stock is not available")
//         }

//         const isExistProduct = await SecondaryProduct.findById(sale.productID)

//         const payload = {
//           userID: sale.userID,
//           ProductID: sale.productID,
//           // StoreID: sale.storeID,
//           StockSold: sale.stockSold,
//           SaleDate: sale.saleDate,
//           SupplierName: sale.supplierName,
//           StoreName: sale.storeName,
//           BrandID: sale.brandID,
//           warehouseID: sale.warehouseID,
//           referenceNo: sale?.referenceNo || ""
//           // TotalSaleAmount: sale.totalSaleAmount,
//         }

//         if (isExistProduct) {
//           const addSalesDetails = new SecondarySales(payload);

//           let salesProduct = await addSalesDetails.save();

//           const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""
//           // Start History Data
//           const productInfo = await SecondaryProduct.findOne({ _id: salesProduct.ProductID })
//           const historyPayload = {
//             productID: salesProduct.ProductID,
//             saleID: salesProduct._id,
//             description: `${productInfo?.name || ""} product sold ${sale?.stockSold ? `(No of sale: ${sale?.stockSold})` : ""}`,
//             type: HISTORY_TYPE.ADD,
//             historyDate: getTimezoneWiseDate(sale.saleDate),
//             createdById: requestby,
//             updatedById: requestby
//           };

//           const { primaryResult, secondaryResult } = await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.ADD);
//           // End History Data

//           // Start update in available stock
//           const availableStockPayload = {
//             warehouseID: sale.warehouseID,
//             productID: sale.productID,
//             stock: existsAvailableStock?.stock - Number(sale.stockSold)
//           }

//           await SecondaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload);
//           await PrimaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload)
//           // End update in available stock

//           salesProduct = { ...salesProduct._doc, HistoryID: secondaryResult?.[0]?._id }
//           await Promise.all([
//             PrimarySales.insertMany([salesProduct]),
//             SecondarySales.updateOne({ _id: new ObjectId(salesProduct._id) }, { HistoryID: secondaryResult?.[0]?._id })
//           ]);
//           soldStock(sale.productID, sale.stockSold);

//           return salesProduct;
//         } else {
//           const addSale = new PrimarySales(payload);
//           addSale
//             .save()
//             .then(async (result) => {
//               soldStock(sale.productID, sale.stockSold);
//               return result
//             })
//             .catch((err) => {
//               res.status(402).send(err);
//             });
//         }
//       })
//     );

//     res.status(200).send(saleDocs);
//   } catch (err) {
//     res.status(500).send({ err, message: err?.message || "" });
//   }
// };

// Get All Sales Data
const getSalesData = async (req, res) => {
  let findAllSalesData;
  const aggregationPiepline = [
    {
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
    // {
    //   $lookup: {
    //     from: 'stores',
    //     localField: 'StoreID',
    //     foreignField: '_id',
    //     as: 'StoreID'
    //   }
    // },
    // {
    //   $unwind: "$StoreID"
    // },
    {
      $project: {
        userID: 1,
        ProductID: 1,
        StoreID: 1,
        BrandID: 1,
        QuantityPurchased: 1,
        StockSold: 1,
        SaleDate: 1,
        warehouseID: 1,
        SupplierName: 1,
        StoreName: 1,
        TotalSaleAmount: 1,
        referenceNo: 1,
        linkedPurchaseId: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1
      }
    },
    { $sort: { _id: -1 } }];
  if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
    findAllSalesData = await PrimarySales.aggregate(aggregationPiepline);
  else
    findAllSalesData = await SecondarySales.aggregate(aggregationPiepline); // -1 for descending;
  res.json(findAllSalesData);
};

// Get total sales amount
const getTotalSalesAmount = async (req, res) => {
  let totalSaleAmount = 0;

  let salesData = []
  if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
    salesData = await PrimarySales.find().lean();
  else
    salesData = await SecondarySales.find().lean();

  if (salesData && salesData?.length > 0)
    salesData.forEach((sale) => {
      totalSaleAmount += sale.TotalSaleAmount;
    })
  res.json({ totalSaleAmount });

}

const getMonthlySales = async (req, res) => {
  try {
    let sales = []
    if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
      sales = await PrimarySales.find().lean();
    else
      sales = await SecondarySales.find().lean();

    // Initialize array with 12 zeros
    const salesAmount = [];
    salesAmount.length = 12;
    salesAmount.fill(0)

    sales.forEach((sale) => {
      const monthIndex = parseInt(sale.SaleDate.split("-")[1]) - 1;

      salesAmount[monthIndex] += sale.TotalSaleAmount;
    });

    res.status(200).json({ salesAmount });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const salePdfDownload = (req, res) => {
  try {
    const payload = {
      title: "Sale Note",
      supplierName: req.body?.SupplierName || "",
      storeName: req.body?.warehouseID?.name || "",
      qty: req.body?.StockSold || "",
      brandName: req.body?.BrandID?.name || "",
      productName: req.body?.ProductID?.name || "",
      referenceNo: req.body?.referenceNo || ""
    }
    generatePDFfromHTML(invoiceBill(payload), res);
  } catch (error) {
    console.log('error in productPdfDownload', error)
  }
}

// Update Selected Sale
const updateSelectedSale = async (req, res) => {
  try {
    // Find the existing sale record by ID
    const findSecondarySale = await SecondarySales.findOne({ _id: new ObjectId(req.body.saleID) });
    if (!findSecondarySale) {
      throw new Error("Sale not found");
    }

    // Find the available stock for the product in the specified warehouse
    const existsAvailableStock = await SecondaryAvailableStock.findOne({
      warehouseID: req.body.warehouseID,
      productID: req.body.productID,
    });
    if (!existsAvailableStock) {
      throw new Error("Available stock not found");
    }

    // Calculate the stock difference and ensure there is sufficient stock available
    if (findSecondarySale?.StockSold !== req.body.stockSold) {
      const stockDifference = req.body.stockSold - findSecondarySale?.StockSold;
      const updatedAvailableStock = existsAvailableStock?.stock + stockDifference;

      if (updatedAvailableStock < 0) {
        throw new Error("Stock is not available");
      }
    }

    // Update the sale record
    const updatedResult = await SecondarySales.findByIdAndUpdate(
      req.body.saleID,
      {
        userID: req.body.userID,
        ProductID: req.body.productID,
        StockSold: req.body.stockSold,
        SaleDate: req.body.saleDate,
        SupplierName: req.body.supplierName,
        StoreName: req.body.storeName,
        BrandID: req.body.brandID,
        warehouseID: req.body.warehouseID,
        referenceNo: req.body?.referenceNo || "",
      },
      { new: true }
    );

    const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : "";

    // Start History Data - Log the update in history
    const productInfo = await SecondaryProduct.findOne({ _id: updatedResult.ProductID });
    const historyPayload = {
      productID: updatedResult.ProductID,
      saleID: updatedResult._id,
      description: `${productInfo?.name || ""} product sale updated (No of sale: ${req.body?.stockSold || 0})`,
      type: HISTORY_TYPE.UPDATE,
      createdById: requestby,
      updatedById: requestby,
      historyDate: getTimezoneWiseDate(req.body.saleDate),
      historyID: updatedResult?.HistoryID || "",
    };

    await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.UPDATE);
    // End History Data

    // Update the available stock based on the new sale
    const stockDifference = (findSecondarySale?.StockSold - req.body.stockSold)
    const availableStockPayload = {
      warehouseID: req.body.warehouseID,
      productID: req.body.productID,
      stock: existsAvailableStock?.stock + stockDifference,
    };

    await SecondaryAvailableStock.findByIdAndUpdate(existsAvailableStock._id, availableStockPayload);
    await PrimaryAvailableStock.findByIdAndUpdate(existsAvailableStock._id, availableStockPayload);

    // Update the sold stock function (adjust stock when sale is updated)
    soldStock(req.body.productID, req.body.stockSold, true, findSecondarySale?.StockSold);

    // Update the sale in the PrimarySales collection
    await PrimarySales.findByIdAndUpdate(req.body.saleID, {
      StockSold: req.body.stockSold,
      SaleDate: req.body.saleDate,
      referenceNo: req.body?.referenceNo || "",
    });

    // Return the updated sale record
    res.json(updatedResult);
  } catch (error) {
    res.status(500).send({ error, message: error?.message || "An error occurred" });
  }
};


// const updateSelectedSale = async (req, res) => {
//   try {

//     const findSecondarySale = await SecondarySales.findByIdAndUpdate(
//       { _id: req.body.saleID });


//     const existsAvailableStock = await SecondaryAvailableStock.findOne({
//       warehouseID: req.body.warehouseID,
//       productID: req.body.productID,
//     });



//     // if (findSecondarySale?.StockSold !== req.body.stockSold) {
//     //   throw new Error("Stock is not available")
//     // } else
//     if (findSecondarySale?.StockSold !== req.body.stockSold && (!existsAvailableStock)) {
//       throw new Error("Stock is not available")
//     } else if (findSecondarySale?.StockSold !== req.body.stockSold && findSecondarySale?.StockSold < req.body.stockSold) {
//       const requestedStock = findSecondarySale?.StockSold - req.body.stockSold
//       const checkExistingData = existsAvailableStock?.stock + requestedStock
//       if (checkExistingData < 0) {
//         throw new Error("Stock is not available")
//       }
//     }

//     const updatedResult = await SecondarySales.findByIdAndUpdate(
//       { _id: req.body.saleID },
//       {
//         userID: req.body.userID,
//         ProductID: req.body.productID,
//         StockSold: req.body.stockSold,
//         SaleDate: req.body.saleDate,
//         SupplierName: req.body.supplierName,
//         StoreName: req.body.storeName,
//         BrandID: req.body.brandID,
//         warehouseID: req.body.warehouseID,
//         referenceNo: req.body?.referenceNo || ""
//       },
//       { new: true }
//     );

//     const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""

//     // Start History Data
//     const productInfo = await SecondaryProduct.findOne({ _id: updatedResult.ProductID })
//     const historyPayload = {
//       productID: updatedResult.ProductID,
//       saleID: updatedResult._id,
//       description: `${productInfo?.name || ""} product sales updated ${req.body?.stockSold ? `(No of sale: ${req.body?.stockSold})` : ""}`,
//       type: HISTORY_TYPE.UPDATE,
//       createdById: requestby,
//       updatedById: requestby,
//       historyDate: getTimezoneWiseDate(req.body.saleDate),
//       historyID: updatedResult?.HistoryID || ""
//     };

//     await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.UPDATE);
//     // End History Data

//     // Start update in available stock

//     const updatedAvailableStock = (findSecondarySale?.StockSold - req.body.stockSold)
//     const availableStockPayload = {
//       warehouseID: req.body.warehouseID,
//       productID: req.body.productID,
//       stock: existsAvailableStock?.stock + updatedAvailableStock
//     }

//     await SecondaryAvailableStock.findByIdAndUpdate(
//       { _id: existsAvailableStock._id }, availableStockPayload)
//     await PrimaryAvailableStock.findByIdAndUpdate(
//       { _id: existsAvailableStock._id }, availableStockPayload)

//     soldStock(req.body.productID, req.body.stockSold, true, findSecondarySale?.StockSold);

//     // End update in available stock

//     await PrimarySales.findByIdAndUpdate({ _id: req.body.saleID }, {
//       StockSold: req.body.stockSold,
//       SaleDate: req.body.saleDate,
//       referenceNo: req.body?.referenceNo || ""
//     })
//     res.json(updatedResult);
//   } catch (error) {
//     res.status(500).send({ error, message: error?.message || "" });
//   }
// };

const saleMultileItemsPdfDownload = async (req, res) => {
  try {
    const sales = req.body;

    const payload = {
      title: "Sale Note",
      supplierName: req.body?.[0]?.supplierName || "",
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
      sales.map(async (sale) => {
        const aggregationPiepline = [
          {
            $match: {
              _id: new ObjectId(sale.productID)
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
          payload.qty.push(sale.stockSold || "")
          payload.brandName.push(productInfos[0]?.BrandID?.name || "")
        }
      }));
    generatePDFfromHTML(invoiceBillMultipleItems(payload), res);
  } catch (error) {
    console.log('error in salePdfDownload', error)
  }
}

module.exports = { addSales, getMonthlySales, getSalesData, getTotalSalesAmount, salePdfDownload, saleMultileItemsPdfDownload, updateSelectedSale };
