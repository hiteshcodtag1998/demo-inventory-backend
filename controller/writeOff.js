const { PrimaryWriteOff, SecondaryWriteOff } = require("../models/writeOff");
const ROLES = require("../utils/constant");
const { generatePDFfromHTML } = require("../utils/pdfDownload");
const { invoiceBill } = require("../utils/templates/invoice-bill");
const purchaseStock = require("./purchaseStock");
const soldStock = require("./soldStock");

// Add Purchase Details
const addWriteOff = (req, res) => {
    const addPurchaseDetails = new SecondaryWriteOff({
        userID: req.body.userID,
        ProductID: req.body.productID,
        // StoreID: req.body.storeID,
        StockSold: req.body.stockSold,
        SaleDate: req.body.saleDate,
        SupplierName: req.body.supplierName,
        StoreName: req.body.storeName,
        BrandID: req.body.brandID
    });

    addPurchaseDetails
        .save()
        .then(async (result) => {
            await PrimaryWriteOff.insertMany([result]).catch(err => console.log('Err', err))
            soldStock(req.body.productID, req.body.stockSold);
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
            StockSold: 1,
            SaleDate: 1,
            SupplierName: 1,
            StoreName: 1,
            BrandID: 1,
            TotalSaleAmount: 1,
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

const writeOffPdfDownload = (req, res) => {
    try {
        console.log('req', req.body)
        // Usage
        const payload = {
            supplierName: req.body?.SupplierName || "",
            storeName: req.body?.StoreName || "",
            qty: req.body?.StockSold || "",
            productName: req.body?.ProductID?.name || ""
        }
        generatePDFfromHTML(invoiceBill(payload), res);
    } catch (error) {
        console.log('error in productPdfDownload', error)
    }
}

module.exports = { addWriteOff, getWriteOffData, getTotalPurchaseAmount, writeOffPdfDownload };
