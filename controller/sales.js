const { PrimarySales, SecondarySales } = require("../models/sales");
const soldStock = require("../controller/soldStock");
const ROLES = require("../utils/constant");
const { SecondaryProduct } = require("../models/Product");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");

// Add Sales
const addSales = async (req, res) => {

  try {
    const sales = req.body;

    const saleDocs = await Promise.all(
      sales.map(async (sale) => {

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
          referenceNo: sale?.referenceNo || ""
          // TotalSaleAmount: sale.totalSaleAmount,
        }

        if (isExistProduct) {
          const addSalesDetails = new SecondarySales(payload);

          const salesProduct = await addSalesDetails.save();

          await PrimarySales.insertMany([salesProduct]).catch(err => console.log('Err', err))
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
    res.status(402).send(err);
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
        QuantityPurchased: 1,
        StockSold: 1,
        SaleDate: 1,
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
      storeName: req.body?.StoreName || "",
      qty: req.body?.StockSold || "",
      productName: req.body?.ProductID?.name || "",
      referenceNo: req.body?.referenceNo || ""
    }
    generatePDFfromHTML(invoiceBill(payload), res);
  } catch (error) {
    console.log('error in productPdfDownload', error)
  }
}



module.exports = { addSales, getMonthlySales, getSalesData, getTotalSalesAmount, salePdfDownload };
