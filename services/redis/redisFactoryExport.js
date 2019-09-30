const { client } = require('./redisClient')
const redisFactory = require('../redis/redisFactory')(client)

module.exports = redisFactory