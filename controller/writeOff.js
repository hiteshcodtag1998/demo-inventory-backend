const { PrimaryWriteOff, SecondaryWriteOff } = require("../models/writeOff");
const ROLES = require("../utils/constant");
const purchaseStock = require("./purchaseStock");

// Add Purchase Details
const addWriteOff = (req, res) => {
    const addPurchaseDetails = new SecondaryWriteOff({
        userID: req.body.userID,
        ProductID: req.body.productID,
        QuantityPurchased: req.body.quantityPurchased,
        PurchaseDate: req.body.purchaseDate,
        // TotalPurchaseAmount: req.body.totalPurchaseAmount,
        SupplierName: req.body.supplierName,
        StoreName: req.body.storeName,
        BrandID: req.body.brandID
    });

    addPurchaseDetails
        .save()
        .then(async (result) => {
            await PrimaryWriteOff.insertMany([result]).catch(err => console.log('Err', err))
            purchaseStock(req.body.productID, req.body.quantityPurchased);
            res.status(200).send(result);
        })
        .catch((err) => {
            res.status(402).send(err);
        });
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
            isActive: 1,
            createdAt: 1,
            updatedAt: 1
        }
    }];
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

module.exports = { addWriteOff, getWriteOffData, getTotalPurchaseAmount };
