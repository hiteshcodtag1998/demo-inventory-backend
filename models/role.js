const mongoose = require('mongoose');
const { main } = require("./index");

const RoleSchema = new mongoose.Schema({
    name: 'String',
}, {
    timestamps: true
});

const { primaryDB, secondaryDB } = main()

module.exports = {
    PrimaryRole: primaryDB.model('roles', RoleSchema),
    SecondaryRole: secondaryDB.model('roles', RoleSchema)
}

// const Role = mongoose.model("roles", RoleSchema);
// module.exports = Role;