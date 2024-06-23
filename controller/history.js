const { SecondaryAvailableStock, PrimaryAvailableStock } = require("../models/availableStock");
const { PrimaryHistory, SecondaryHistory } = require("../models/history");
const { SecondaryProduct, PrimaryProduct } = require("../models/product");
const { SecondaryPurchase, PrimaryPurchase } = require("../models/purchase");
const { SecondarySales, PrimarySales } = require("../models/sales");
const { SecondaryWriteOff, PrimaryWriteOff } = require("../models/writeOff");
const { ROLES, HISTORY_TYPE, METHODS } = require("../utils/constant");
const { ObjectId } = require('mongodb');

// Add Post History
const addHistory = async (req, res) => {
    try {
        const result = await addHistoryData(req.body)
        res.status(200).send(result);
    } catch (error) {
        res.status(402).send(err);
    }

};

// Get All History
const getAllHistory = async (req, res) => {
    let findAllHistory;
    const filter = { isActive: true };

    // if (req?.headers?.role !== ROLES.SUPER_ADMIN) filter.isActive = false

    const pipeline = [
        {
            $match: filter
        },
        {
            $lookup: {
                from: 'users',
                localField: 'updatedById',
                foreignField: '_id',
                as: 'updatedById'
            }
        },
        {
            $unwind: {
                path: "$updatedById",
                preserveNullAndEmptyArrays: true // Preserve records without matching BrandID
            }
        },
        { $sort: { historyDate: -1 } }
    ];

    if (req?.headers?.role === ROLES.SUPER_ADMIN)
        findAllHistory = await PrimaryHistory.aggregate(pipeline);
    else
        findAllHistory = await SecondaryHistory.aggregate(pipeline);
    res.json(findAllHistory);
};

