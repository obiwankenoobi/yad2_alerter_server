const  redis = require('redis')
const bluebird = require('bluebird')
bluebird.promisifyAll(redis)
client = redis.createClient()

function addRedis(fn, redis, ...args) {
  return fn(redis, ...args)
}


module.exports = { client, addRedis }