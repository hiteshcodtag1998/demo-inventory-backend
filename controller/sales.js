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
          throw new Error("Stock is not available")
        }

        const isExistProduct = await SecondaryProduct.findById(sale.productID)

        const payload = {
          userID: sale.userID,
          ProductID: sale.productID,
          // StoreID: sale.storeID,
          StockSold: sale.stockSold,
          SaleDate: sale.saleDate,
          SupplierName: sale.supplierName,
          StoreName: sale.storeName,
          BrandID: sale.brandID,
          warehouseID: sale.warehouseID,
          referenceNo: sale?.referenceNo || ""
          // TotalSaleAmount: sale.totalSaleAmount,
        }

        if (isExistProduct) {
          const addSalesDetails = new SecondarySales(payload);

          let salesProduct = await addSalesDetails.save();

          const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""
          // Start History Data
          const productInfo = await SecondaryProduct.findOne({ _id: salesProduct.ProductID })
          const historyPayload = {
            productID: salesProduct.ProductID,
            saleID: salesProduct._id,
            description: `${productInfo?.name || ""} product sold ${sale?.stockSold ? `(No of sale: ${sale?.stockSold})` : ""}`,
            type: HISTORY_TYPE.ADD,
            createdById: requestby,
            updatedById: requestby
          };

          const { primaryResult, secondaryResult } = await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.ADD);
          // End History Data

          // Start update in available stock
          const availableStockPayload = {
            warehouseID: sale.warehouseID,
            productID: sale.productID,
            stock: existsAvailableStock?.stock - Number(sale.stockSold)
          }

          await SecondaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload);
          await PrimaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload)
          // End update in available stock

          salesProduct = { ...salesProduct._doc, HistoryID: secondaryResult?.[0]?._id }
          await Promise.all([
            PrimarySales.insertMany([salesProduct]),
            SecondarySales.updateOne({ _id: new ObjectId(salesProduct._id) }, { HistoryID: secondaryResult?.[0]?._id })
          ]);
          soldStock(sale.productID, sale.stockSold);

          return salesProduct;
        } else {
          const addSale = new PrimarySales(payload);
          addSale
            .save()
            .then(async (result) => {
              soldStock(sale.productID, sale.stockSold);
              return result
            })
            .catch((err) => {
              res.status(402).send(err);
            });
        }
      })
    );

    res.status(200).send(saleDocs);
  } catch (err) {
    res.status(500).send({ err, message: err?.message || "" });
  }
};

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
        isActive: 1,
        createdAt: 1,
        updatedAt: 1
      }
    },
    { $sort: { _id: -1 } }];
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    findAllSalesData = await PrimarySales.aggregate(aggregationPiepline);
  else
    findAllSalesData = await SecondarySales.aggregate(aggregationPiepline); // -1 for descending;
  res.json(findAllSalesData);
};

// Get total sales amount
const getTotalSalesAmount = async (req, res) => {
  let totalSaleAmount = 0;

  let salesData = []
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    salesData = await PrimarySales.find();
  else
    salesData = await SecondarySales.find();


  salesData.forEach((sale) => {
    totalSaleAmount += sale.TotalSaleAmount;
  })
  res.json({ totalSaleAmount });

}

const getMonthlySales = async (req, res) => {
  try {
    let sales = []
    if (req?.headers?.role === ROLES.SUPER_ADMIN)
      sales = await PrimarySales.find();
    else
      sales = await SecondarySales.find();

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
    console.error(err);
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
    const existsAvailableStock = await SecondaryAvailableStock.findOne({
      warehouseID: req.body.warehouseID,
      productID: req.body.productID,
    });

    if (!existsAvailableStock || existsAvailableStock?.stock < req.body.stockSold) {
      throw new Error("Stock is not available")
    }

    const updatedResult = await SecondarySales.findByIdAndUpdate(
      { _id: req.body.saleID },
      {
        userID: req.body.userID,
        ProductID: req.body.productID,
        StockSold: req.body.stockSold,
        SaleDate: req.body.saleDate,
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
      saleID: updatedResult._id,
      description: `${productInfo?.name || ""} product sales updated ${req.body?.stockSold ? `(No of sale: ${req.body?.stockSold})` : ""}`,
      type: HISTORY_TYPE.UPDATE,
      createdById: requestby,
      updatedById: requestby,
      historyID: updatedResult?.HistoryID || ""
    };

    await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.UPDATE);
    // End History Data

    // Start update in available stock

    const availableStockPayload = {
      warehouseID: req.body.warehouseID,
      productID: req.body.productID,
      stock: req.body.stockSold
    }

    await SecondaryAvailableStock.findByIdAndUpdate(
      { _id: existsAvailableStock._id }, availableStockPayload)
    await PrimaryAvailableStock.findByIdAndUpdate(
      { _id: existsAvailableStock._id }, availableStockPayload)

    soldStock(req.body.productID, req.body.stockSold);

    // End update in available stock

    await PrimarySales.findByIdAndUpdate({ _id: req.body.saleID }, {
      StockSold: req.body.stockSold,
      SaleDate: req.body.saleDate,
      referenceNo: req.body?.referenceNo || ""
    })
    res.json(updatedResult);
  } catch (error) {
    res.status(500).send({ error, message: error?.message || "" });
  }
};

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
