const dns = require('native-dns')
    , async = require('async')
    , express = require('express')
    , morgan = require('morgan')
    , fs = require('fs')

let adminUrl = 'admin.nodedns'
  , adUrls

  , app = express()

  , server = dns.createServer()
  , authority =
  { address: '8.8.8.8'
  , port: 53
  , type: 'udp'
  }

app.use(morgan('dev'))
app.set('view engine', 'pug')
app.use(express.static(__dirname + '/public'))

app.all('*', (req, res) => {
  console.log('Proxied request:', req.headers)
  if (req.headers.host === adminUrl) {
    return res.render('index')
  }
  res.send('{}')
})

app.listen(80)

function proxy (question, response, cb) {
  console.log('proxying', question.name)

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
  console.log('request from', request.address.address, 'for', request.question[0].name)

  let f = []

  request.question.forEach(question => {
    let blacklist = adUrls.filter(url => new RegExp(url, 'i').exec(question.name))
    if (blacklist.length) {
      let record = {
        type: 'A'
      , address: '127.0.0.1'
      , name: question.name
      , ttl: 1800
      }
      response.answer.push(dns.A(record))
    } else {
      f.push(cb => proxy(question, response, cb))
    }
  })

  async.parallel(f, function () { response.send() })
}

server.on('request', handleRequest)
server.on('listening', () => console.log('server listening on', server.address()))
server.on('close', () => console.log('server closed', server.address()))
server.on('error', (err, buff, req, res) => console.error(err.stack))
server.on('socketError', (err, socket) => console.error(err))

fs.readFile('data/adlist.txt', function (err, data) {
  adUrls = data.toString().split('\n')
  adUrls.pop() // Remove trialing newline
  server.serve(53)
})
