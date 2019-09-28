const  redis = require('redis')
const bluebird = require('bluebird')
bluebird.promisifyAll(redis)
client = redis.createClient('redis://cache:6379')

/**
 * a function that injects redis into it to use in its scope
 * @param {Function} fn function to inject redis into
 * @param {Redis} redis instance of redis
 * @param  {...any} args arguments to pass into the fuunction
 */
function addRedis(fn, redis, ...args) {
  return fn(redis, ...args)
}


module.exports = { client, addRedis }