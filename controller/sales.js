const { PrimarySales, SecondarySales } = require("../models/sales");
const soldStock = require("../controller/soldStock");
const ROLES = require("../utils/constant");

// Add Sales
const addSales = (req, res) => {
  const addSale = new SecondarySales({
    userID: req.body.userID,
    ProductID: req.body.productID,
    StoreID: req.body.storeID,
    StockSold: req.body.stockSold,
    SaleDate: req.body.saleDate,
    TotalSaleAmount: req.body.totalSaleAmount,
  });

  addSale
    .save()
    .then(async (result) => {
      await PrimarySales.insertMany([result]).catch(err => console.log('Err', err))
      soldStock(req.body.productID, req.body.stockSold);
      res.status(200).send(result);
    })
    .catch((err) => {
      res.status(402).send(err);
    });
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
        from: 'stores',
        localField: 'StoreID',
        foreignField: '_id',
        as: 'StoreID'
      }
    },
    {
      $unwind: "$StoreID"
    },
    {
      $project: {
        userID: 1,
        ProductID: 1,
        StoreID: 1,
        QuantityPurchased: 1,
        StockSold: 1,
        SaleDate: 1,
        TotalSaleAmount: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1
      }
    }];
  if (req?.headers?.role === ROLES.SUPER_ADMIN)
    findAllSalesData = await PrimarySales.aggregate(aggregationPiepline);
  else
    findAllSalesData = await SecondarySales.aggregate(aggregationPiepline); // -1 for descending;
  res.json(findAllSalesData);
};

// Get total sales amount
const getTotalSalesAmount = async (req, res) => {
  let totalSaleAmount = 0;
  const salesData = await SecondarySales.find();
  salesData.forEach((sale) => {
    totalSaleAmount += sale.TotalSaleAmount;
  })
  res.json({ totalSaleAmount });

}

const getMonthlySales = async (req, res) => {
  try {
    const sales = await SecondarySales.find();

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



module.exports = { addSales, getMonthlySales, getSalesData, getTotalSalesAmount };
