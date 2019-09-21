const jwt = require("jsonwebtoken")
const { User } = require("../db/models/UserSchema")
const stringHash = require("string-hash")
const { createUrl } = require('../utils/utils')

async function createAlert(req, res, next) {
  const { body: { email, alerts } } = req
  return new Promise((resolve, reject) => {
    User.findOne({ email }, (error, user) => {
      if (error) {
        console.log(error)
        return res.status(500).json({error})
      }
      const links = {}
      for(let alert of alerts) {
        const url = createUrl(alert.neighborhood.value, alert.fromPrice.value, alert.toPrice.value, alert.fromRooms.value, alert.toRooms.value)
        const id = stringHash(url)
        links[id] = url
      }
  
      User.create({email, alerts:links})
      return res.status(200).json({message:'alerts saved'})
    })
  })
}

function updateAlertInHashes(redis, hash, hashes) {
  if (hashes[hash]) {
    
  }
}

function addAlert(redis) {
  return async function(req, res, next) {
    console.log(JSON.parse(await redis.getAsync('hashes'), null, 2))
    const { body: { email, alerts } } = req

    User.findOne({ email }, (error, user) => {
      if (error) {
        console.log(error)
        return res.status(500).json({error})
      }
  
      if (!user) return createAlert(req, res, next)
    
      const nextAlerts = {}
      // rotating through the array of alerts 
      // from the req object and assigning
      // each object as prop of { nextAlerts } with its 'id' 
      // as key
      for(let alert of alerts) {
        const url = createUrl(alert.neighborhood.value, alert.fromPrice.value, alert.toPrice.value, alert.fromRooms.value, alert.toRooms.value)
        const id = stringHash(url)
        nextAlerts[id] = url
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