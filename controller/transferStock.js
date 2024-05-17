const { PrimaryTransferStock, SecondaryTransferStock } = require("../models/transferStock");
const { PrimaryAvailableStock, SecondaryAvailableStock } = require("../models/availableStock");
const { ObjectId } = require('mongodb');
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const { ROLES, HISTORY_TYPE, METHODS } = require("../utils/constant");
const { SecondaryProduct } = require("../models/product");
const { addHistoryData } = require("./history");
const moment = require("moment");

// Add TransferStock Details
const addTransferStock = async (req, res) => {
    try {

        const product = req.body;

        const existsAvailableStock = await SecondaryAvailableStock.findOne({
            warehouseID: req.body.fromWarehouseID,
            productID: req.body.productID,
        });

        if (!existsAvailableStock || existsAvailableStock?.stock < product.quantityPurchased) {
            throw new Error("Stock is not available")
        }

        const availableStockPayload = {
            warehouseID: product.toWarehouseID,
            productID: product.productID,
            stock: product.quantityPurchased
        }

        const stocksRes = await SecondaryAvailableStock.insertMany([availableStockPayload]);
        await PrimaryAvailableStock.insertMany(stocksRes)

        await SecondaryAvailableStock.findOneAndUpdate(new ObjectId(existsAvailableStock?._id), { $inc: { stock: -product.quantityPurchased } })
        await PrimaryAvailableStock.findOneAndUpdate(new ObjectId(existsAvailableStock?._id), { $inc: { stock: -product.quantityPurchased } })

        const addTransferStockDetails = new SecondaryTransferStock({
            userID: req.body.userID,
            productID: req.body.productID,
            quantity: req.body.quantityPurchased,
            fromWarehouseID: req.body.fromWarehouseID,
            toWarehouseID: req.body.toWarehouseID,
            transferDate: req.body.purchaseDate,
            brandID: req.body.brandID,
            // TotalPurchaseAmount: req.body.totalPurchaseAmount,
            // SupplierName: req.body.supplierName,
            // StoreName: req.body.storeName,
            // SendinLocation: req.body.sendingLocation,
            // ReceivingLocation: req.body.receivingLocation
        });

        const transferData = await addTransferStockDetails
            .save()
        // .then(async (result) => {
        //     await PrimaryTransferStock.insertMany([result]).catch(err => console.log('Err', err))
        //     // purchaseStock(req.body.productID, req.body.quantityPurchased);
        //     res.status(200).send(result);
        // })
        // .catch((err) => {
        //     res.status(402).send(err);
        // });

        const requestby = req?.headers?.requestby ? new ObjectId(req.headers.requestby) : ""
        // Start History Data
        const productInfo = await SecondaryProduct.findOne({ _id: transferData.productID })
        const historyPayload = {
            productID: transferData.productID,
            saleID: transferData._id,
            description: `${productInfo?.name || ""} product transfer ${req.body.quantityPurchased ? `(No of transfer product: ${req.body.quantityPurchased})` : ""}`,
            type: HISTORY_TYPE.ADD,
            historyDate: moment(req.body.purchaseDate, "YYYY-MM-DD").valueOf(),
            createdById: requestby,
            updatedById: requestby
        };

        await addHistoryData(historyPayload, req?.headers?.role, null, METHODS.ADD);
        // End History Data
        await PrimaryTransferStock.insertMany([transferData]).catch(err => console.log('Err', err))

        res.status(200).send(transferData);
    } catch (err) {
        console.log('err', err)
        res.status(500).send({ err, message: err?.message || "" });
    }
};

// Get All TransferStock Product Data
const getTransferStockData = async (req, res) => {

    let findAllWriteOffData;
    const aggregationPiepline = [{
        $lookup: {
            from: 'products',
            localField: 'productID',
            foreignField: '_id',
            as: 'productID'
        }
    },
    {
        $unwind: "$productID"
    },
    {
        $lookup: {
            from: 'warehouses',
            localField: 'fromWarehouseID',
            foreignField: '_id',
            as: 'fromWarehouseID'
        }
    },
    {
        $unwind: "$fromWarehouseID"
    },
    {
        $lookup: {
            from: 'warehouses',
            localField: 'toWarehouseID',
            foreignField: '_id',
            as: 'toWarehouseID'
        }
    },
    {
        $unwind: "$toWarehouseID"
    },
    {
        $lookup: {
            from: 'brands',
            localField: 'brandID',
            foreignField: '_id',
            as: 'brandID'
        }
    },
    {
        $unwind: {
            path: "$brandID",
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
            productID: 1,
            quantity: 1,
            PurchaseDate: 1,
            fromWarehouseID: 1,
            toWarehouseID: 1,
            brandID: 1,
            transferDate: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1
        }
    }];
    if (req?.headers?.role === ROLES.SUPER_ADMIN)
        findAllWriteOffData = await PrimaryTransferStock.aggregate(aggregationPiepline);
    else
        findAllWriteOffData = await SecondaryTransferStock.aggregate(aggregationPiepline); // -1 for descending;
    res.json(findAllWriteOffData);
};

// Get total purchase amount
const getTotalPurchaseAmount = async (req, res) => {
    let totalPurchaseAmount = 0;

    if (req?.headers?.role === ROLES.SUPER_ADMIN) {
        const purchaseData = await PrimaryTransferStock.find();
        purchaseData.forEach((purchase) => {
            totalPurchaseAmount += purchase.TotalPurchaseAmount;
        });
    }
    else {
        const purchaseData = await SecondaryTransferStock.find();
        purchaseData.forEach((purchase) => {
            totalPurchaseAmount += purchase.TotalPurchaseAmount;
        });
    }
    res.json({ totalPurchaseAmount });
};

const transferStockPdfDownload = (req, res) => {
    try {
        const payload = {
            title: "Transfer Stock Note",
            supplierName: req.body?.SupplierName || "",
            storeName: req.body?.warehouseID?.name || "",
            qty: req.body?.quantity || "",
            brandName: req.body?.brandID?.name || "",
            productName: req.body?.productID?.name || "",
            referenceNo: req.body?.referenceNo || "",
            fromWarehouse: req.body?.fromWarehouseID?.name || "",
            toWarehouse: req.body?.toWarehouseID?.name || ""
        }
        generatePDFfromHTML(invoiceBill(payload), res);
    } catch (error) {
        console.log('error in productPdfDownload', error)
    }
}

module.exports = { addTransferStock, getTransferStockData, getTotalPurchaseAmount, transferStockPdfDownload };
