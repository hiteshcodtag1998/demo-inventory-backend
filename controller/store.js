const { PrimaryStore, SecondaryStore } = require("../models/store");
const ROLES = require("../utils/constant");

// Add Store
const addStore = async (req, res) => {
  const addStore = await new SecondaryStore({
    userID: req.body.userId,
    name: req.body.name,
    category: req.body.category,
    address: req.body.address,
    city: req.body.city,
    image: req.body.image
  });

  addStore.save().then(async (result) => {
    await PrimaryStore.insertMany([result]).catch(err => console.log('Err', err))
    res.status(200).send(result);
  })
    .catch((err) => {
      res.status(402).send(err);
    });
};

// Get All Stores
const getAllStores = async (req, res) => {
  let findAllStores;
  if (req?.headers?.role === ROLES.HIDE_MASTER_SUPER_ADMIN)
    findAllStores = await PrimaryStore.find().sort({ _id: -1 });
  else
    findAllStores = await SecondaryStore.find().sort({ _id: -1 }); // -1 for descending;
  res.json(findAllStores);

};

module.exports = { addStore, getAllStores };
