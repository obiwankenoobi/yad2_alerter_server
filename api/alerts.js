const { addAlert } = require('../models/alerts')
const express = require("express")
const router = express.Router()

router.post('/add', addAlert)


module.exports = router