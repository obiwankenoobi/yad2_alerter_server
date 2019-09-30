const  redis = require('redis')
const bluebird = require('bluebird')
bluebird.promisifyAll(redis)
client = redis.createClient('redis://cache:6379')
module.exports = { client }