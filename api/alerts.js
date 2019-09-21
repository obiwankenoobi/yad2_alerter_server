const addAlert = require('../services/alerts')
const { main } = require('../services/crawler')
const express = require("express")
const router = express.Router()
const { client, addRedis } = require('../db/redisClient')
const addAlertsWithRedis = addRedis(addAlert, client)

router.post('/add', addAlertsWithRedis)
router.post('/crawl', main)

module.exports = router