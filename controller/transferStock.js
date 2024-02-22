const { PrimaryTransferStock, SecondaryTransferStock } = require("../models/transferStock");
const ROLES = require("../utils/constant");
const purchaseStock = require("./purchaseStock");

// Add TransferStock Details
const addTransferStock = (req, res) => {
    const addPurchaseDetails = new SecondaryTransferStock({
        userID: req.body.userID,
        ProductID: req.body.productID,
        QuantityPurchased: req.body.quantityPurchased,
        PurchaseDate: req.body.purchaseDate,
        // TotalPurchaseAmount: req.body.totalPurchaseAmount,
        SupplierName: req.body.supplierName,
        StoreName: req.body.storeName,
        BrandID: req.body.brandID,
        SendinLocation: req.body.sendingLocation,
        ReceivingLocation: req.body.receivingLocation
    });

    addPurchaseDetails
        .save()
        .then(async (result) => {
            await PrimaryTransferStock.insertMany([result]).catch(err => console.log('Err', err))
            purchaseStock(req.body.productID, req.body.quantityPurchased);
            res.status(200).send(result);
        })
        .catch((err) => {
            res.status(402).send(err);
        });
};

// Get All TransferStock Product Data
const getTransferStockData = async (req, res) => {

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
            SendinLocation: 1,
            ReceivingLocation: 1,
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
