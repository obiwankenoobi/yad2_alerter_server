const { addAlert } = require('../models/alerts')
const { main } = require('../models/main')
const express = require("express")
const router = express.Router()

router.post('/add', addAlert)
router.post('/crawl', main)

module.exports = router