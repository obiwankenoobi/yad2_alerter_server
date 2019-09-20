const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const passportLocalMongoose = require("passport-local-mongoose");

const SearchSchema = mongoose.Schema({
  hash: {
    type: String,
    index: true,
    unique: true,
    required: true
  },
  url: {
    type: Object
  },
  searches: {
    type: Object,
    default:{}
  }
}, { minimize: false });



const Search = mongoose.model("yad2_alerts_search", SearchSchema);
module.exports = { Search };
