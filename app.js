const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const cors = require('cors')
const dotenv = require('dotenv')
const { main } = require('./services/main')

dotenv.config()

// anti ddos
const RateLimit = require('express-rate-limit')
const alerts = require('./api/alerts')

// passport imports
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

// mongo imports
require('mongodb')
require('mongodb').MongoClient
require('./db/mongoose')

const app = express()
const limiter = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  delayMs: 0 // disable delaying - full speed until the max limit is reached
})


// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(limiter)
app.use(
  bodyParser.urlencoded({
    extended: false
  })
)
app.use(cookieParser(process.env.cookieParserSecret))
app.use(express.static(path.join(__dirname, 'public')))
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: 'process.env.cookieParserSecret'
  })
)
app.use(passport.initialize())
app.use(passport.session())
app.use(cors())

app.use('/alerts', alerts)

//main(client)
main()
setInterval(main, minToMs(5))

function minToMs(min) {
  return 1000 * 60 * min
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
