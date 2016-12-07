const dns = require('native-dns')
    , async = require('async')
    , express = require('express')
    , morgan = require('morgan')
    , winston = require('winston')
    , fs = require('fs')
    , getStats = require('./lib/get-stats')
    , ip = require('ip')
    , ipAddress = ip.address()
    , env = process.env.NODE_ENV || 'development'
    , logLevel = env === 'development' ? 'debug' : 'info'
    , logFile = process.env.LOG_FILE || './logs/log'

require('winston-daily-rotate-file')

let adminUrl = 'admin.nodedns'
  , adUrls

  , app = express()

  , server = dns.createServer()
  , authority =
  { address: '8.8.8.8'
  , port: 53
  , type: 'udp'
  }

  , transport = new winston.transports.DailyRotateFile(
    { filename: logFile
    , datePattern: '.yyyy-MM-dd.log'
    , level: logLevel
    , zippedArchive: true
  })

  , logger = new (winston.Logger)({
    transports: [
      transport
    , new (winston.transports.Console)({
        level: logLevel
      , colorize: true
      })
    ]
  })

if (env === 'production') {
  logger.remove(winston.transports.Console)
}

app.use(morgan('dev'))
app.set('view engine', 'pug')
app.use(express.static(__dirname + '/public'))

app.all('*', (req, res) => {
  logger.info('Proxied request:', req.headers)
  if (req.headers.host === adminUrl) {
    getStats(logFile, (err, summary) => {
      res.render('index', summary)
    })
  } else {
    res.status(404).end()
  }
})

app.listen(80)

function proxy (question, response, cb) {
  logger.info('proxying', { destination: question.name })

  var request = dns.Request({
    question: question // forwarding the question
  , server: authority // this is the DNS server we are asking
  , timeout: 1000
  })

  // when we get answers, append them to the response
  request.on('message', (err, msg) => {
    msg.answer.forEach(a => response.answer.push(a))
  })

  request.on('end', cb)
  request.send()
}

function handleRequest (request, response) {
  logger.info('received', { from: request.address.address, for: request.question[0].name })

  let f = []

  request.question.forEach(question => {
    let blacklisted = adUrls.indexOf(question.name.toLowerCase()) !== -1
    if (blacklisted) {
      logger.info('caught', { destination: question.name })
      let record = {
        type: 1
      , class: 1
      , address: ipAddress
      , name: question.name
      , ttl: 1800
      }
      response.answer.push(record)
    } else {
      f.push(cb => proxy(question, response, cb))
    }
  })

  async.parallel(f, function () { response.send() })
}

server.on('request', handleRequest)
server.on('listening', () => logger.info('server listening on', server.address()))
server.on('close', () => logger.warn('server closed', server.address()))
server.on('error', (err, buff, req, res) => logger.error(err.stack))
server.on('socketError', (err, socket) => logger.error(err))

fs.readFile('data/adDomains.list', function (err, data) {
  if (err) {
    logger.error('Couldn\'t load adDomains.list, err:', err)
    logger.error('Not blocking anything!')
    data = ''
  }
  adUrls = data.toString().split('\n')
  adUrls.push(adminUrl)
  logger.info(`Loaded ${adUrls.length} ad domains.`)
  server.serve(53)
})
