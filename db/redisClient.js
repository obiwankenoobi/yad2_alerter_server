const  redis = require('redis')
const bluebird = require('bluebird')
bluebird.promisifyAll(redis)
client = redis.createClient()

function addRedis(fn, redis) {
  return fn(redis)
}


module.exports = { client, addRedis }