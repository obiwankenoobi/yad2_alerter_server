const jwt = require("jsonwebtoken")
const { User } = require("../db/models/UserSchema")
const stringHash = require("string-hash")
const { createUrl } = require('../utils/utils')
const { 
  getSearchResultsHashFromRedis,
  addSearchResultHashToRedis,
  getHashes,
  addRedis,
  updateAlertInRedis,
  getValue
} = require('../services/redis/redisFactoryExport')
const { getAllUsers } = require('../services/crawler')

/**
 * add new alert to redis and to db
 * @param {Object} hashes object of the hashes that already in memory
 * @returns {Function} return function with redis instance in scope
 */
function createAlert(hashes = {}) {
  return async function(req, res, next) {
    const { body: { email, alerts } } = req
    const links = {}
    for(let alert of alerts) {
      const url = createUrl(alert.neighborhood.value, alert.fromPrice.value, alert.toPrice.value, alert.fromRooms.value, alert.toRooms.value)
      const hash = stringHash(url)
      links[hash] = url
    }

    console.log('links to update', links)
    const savedAlerts = await User.create({ email, alerts:links })
    console.log('savedAlerts', savedAlerts)

    for(let hash in links) {
      await updateAlertInRedis(hash, hashes, email, links[hash]) 
    }

    return res.status(200).json({ message:'alerts saved' })
  }
}

/**
 * return function to add new alert
 */
function addAlert(req, res, next) {
  const { body: { email, alerts } } = req
  User.findOne({ email }, async (error, user) => {
    if (error) {
      console.log(error)
      return res.status(500).json({error})
    }
    const hashes = await getValue('hashes')
    const createAlertWithHashes = createAlert(JSON.parse(hashes))
    if (!user) return createAlertWithHashes(req, res, next)
  
    const nextAlerts = {}
    // rotating through the array of alerts 
    // from the req object and assigning
    // each object as prop of { nextAlerts } with its 'id' 
    // as key
    for(let alert of alerts) {
      const url = createUrl(alert.neighborhood.value, alert.fromPrice.value, alert.toPrice.value, alert.fromRooms.value, alert.toRooms.value)
      const hash = stringHash(url)
      nextAlerts[hash] = url
      await updateAlertInRedis(hash, hashes, email, url)
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


module.exports = addAlert