const jwt = require("jsonwebtoken")
const { User } = require("../../db/models/UserSchema")
const stringHash = require("string-hash")
const { createUrl } = require('../../utils/utils')
const { 
  getSearchResultsHashFromRedis,
  getHashes,
  addRedis,
  updateAlertInRedis,
  getValue
} = require('../redis/redisFactoryExport')
const { getAllUsers } = require('../crawler')

/**
 * creating new alert to redis and to db
 * @param {Object} hashes object of the hashes that already in memory
 * @returns {Function} return function with redis instance in scope
 */
function createAlert(hashes = {}) {
  return async function(req, res, next) {
    const { body: { email, alerts } } = req
    const links = {}
    for(let alert of alerts) {
      const urlParams = {
        neighborhood: alert.neighborhood.value,
        fromPrice: alert.fromPrice.value,
        toPrice: alert.toPrice.value,
        fromRooms: alert.fromRooms.value,
        toRooms: alert.toRooms.value
      }
      const url = createUrl(urlParams)
      const hash = stringHash(url)
      links[hash] = url
    }

    const savedAlerts = await User.create({ email, alerts:links })

    for(let hash in links) {
      const alertObj = {
        hash,
        hashes,
        email,
        url: links[hash]
      }
      await updateAlertInRedis(alertObj) 
    }

    return res.status(200).json({ message:'alerts saved' })
  }
}//

/**
 * adding new alert
 */
function addAlert(req, res, next) {
  const { body: { email, alerts } } = req
  User.findOne({ email }, async (error, user) => {
    if (error) {
      console.log(error)
      return res.status(500).json({error})
    }
    const hashes = await getValue('hashes')
    if (!user) return createAlert(JSON.parse(hashes))(req, res, next)
  
    const nextAlerts = {}
    // rotating through the array of alerts 
    // from the req object and assigning
    // each object as prop of { nextAlerts } with its 'id' 
    // as key
    for(let alert of alerts) {
      const urlParams = {
        neighborhood: alert.neighborhood.value,
        fromPrice: alert.fromPrice.value,
        toPrice: alert.toPrice.value,
        fromRooms: alert.fromRooms.value,
        toRooms: alert.toRooms.value
      }
      const url = createUrl(urlParams)
      const hash = stringHash(url)
      nextAlerts[hash] = url
      const alertObj = {
        hash,
        hashes,
        email,
        url
      }
      await updateAlertInRedis(alertObj)
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