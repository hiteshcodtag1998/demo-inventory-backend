const mongoose = require("mongoose");
// const Role = require("./role")
// const User = require("./users")
// const uri = "mongodb://localhost:27017/demo-inventory?readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=false";

const MONGO_URI =
    'mongodb+srv://pateldhyey0101:NyxDeivide8hHOTb@inventorydemo.idu7kr5.mongodb.net/demo-inventory-primary'
const MOBILE_URI =
    'mongodb+srv://pateldhyey0101:NyxDeivide8hHOTb@inventorydemo.idu7kr5.mongodb.net/demo-inventory-secondary'

const main = () => {
    try {
        const primaryDB = mongoose.createConnection(MONGO_URI, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        })
        const secondaryDB = mongoose.createConnection(MOBILE_URI, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        })
        return { primaryDB, secondaryDB }
    } catch (error) {
        console.error(`Error:${error.message}`)
        process.exit(1)
    }
}

module.exports = { main }

// function main() {
//     mongoose.connect(uri).then(() => {
//         console.log("Database connected succesfull")

//     }).catch((err) => {
//         console.log("Error: ", err)
//     })
// }

// module.exports = { main };