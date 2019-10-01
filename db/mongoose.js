let MongoClient = require("mongodb").MongoClient;
let mongoose = require("mongoose");

// checking for enviroment var for the mongo server and connect to it if there is one
// if there isnt connect to localhost
let attempts = 0
if (process.env.MONGO_DB_ADDRESS) {
  mongoose
    .connect(process.env.MONGO_DB_ADDRESS, { useNewUrlParser: true })
    .then(() => console.log("connection successful"))
    .catch(err => console.error(err));
} else {
  const url = "mongodb://mongodb:27017/db0";
  connect(url)
}

function connect(url) {
  mongoose.connect(url, { useNewUrlParser: true })
    .then(() => console.log("connection successful"))
    .catch(err => {
      console.error(err)
      attempts++
      if (attempts < 10) connect(url)
    });
}
//@@@@@@@@@@@@@ if you use local host @@@@@@@@@@@@@@@@@
// var url = "mongodb://localhost:27017/db";
// mongoose.connect(url, { useNewUrlParser: true }, console.log('connected to mongo'));
//@@@@@@@@@@@@@ if you use local host @@@@@@@@@@@@@@@@@

//@@@@@@@@@@@@@ if you dont use local host @@@@@@@@@@@@@@@@@
// mongoose.connect(process.env.mongoUrl, {
//     auth: {
//       user: process.env.MONGOֹ_USERNAME,
//       password: process.env.MONGOֹֹֹ_PASSWORD
//     }
//   })
//   .then(() => console.log('connection successful'))
//   .catch((err) => console.error(err));
//@@@@@@@@@@@@@ if you dont use local host @@@@@@@@@@@@@@@@@

mongoose.Promise = global.Promise;

module.exports = {
  mongoose
};
