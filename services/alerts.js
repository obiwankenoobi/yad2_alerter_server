const jwt = require("jsonwebtoken")
const { User } = require("../db/models/UserSchema")
const stringHash = require("string-hash")
const { createUrl } = require('../utils/utils')
const { addRedis } = require('../db/redisClient')
const { getHashes, getAllUsers } = require('../services/crawler')

/**
 * add new alert to redis and to db
 * @param {Redis} redis instance of redis
 * @param {Object} hashes object of the hashes that already in memory
 * @returns {Function} return function with redis instance in scope
 */
function createAlert(redis, hashes = {}) {
  return function(req, res, next) {
    const { body: { email, alerts } } = req
    return new Promise((resolve, reject) => {
      User.findOne({ email }, async (error, user) => {
        if (error) {
          console.log(error)
          return res.status(500).json({error})
        }
        const links = {}
        for(let alert of alerts) {
          const url = createUrl(alert.neighborhood.value, alert.fromPrice.value, alert.toPrice.value, alert.fromRooms.value, alert.toRooms.value)
          const hash = stringHash(url)
          links[hash] = url
          await updateAlertInRedis(redis, hash, hashes, email, url) 
        }
    
        User.create({email, alerts:links})
        return res.status(200).json({message:'alerts saved'})
      })
    })
  }
}

/**
 * update alert in redis
 * @param {Redis} redis instance of redis
 * @param {String} hash hash of the searhing url
 * @param {Object} hashes object of the hashes that already in memory
 * @param {String} email email of user
 * @param {String} url url of the search 
 */
async function updateAlertInRedis(redis, hash, hashes, email, url) {
  let readyHashes = hashes
  if (!readyHashes) {
    const users = await getAllUsers()
    const hashes = await getHashes(redis, users)
    readyHashes = hashes
  }
  
  if (readyHashes[hash]) {
    readyHashes[hash].emails[email] = true
  } else {
    readyHashes[hash].url = url
    readyHashes[hash].emails[email] = true
  }
  await redis.setAsync('hashes', JSON.stringify(readyHashes))
}

/**
 * return function to add new alert
 * @param {Redis} redis instance of redis
 * @returns {Function} return a function with redis instance in scope
 */
function addAlert(redis) {
  return function(req, res, next) {
    const { body: { email, alerts } } = req
    User.findOne({ email }, async (error, user) => {
      if (error) {
        console.log(error)
        return res.status(500).json({error})
      }
      const hashes = await redis.getAsync('hashes')
      const createAlertWithRedis = addRedis(createAlert, redis, JSON.parse(hashes))
      if (!user) return createAlertWithRedis(req, res, next)
    
      const nextAlerts = {}
      // rotating through the array of alerts 
      // from the req object and assigning
      // each object as prop of { nextAlerts } with its 'id' 
      // as key
      for(let alert of alerts) {
        const url = createUrl(alert.neighborhood.value, alert.fromPrice.value, alert.toPrice.value, alert.fromRooms.value, alert.toRooms.value)
        const hash = stringHash(url)
        nextAlerts[hash] = url
        await updateAlertInRedis(redis, hash, hashes, email, url)
      }
  
      // rotating through the alerts object returned
      // from the db where the key is the 'id' of the alert
      // and if it's exist in { nextAlerts } we remove it as 
      // it's already there
      for(let alert in user.alerts) {
        if (nextAlerts[alert]) {
          delete nextAlerts[alert]
        }
      }
  
      // combining old alerts with new alerts
      user.alerts = {...nextAlerts, ...user.alerts}
      
      user.save((error, doc) => {
        if (error) {
          console.log(error)
          return res.status(500).json({error})
        }
        return res.status(200).json({message:'alerts saved'})
      })
    })
  }
}

module.exports = addAlert