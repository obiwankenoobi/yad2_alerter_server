const jwt = require("jsonwebtoken");
const { User } = require("../db/models/UserSchema");
const stringHash = require("string-hash");

async function createAlert(req, res, next) {
  const { body: { email, alerts } } = req
  return new Promise((resolve, reject) => {
    User.findOne({email:req.body.email}, (error, user) => {
      if (error) {
        console.log(error)
        return res.status(500).json({error})
      }
      const links = {}
      for(let alert of alerts) {
        const url = 
          `https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=${alert.neighborhood.value}&rooms=${alert.fromRoom.value}-${alert.toRoom.value}&price=${alert.fromPrice.value}-${alert.toPrice.value}`
          console.log('link in alerts', url)
          const id = stringHash(url)
        links[id] = url
      }
  
      User.create({email, alerts:links})
      return res.status(200).json({message:'alerts saved'})
    })
  })
}

function addAlert(req, res, next) {

  const { body: { email, alerts } } = req

  User.findOne({ email }, (error, user) => {
    if (error) {
      console.log(error)
      return res.status(500).json({error})
    }

    if (!user) {
      return createAlert(req, res, next)
    }

    const nextAlerts = {}
    // rotating through the array of alerts 
    // from the req object and assigning
    // each object as prop of { nextAlerts } with its 'id' 
    // as key
    for(let alert of alerts) {
      const link = 
        `https://www.yad2.co.il/realestate/rent?city=5000&${alert.neighborhood.value}&rooms=${alert.fromRoom.value}-${alert.toRoom.value}&price=${alert.fromPrice.value}-${alert.toPrice.value}`
      const id = stringHash(link)
      nextAlerts[id] = link
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