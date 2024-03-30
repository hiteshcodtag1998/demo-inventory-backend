const { PrimaryHistory, SecondaryHistory } = require("../models/history");
const { ROLES, HISTORY_TYPE, METHODS } = require("../utils/constant");

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

    const pipeline = [
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
        { $sort: { _id: -1 } }
    ];

    if (req?.headers?.role === ROLES.SUPER_ADMIN)
        findAllHistory = await PrimaryHistory.aggregate(pipeline);
    else
        findAllHistory = await SecondaryHistory.aggregate(pipeline);
    res.json(findAllHistory);
};

// Delete Selected History
const deleteSelectedHistory = async (req, res) => {
    const deleteProduct = await SecondaryHistory.deleteOne(
        { _id: req.params.id }
    ).then(async () => {
        await PrimaryHistory.findByIdAndUpdate(req.params.id, { isActive: false }).catch(() => {
            console.log('Primary product error')
        })
    });

    const deletePurchaseProduct = await SecondaryPurchase.deleteOne(
        { ProductID: req.params.id }
    ).then(async () => {
        await PrimaryPurchase.findByIdAndUpdate({ ProductID: req.params.id }, { isActive: false }).catch(() => {
            console.log('Primary purchase error')
        })
    });

    const deleteSaleProduct = await SecondarySales.deleteOne(
        { ProductID: req.params.id }
    ).then(async () => {
        await PrimarySales.findByIdAndUpdate({ ProductID: req.params.id }, { isActive: false }).catch(() => {
            console.log('Primary sales error')
        })
    });

    res.json({
        deleteProduct,
        deletePurchaseProduct, deleteSaleProduct
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
