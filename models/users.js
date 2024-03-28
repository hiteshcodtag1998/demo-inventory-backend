const mongoose = require('mongoose');
const { main } = require("./index");

const UserSchema = new mongoose.Schema({
    firstName: 'String',
    lastName: 'String',
    email: 'String',
    password: 'String',
    phoneNumber: 'Number',
    imageUrl: 'String',
    roleID: {
        type: mongoose.Schema.Types.Mixed,
        ref: "roles",
    },
}, {
    timestamps: true
});


const { primaryDB, secondaryDB } = main()


module.exports = {
    PrimaryUser: primaryDB.model('users', UserSchema),
    SecondaryUser: secondaryDB.model('users', UserSchema)
}


// const User = mongoose.model("users", UserSchema);
// module.exports = User;