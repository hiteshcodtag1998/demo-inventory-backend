const { SecondaryProduct } = require("../models/Product");
const { PrimaryWriteOff, SecondaryWriteOff } = require("../models/writeOff");
const { ROLES, HISTORY_TYPE } = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const { addHistoryData } = require("./history");
const purchaseStock = require("./purchaseStock");
const soldStock = require("./soldStock");
const { SecondaryAvailableStock, PrimaryAvailableStock } = require("../models/availableStock");
const { ObjectId } = require('mongodb');

// Add Purchase Details
const addWriteOff = async (req, res) => {

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
                    const addSalesDetails = new SecondaryWriteOff(payload);

                    const salesProduct = await addSalesDetails.save();

                    // Start update in available stock
                    const availableStockPayload = {
                        warehouseID: sale.warehouseID,
                        productID: sale.productID,
                        stock: existsAvailableStock?.stock - Number(sale.stockSold)
                    }

                    await SecondaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload);
                    await PrimaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload)
                    // End update in available stock

                    await PrimaryWriteOff.insertMany([salesProduct]).catch(err => console.log('Err', err))
                    soldStock(sale.productID, sale.stockSold);

                    return salesProduct;
                } else {
                    const addSale = new PrimaryWriteOff(payload);
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

// Get All WriteOff Product Data
const getWriteOffData = async (req, res) => {

    let findAllWriteOffData;
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
            StockSold: 1,
            SaleDate: 1,
            SupplierName: 1,
            StoreName: 1,
            BrandID: 1,
            TotalSaleAmount: 1,
            warehouseID: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1
        }
    },
    { $sort: { _id: -1 } }];
    if (req?.headers?.role === ROLES.SUPER_ADMIN)
        findAllWriteOffData = await PrimaryWriteOff.aggregate(aggregationPiepline);
    else
        findAllWriteOffData = await SecondaryWriteOff.aggregate(aggregationPiepline); // -1 for descending;
    res.json(findAllWriteOffData);
};

// Get total purchase amount
const getTotalPurchaseAmount = async (req, res) => {
    let totalPurchaseAmount = 0;

    if (req?.headers?.role === ROLES.SUPER_ADMIN) {
        const purchaseData = await PrimaryWriteOff.find();
        purchaseData.forEach((purchase) => {
            totalPurchaseAmount += purchase.TotalPurchaseAmount;
        });
    }
    else {
        const purchaseData = await SecondaryWriteOff.find();
        purchaseData.forEach((purchase) => {
            totalPurchaseAmount += purchase.TotalPurchaseAmount;
        });
    }
    res.json({ totalPurchaseAmount });
};

const writeOffPdfDownload = (req, res) => {
    try {
        // Usage
        const payload = {
            title: "WriteOff Note",
            supplierName: req.body?.SupplierName || "",
            storeName: req.body?.warehouseID?.name || "",
            qty: req.body?.StockSold || "",
            brandName: req.body?.BrandID?.name || "",
            productName: req.body?.ProductID?.name || ""
        }
        generatePDFfromHTML(invoiceBill(payload), res);
    } catch (error) {
        console.log('error in productPdfDownload', error)
    }
}

module.exports = { addWriteOff, getWriteOffData, getTotalPurchaseAmount, writeOffPdfDownload };
