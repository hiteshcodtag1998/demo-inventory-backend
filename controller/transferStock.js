const { PrimaryTransferStock, SecondaryTransferStock } = require("../models/transferStock");
const { PrimaryAvailableStock, SecondaryAvailableStock } = require("../models/availableStock");
const ROLES = require("../utils/constant");
const purchaseStock = require("./purchaseStock");
const { ObjectId } = require('mongodb');

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

        const addPurchaseDetails = new SecondaryTransferStock({
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

        addPurchaseDetails
            .save()
            .then(async (result) => {
                await PrimaryTransferStock.insertMany([result]).catch(err => console.log('Err', err))
                // purchaseStock(req.body.productID, req.body.quantityPurchased);
                res.status(200).send(result);
            })
            .catch((err) => {
                res.status(402).send(err);
            });
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

module.exports = { addTransferStock, getTransferStockData, getTotalPurchaseAmount };