// Delete Selected History
const deleteSelectedHistory = async (req, res) => {
    const findHistory = await SecondaryHistory.findById(req.params.id).lean();
    console.log('findHistory', findHistory)

    if (findHistory?.productID && !findHistory?.purchaseID && !findHistory?.saleID && !findHistory?.writeOffID) {
        const deleteProduct = await SecondaryProduct.deleteOne(
            { _id: findHistory?.productID }
        ).then(async (result) => {

            await PrimaryProduct.findByIdAndUpdate(findHistory?.productID, { isActive: false }).catch(() => {
                console.log('Primary product error')
            })
        });
    }

    if (findHistory?.purchaseID) {
        const [secondaryPurchaseInfos, primaryPurchaseInfos] = await Promise.all([
            SecondaryPurchase.findOne({ _id: findHistory?.purchaseID }),
            PrimaryPurchase.findOne({ _id: findHistory?.purchaseID })
        ])

        const deletePurchaseProduct = await SecondaryPurchase.deleteOne(
            { _id: findHistory?.purchaseID }
        ).then(async () => {
            const data = await PrimaryPurchase.findOne({ _id: findHistory?.purchaseID })
            console.log('data Primary purchase', data)
            await PrimaryPurchase.findByIdAndUpdate(findHistory?.purchaseID, { isActive: false }).catch((e) => {
                console.log('Primary purchase error', e)
            })
        });

        const secondaryProductData = await SecondaryProduct.findOne({ _id: findHistory?.productID });
        console.log('secondaryProductData', secondaryProductData, secondaryPurchaseInfos)
        let secondaryUpdatedStock = Number(secondaryProductData.stock) - Number(secondaryPurchaseInfos?.QuantityPurchased || 0);

        await SecondaryProduct.findByIdAndUpdate(
            { _id: findHistory?.productID },
            {
                stock: secondaryUpdatedStock,
            },
            { new: true }
        );

        const secondaryAvailableData = await SecondaryAvailableStock.findOne({ productID: findHistory?.productID, warehouseID: secondaryPurchaseInfos?.warehouseID });
        console.log('secondaryProductData', secondaryProductData, secondaryPurchaseInfos)
        let secondaryAvailableStock = Number(secondaryAvailableData.stock) - Number(secondaryPurchaseInfos?.QuantityPurchased || 0);

        await SecondaryAvailableStock.findByIdAndUpdate(
            { _id: secondaryAvailableData?._id },
            {
                stock: secondaryAvailableStock,
            },
            { new: true }
        );

        // Primary Product
        const primaryProductData = await PrimaryProduct.findOne({ _id: findHistory?.productID });
        let primaryUpdatedStock = Number(primaryProductData.stock) - Number(primaryPurchaseInfos?.QuantityPurchased);

        await PrimaryProduct.findByIdAndUpdate(
            { _id: findHistory?.productID },
            {
                stock: primaryUpdatedStock,
            },
            { new: true }
        );

        const primaryAvailableData = await PrimaryAvailableStock.findOne({ productID: findHistory?.productID, warehouseID: primaryPurchaseInfos?.warehouseID });
        console.log('secondaryProductData', secondaryProductData, primaryPurchaseInfos)
        let primaryAvailableStock = Number(primaryAvailableData.stock) - Number(primaryPurchaseInfos?.QuantityPurchased || 0);

        await PrimaryAvailableStock.findByIdAndUpdate(
            { _id: primaryAvailableData?._id },
            {
                stock: primaryAvailableStock,
            },
            { new: true }
        );
    }

    if (findHistory?.saleID) {
        const [secondaryPurchaseInfos, primaryPurchaseInfos] = await Promise.all([
            SecondarySales.findOne({ _id: findHistory?.saleID }),
            PrimarySales.findOne({ _id: findHistory?.saleID })
        ])

        const deleteSaleProduct = await SecondarySales.deleteOne(
            { _id: findHistory?.saleID }
        ).then(async () => {
            await PrimarySales.findByIdAndUpdate(findHistory?.saleID, { isActive: false }).catch(() => {
                console.log('Primary sales error')
            })
        });

        const secondaryProductData = await SecondaryProduct.findOne({ _id: findHistory?.productID });
        console.log('secondaryProductData', secondaryProductData, secondaryPurchaseInfos)
        let secondaryUpdatedStock = Number(secondaryProductData.stock) + Number(secondaryPurchaseInfos?.StockSold || 0);

        await SecondaryProduct.findByIdAndUpdate(
            { _id: findHistory?.productID },
            {
                stock: secondaryUpdatedStock,
            },
            { new: true }
        );

        const secondaryAvailableData = await SecondaryAvailableStock.findOne({ productID: findHistory?.productID, warehouseID: secondaryPurchaseInfos?.warehouseID });
        console.log('secondaryProductData', secondaryProductData, secondaryPurchaseInfos)
        let secondaryAvailableStock = Number(secondaryAvailableData.stock) + Number(secondaryPurchaseInfos?.StockSold || 0);

        await SecondaryAvailableStock.findByIdAndUpdate(
            { _id: secondaryAvailableData?._id },
            {
                stock: secondaryAvailableStock,
            },
            { new: true }
        );

        // Primary Product
        const primaryProductData = await PrimaryProduct.findOne({ _id: findHistory?.productID });
        let primaryUpdatedStock = Number(primaryProductData.stock) + Number(primaryPurchaseInfos?.StockSold);

        await PrimaryProduct.findByIdAndUpdate(
            { _id: findHistory?.productID },
            {
                stock: primaryUpdatedStock,
            },
            { new: true }
        );

        const primaryAvailableData = await PrimaryAvailableStock.findOne({ productID: findHistory?.productID, warehouseID: primaryPurchaseInfos?.warehouseID });
        console.log('secondaryProductData', secondaryProductData, primaryPurchaseInfos)
        let primaryAvailableStock = Number(primaryAvailableData.stock) + Number(primaryPurchaseInfos?.StockSold || 0);

        await PrimaryAvailableStock.findByIdAndUpdate(
            { _id: primaryAvailableData?._id },
            {
                stock: primaryAvailableStock,
            },
            { new: true }
        );
    }

    if (findHistory?.writeOffID) {
        const [secondaryPurchaseInfos, primaryPurchaseInfos] = await Promise.all([
            SecondaryWriteOff.findOne({ _id: findHistory?.writeOffID }),
            PrimaryWriteOff.findOne({ _id: findHistory?.writeOffID })
        ])

        const deleteSaleProduct = await SecondaryWriteOff.deleteOne(
            { _id: findHistory?.writeOffID }
        ).then(async () => {
            await PrimaryWriteOff.findByIdAndUpdate(findHistory?.writeOffID, { isActive: false }).catch(() => {
                console.log('Primary sales error')
            })
        });

        const secondaryProductData = await SecondaryProduct.findOne({ _id: findHistory?.productID });
        console.log('secondaryProductData', secondaryProductData, secondaryPurchaseInfos)
        let secondaryUpdatedStock = Number(secondaryProductData.stock) + Number(secondaryPurchaseInfos?.StockSold || 0);

        await SecondaryProduct.findByIdAndUpdate(
            { _id: findHistory?.productID },
            {
                stock: secondaryUpdatedStock,
            },
            { new: true }
        );

        const secondaryAvailableData = await SecondaryAvailableStock.findOne({ productID: findHistory?.productID, warehouseID: secondaryPurchaseInfos?.warehouseID });
        console.log('secondaryProductData', secondaryProductData, secondaryPurchaseInfos)
        let secondaryAvailableStock = Number(secondaryAvailableData.stock) + Number(secondaryPurchaseInfos?.StockSold || 0);

        await SecondaryAvailableStock.findByIdAndUpdate(
            { _id: secondaryAvailableData?._id },
            {
                stock: secondaryAvailableStock,
            },
            { new: true }
        );

        // Primary Product
        const primaryProductData = await PrimaryProduct.findOne({ _id: findHistory?.productID });
        let primaryUpdatedStock = Number(primaryProductData.stock) + Number(primaryPurchaseInfos?.StockSold);

        await PrimaryProduct.findByIdAndUpdate(
            { _id: findHistory?.productID },
            {
                stock: primaryUpdatedStock,
            },
            { new: true }
        );

        const primaryAvailableData = await PrimaryAvailableStock.findOne({ productID: findHistory?.productID, warehouseID: primaryPurchaseInfos?.warehouseID });
        console.log('secondaryProductData', secondaryProductData, primaryPurchaseInfos)
        let primaryAvailableStock = Number(primaryAvailableData.stock) + Number(primaryPurchaseInfos?.StockSold || 0);

        await PrimaryAvailableStock.findByIdAndUpdate(
            { _id: primaryAvailableData?._id },
            {
                stock: primaryAvailableStock,
            },
            { new: true }
        );
    }

    const deleteHistory = await SecondaryHistory.findByIdAndUpdate(req.params.id,
        { isActive: false }
    ).then(async () => {
        await PrimaryHistory.findByIdAndUpdate(req.params.id, { isActive: false }).catch(() => {
            console.log('Primary product error')
        })
    });

    res.json({
        deleteHistory,
    });
};

