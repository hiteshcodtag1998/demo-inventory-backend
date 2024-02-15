const { PrimaryHistory, SecondaryHistory } = require("../models/history");
const ROLES = require("../utils/constant");

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
    let findAllProducts;

    if (req?.headers?.role === ROLES.SUPER_ADMIN)
        findAllProducts = await PrimaryHistory.find(req.body).sort({ _id: -1 });
    else
        findAllProducts = await SecondaryHistory.find(req.body).sort({ _id: -1 }); // -1 for descending;
    res.json(findAllProducts);
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

const addHistoryData = async (data) => {
    const addHistory = new SecondaryHistory(data);

    return await addHistory
        .save()
        .then(async (result) => {
            await PrimaryHistory.insertMany([result]).catch(err => console.log('Err', err))
            return result;
        })
        .catch((err) => err);
}

module.exports = {
    addHistoryData,
    addHistory,
    getAllHistory,
    deleteSelectedHistory,
    updateSelectedHistory
};
