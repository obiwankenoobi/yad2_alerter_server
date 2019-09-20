const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = mongoose.Schema({
  email: {
    type: String,
    index: true,
    unique: true,
    required: true
  },
  alerts: {
    type: Object
  },
  searches: {
    type: Object,
    default:{}
  }
}, { minimize: false });



const User = mongoose.model("yad2_alerts_user", UserSchema);
module.exports = { User };
