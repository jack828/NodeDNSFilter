const dns = require('native-dns')
    , async = require('async')
    , express = require('express')
    , morgan = require('morgan')
    , bodyParser = require('body-parser')
    , winston = require('winston')
    , fs = require('fs')
    , stats = require('./lib/stats')
    , ip = require('./lib/get-ip')
    , config = require('./lib/config')
    , env = process.env.NODE_ENV || 'development'
    , logLevel = env === 'development' ? 'debug' : 'info'
    , logFile = process.env.LOG_FILE || './logs/log'

require('winston-daily-rotate-file')

let lists =
  { whitelist: { }
  , blacklist: { } }

  , app = express()

  , server = dns.createServer()
  , authority =
  { address: ''
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
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/api/set', (req, res) => {
  if (req.body.adminUrl) {
    config.setAdminUrl(req.body.adminUrl)
  }
  if (req.body.dnsAuthority) {
    config.set('dnsAuthority', req.body.dnsAuthority)
  }
  config.save((err) => {
    if (err) {
      logger.error('Error saving', err)
      return res.status(500).send(err)
    }
    logger.warn('Changed config', config.get())
    res.sendStatus(200)
  })

})

app.get('/api/get/:listname', (req, res) => {
  let listname = req.params.listname
  if (config.validList(listname)) {
    res.json(config.getList(listname))
  } else {
    res.sendStatus(400)
  }
})

app.put('/api/set/:listname/:url', (req, res) => {
  config.saveToList(req.params.listname, req.params.url, (err) => {
    if (err) {
      logger.error('Error saving url to list', err, req.params)
      return res.status(500).send(err)
    }
    logger.info('saved', req.params)
    lists = config.getList()
    res.sendStatus(200)
  })
})

app.delete('/api/delete/:listname/:url', (req, res) => {
  config.deleteFromList(req.params.listname, req.params.url, (err) => {
    if (err) {
      logger.error('Error deleting url from list', err, req.params)
      return res.status(500).send(err)
    }
    logger.info('deleted', req.params)
    lists = config.getList()
    res.sendStatus(200)
  })
})

app.all('*', (req, res) => {
  logger.info('Proxied request:', req.headers)
  if (req.headers.host === config.get('adminUrl')) {
    stats.get(logFile, (err, data) => {
      if (err) {
        data = stats.summaryDefault
        data.error = err
        logger.error(err)
      }
      data.blockedUrls = Object.keys(config.getList('blacklist')).length - 1
      data.settings = config.get()
      console.log(data)
      res.render('index', data)
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
    msg.answer.forEach((answer) => response.answer.push(answer))
  })

  request.on('end', cb)
  request.send()
}

function handleRequest (request, response) {
  logger.info('received', { from: request.address.address, for: request.question[0].name })

  let f = []

  request.question.forEach((question) => {
    let domain = question.name.toLowerCase()

    if (!(domain in lists.whitelist) && domain in lists.blacklist) {
      logger.info('caught', { destination: domain })
      let record = {
        type: 1
      , class: 1
      , address: ip()
      , name: question.name
      , ttl: 1800
      }
      response.answer.push(record)
    } else {
      f.push((cb) => proxy(question, response, cb))
    }
  })

  async.parallel(f, function () { response.send() })
}

server.on('request', handleRequest)
server.on('listening', () => logger.info('server listening on', server.address()))
server.on('close', () => logger.warn('server closed', server.address()))
server.on('error', (err, buff, req, res) => logger.error(err.stack))
server.on('socketError', (err, socket) => logger.error(err))

config.load(logger)
authority.address = config.get('dnsAuthority')
lists = config.getList()
server.serve(53)