// Update Selected History
const updateSelectedHistory = async (req, res) => {
    try {
        const updatedResult = await SecondaryHistory.findByIdAndUpdate(
            { _id: req.body.productID },
            {
                name: req.body.name,
                manufacturer: req.body.manufacturer,
                description: req.body.description,
            },
            { new: true }
        );

        await PrimaryHistory.findByIdAndUpdate({ _id: req.body.productID }, {
            name: req.body.name,
            manufacturer: req.body.manufacturer,
            description: req.body.description,
        })
        res.json(updatedResult);
    } catch (error) {
        res.status(402).send("Error");
    }
};

const addHistoryData = async (data, role = null, type = null, method = null) => {

    try {
        console.log('data', data)
        let secondaryResult = data
        let primaryResult;
        let updatedSecondaryPayload = { ...data }

        if (role === ROLES.SUPER_ADMIN && method && METHODS.ADD !== method) {
            delete updatedSecondaryPayload.createdById
            delete updatedSecondaryPayload.updatedById
        }

        if (method === METHODS.ADD) {
            if (type === HISTORY_TYPE.DELETE) {
                secondaryResult = await SecondaryHistory.insertMany([updatedSecondaryPayload]).catch(err => console.log('Err', err))
                if (role === ROLES.SUPER_ADMIN) {
                    primaryResult = await PrimaryHistory.insertMany([{ ...data, _id: secondaryResult?.[0]?._id }]).catch(err => console.log('Err', err))
                    if (type === HISTORY_TYPE.DELETE) await SecondaryHistory.deleteMany({ productID: secondaryResult?.[0]?.productID })
                }
            } else {
                secondaryResult = await SecondaryHistory.insertMany([updatedSecondaryPayload]).catch(err => console.log('Err', err))
                primaryResult = await PrimaryHistory.insertMany([{ ...data, _id: secondaryResult?.[0]?._id }]).catch(err => console.log('Err', err))
            }
        } else if (method === METHODS.UPDATE) {
            if (type === HISTORY_TYPE.DELETE) {
                secondaryResult = await SecondaryHistory.updateMany({ _id: data?.historyID }, [updatedSecondaryPayload]).catch(err => console.log('Err', err))
                if (role === ROLES.SUPER_ADMIN) {
                    primaryResult = await PrimaryHistory.updateMany({ _id: data?.historyID }, [{ ...data, _id: secondaryResult?.[0]?._id }]).catch(err => console.log('Err', err))
                    if (type === HISTORY_TYPE.DELETE) await SecondaryHistory.deleteMany({ productID: secondaryResult?.[0]?.productID })
                }
            } else {
                secondaryResult = await SecondaryHistory.updateMany({ _id: data?.historyID }, updatedSecondaryPayload).catch(err => console.log('Err', err))
                primaryResult = await PrimaryHistory.updateMany({ _id: data?.historyID }, data).catch(err => console.log('Err', err))
            }
        }

        return { primaryResult, secondaryResult };
    } catch (error) {
        console.log('Err', err)
    }
}

module.exports = {
    addHistoryData,
    addHistory,
    getAllHistory,
    deleteSelectedHistory,
    updateSelectedHistory
};
