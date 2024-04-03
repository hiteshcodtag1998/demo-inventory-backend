const express = require("express");
const { main } = require("./models/index");
const roleRoute = require("./router/role");
const userRoute = require("./router/user");
const productRoute = require("./router/product");
const storeRoute = require("./router/store");
const purchaseRoute = require("./router/purchase");
const salesRoute = require("./router/sales");
const historyRoute = require("./router/history");
const brandRoute = require("./router/brand");
const warehouseRoute = require("./router/warehouse")
const writeOffRoute = require("./router/writeOff")
const transferStockRoute = require("./router/transferStock")
const cors = require("cors");
const { PrimaryUser, SecondaryUser } = require("./models/users");
const Product = require("./models/product");

const app = express();
const PORT = 8888;
main();
app.use(express.json());
app.use(cors());
console.log('Test')

// Role API
app.use("/api/role", roleRoute);

// Role API
app.use("/api/user", userRoute);

// Store API
app.use("/api/store", storeRoute);

// Products API
app.use("/api/product", productRoute);

// Purchase API
app.use("/api/purchase", purchaseRoute);

// Sales API
app.use("/api/sales", salesRoute);

// History API
app.use("/api/history", historyRoute);

// Brand API
app.use("/api/brand", brandRoute);

// Brand API
app.use("/api/warehouse", warehouseRoute);

// WriteOff API
app.use("/api/writeoff", writeOffRoute);

// TransferStock API
app.use("/api/transferstock", transferStockRoute);

// ------------- Signin --------------
let userAuthCheck;
app.post("/api/login", async (req, res) => {
  // res.send("hi");
  try {
    let user = null;
    // const user = await SecondaryUser.findOne({
    //   email: req.body.email,
    //   password: req.body.password,
    // })

    // .populate("roleID")
    // .select("firstName lastName email roleID createdAt").lean();
    const pipeline = [{
      $match: {
        email: req.body.email,
        password: req.body.password,
      },
    }, {
      $lookup: {
        from: 'roles',
        localField: 'roleID',
        foreignField: '_id',
        as: 'roleID'
      }
    },
    {
      $unwind: "$roleID"
    },
    {
      $project: {
        email: 1,
        roleID: 1,
        firstName: 1,
        lastName: 1
      }
    }
    ];
    user = await SecondaryUser.aggregate(pipeline);

    if (user?.length === 0) {
      user = await PrimaryUser.aggregate(pipeline);
    }

    if (user?.length > 0) {
      const newUser = user?.length > 0 ? user[0] : {}
      res.send(newUser);
      userAuthCheck = newUser;
    } else {
      res.status(401).send("Invalid Credentials");
      userAuthCheck = null;
    }
  } catch (error) {
    res.send(error);
  }
});

// Getting User Details of login user
app.get("/api/login", (req, res) => {
  res.send(userAuthCheck);
});
// ------------------------------------

// Registration API
app.post("/api/register", (req, res) => {
  let registerUser = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    phoneNumber: req.body.phoneNumber,
    imageUrl: req.body.imageUrl,
  });

  registerUser
    .save()
    .then((result) => {
      res.status(200).send(result);
      alert("Signup Successfull");
    })
    .catch((err) => console.log("Signup: "));
});


app.get("/testget", async (req, res) => {
  const result = await Product.findOne({ _id: '6429979b2e5434138eda1564' })
  res.json(result)

})

// Here we are listening to the server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
