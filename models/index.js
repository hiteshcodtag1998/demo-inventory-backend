const mongoose = require("mongoose");
// const uri = "mongodb://localhost:27017/demo-inventory?readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=false";

const MONGO_URI =
    'mongodb://localhost:27017/demo-inventory-primary?readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=false'
const MOBILE_URI =
    'mongodb://localhost:27017/demo-inventory-secondary?readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=false'

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