const  redis = require('redis')
const bluebird = require('bluebird')
bluebird.promisifyAll(redis)
let client;
if (process.env.REDISTOGO_URL) {
  const rtg = require("url").parse(process.env.REDISTOGO_URL);
  client = redis.createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(":")[1]);
} else {
  client = redis.createClient('redis://cache:6379')
}
//client = redis.createClient('redis://cache:6379')
module.exports = { client }