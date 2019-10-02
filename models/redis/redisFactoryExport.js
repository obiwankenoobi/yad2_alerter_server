const { client } = require('./redisClient')
const RedisFactory = require('../redis/redisFactory')

const redisFactory = new RedisFactory(client)

module.exports = {
  getSearchResultsHashFromRedis: redisFactory.getSearchResultsHashFromRedis.bind(redisFactory),
  addSearchResultHashToRedis: redisFactory.addSearchResultHashToRedis.bind(redisFactory),
  getHashes: redisFactory.getHashes.bind(redisFactory),
  updateAlertInRedis: redisFactory.updateAlertInRedis.bind(redisFactory),
  addRedis: redisFactory.addRedis.bind(redisFactory),
  getValue: redisFactory.getValue.bind(redisFactory)
}