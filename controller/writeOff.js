const { SecondaryProduct } = require("../models/product");
const { PrimaryWriteOff, SecondaryWriteOff } = require("../models/writeOff");
const { ROLES, HISTORY_TYPE, METHODS } = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const { addHistoryData } = require("./history");
// const purchaseStock = require("./purchaseStock");
const soldStock = require("./soldStock");
const { SecondaryAvailableStock, PrimaryAvailableStock } = require("../models/availableStock");
const { ObjectId } = require('mongodb');
const moment = require("moment-timezone");
const { getTimezoneWiseDate } = require("../utils/handler");

// Add Purchase Details
const addWriteOff = async (req, res) => {

    try {
        const writeOffs = req.body;
        const saleDocs = await Promise.all(
            writeOffs.map(async (sale) => {

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
                    referenceNo: sale?.referenceNo || "",
                    reason: sale?.reason || ""
                    // TotalSaleAmount: sale.totalSaleAmount,
                }

                if (isExistProduct) {
                    const addSalesDetails = new SecondaryWriteOff(payload);

                    let salesProduct = await addSalesDetails.save();

                    const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""
                    // Start History Data
                    const productInfo = await SecondaryProduct.findOne({ _id: salesProduct.ProductID })
                    const historyPayload = {
                        productID: salesProduct.ProductID,
                        writeOffID: salesProduct._id,
                        description: `${productInfo?.name || ""} product writeoff ${sale?.stockSold ? `(No of writeoff: ${sale?.stockSold})` : ""}`,
                        type: HISTORY_TYPE.ADD,
                        historyDate: getTimezoneWiseDate(sale.saleDate),
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
                        PrimaryWriteOff.insertMany([salesProduct]),
                        SecondaryWriteOff.updateOne({ _id: new ObjectId(salesProduct._id) }, { HistoryID: secondaryResult?.[0]?._id })
                    ]);
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
            reason: 1,
            TotalSaleAmount: 1,
            warehouseID: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1
        }
    },
    { $sort: { _id: -1 } }];
    if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
        findAllWriteOffData = await PrimaryWriteOff.aggregate(aggregationPiepline);
    else
        findAllWriteOffData = await SecondaryWriteOff.aggregate(aggregationPiepline); // -1 for descending;
    res.json(findAllWriteOffData);
};

// Get total purchase amount
const getTotalPurchaseAmount = async (req, res) => {
    let totalPurchaseAmount = 0;

    if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN) {
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
            storeName: req.body?.warehouseID?.name || "",
            qty: req.body?.StockSold || "",
            brandName: req.body?.BrandID?.name || "",
            productName: req.body?.ProductID?.name || "",
            reason: req.body?.reason
        }
        generatePDFfromHTML(invoiceBill(payload), res);
    } catch (error) {
        console.log('error in productPdfDownload', error)
    }
};

// Update Selected WriteOff
const updateSelectedWriteOff = async (req, res) => {
    try {
        const findSecondarySale = await SecondaryWriteOff.findByIdAndUpdate(
            { _id: req.body.writeOffID });

        const existsAvailableStock = await SecondaryAvailableStock.findOne({
            warehouseID: req.body.warehouseID,
            productID: req.body.productID,
        });

        const beforeWriteOffData = await SecondaryWriteOff.findOne({ _id: req.body.writeOffID });

        if (findSecondarySale?.StockSold !== req.body.stockSold && (!existsAvailableStock)) {
            throw new Error("Stock is not available")
        } else if (findSecondarySale?.StockSold !== req.body.stockSold && findSecondarySale?.StockSold < req.body.stockSold) {
            const requestedStock = findSecondarySale?.StockSold - req.body.stockSold
            const checkExistingData = existsAvailableStock?.stock + requestedStock
            if (checkExistingData < 0) {
                throw new Error("Stock is not available")
            }
        }

        // if (findSecondarySale?.StockSold !== req.body.stockSold && (!existsAvailableStock || existsAvailableStock?.stock < req.body.stockSold)) {
        //     throw new Error("Stock is not available")
        // }

        const updatedResult = await SecondaryWriteOff.findByIdAndUpdate(
            { _id: req.body.writeOffID },
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
            writeOffID: updatedResult._id,
            createdById: requestby,
            updatedById: requestby,
            historyID: updatedResult?.HistoryID || "",
            historyDate: getTimezoneWiseDate(req.body.saleDate),
            description: `${productInfo?.name || ""} product writeOff added ${req.body?.stockSold ? `(No of sale: ${req.body?.stockSold})` : ""}`,
            type: HISTORY_TYPE.UPDATE,
        };

        await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.UPDATE);
        // End History Data

        // Start update in available stock
        const availableStockPayload = {
            warehouseID: req.body.warehouseID,
            productID: req.body.productID,
            stock: (existsAvailableStock?.stock - Number(req.body.stockSold)) + beforeWriteOffData?.StockSold
        }

        await SecondaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload);
        await PrimaryAvailableStock.findByIdAndUpdate(new ObjectId(existsAvailableStock?._id), availableStockPayload)
        // End update in available stock

        soldStock(req.body.productID, req.body.stockSold, true, beforeWriteOffData?.StockSold);

        // End update in available stock

        await PrimaryWriteOff.findByIdAndUpdate({ _id: req.body.writeOffID }, {
            StockSold: req.body.stockSold,
            SaleDate: req.body.saleDate,
            referenceNo: req.body?.referenceNo || ""
        })
        res.json(updatedResult);
    } catch (error) {
        res.status(500).send({ error, message: error?.message || "" });
    }
};

const writeOffMultileItemsPdfDownload = async (req, res) => {
    try {
        const writeOffs = req.body;

        const payload = {
            title: "WriteOff Note",
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
            writeOffs.map(async (sale) => {
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
};

module.exports = { addWriteOff, getWriteOffData, getTotalPurchaseAmount, writeOffPdfDownload, writeOffMultileItemsPdfDownload, updateSelectedWriteOff };
