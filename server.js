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

let adUrls
  , whitelist

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
    loadAdminUrl(config.get('adminUrl'), req.body.adminUrl)
    config.set('adminUrl', req.body.adminUrl)
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
  let allowedLists = [ 'whitelist', 'blacklist' ]
  if (allowedLists.indexOf(req.params.listname) !== -1) {
    fs.readFile(`data/${req.params.listname}.list`, (err, data) => {
      if (err) {
        logger.error('Error loading list', err, req.params.listname)
        return res.status(500).send(err)
      }
      let urls = data.toString()
      res.send(urls)
    })
  } else {
    res.sendStatus(400)
  }
})

app.post('/api/set/:listname', (req, res) => {
  let allowedLists = [ 'whitelist', 'blacklist' ]
  if (allowedLists.indexOf(req.params.listname) !== -1) {
    fs.appendFile(`data/${req.params.listname}.list`
    , '\n' + req.body.url
    , (err) => {
      if (err) {
        logger.error('Error appending list', err, req.params.listname)
        return res.status(500).send(err)
      }
      res.sendStatus(200)
    })
  } else {
    res.sendStatus(400)
  }
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
      data.adUrls = adUrls.length - 1
      data.settings = config.get()
      console.log(data)
      res.render('index', data)
    })
  } else {
    res.status(404).end()
  }
})

app.listen(80)

function loadAdminUrl (oldUrl, newUrl) {
  let pos = adUrls.indexOf(oldUrl)
  if (pos) adUrls[pos] = newUrl
}

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
    let whitelisted = whitelist.indexOf(question.name.toLowerCase()) !== -1
    if (whitelisted) {
      f.push(cb => proxy(question, response, cb))
      return
    }
    let blacklisted = adUrls.indexOf(question.name.toLowerCase()) !== -1
    if (blacklisted) {
      logger.info('caught', { destination: question.name })
      let record = {
        type: 1
      , class: 1
      , address: ip()
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

  config.load()
  authority.address = config.get('dnsAuthority')

  adUrls = data.toString().split('\n')
  adUrls.push(config.get('adminUrl'))

  logger.info(`Loaded ${adUrls.length - 1} ad domains.`)
  fs.readFile('data/whitelist.list', function (err, data) {
    if (err) {
      logger.error('Couldn\'t load whitelist.list, err:', err)
      data = ''
    }
    whitelist = data.toString().split('\n')
    logger.info(`Whitelisted ${whitelist.length} domains.`)

    server.serve(53)
  })
})
