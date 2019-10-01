const { addAlert } = require('../services/alerts')
const { main } = require('../services/main')
const express = require("express")
const router = express.Router()

router.post('/add', addAlert)
router.post('/crawl', main)

module.exports = router