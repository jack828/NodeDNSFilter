const dns = require('native-dns')
    , async = require('async')
    , fs = require('fs')
    , express = require('express')
    , bodyParser = require('body-parser')

let entries = require('./records.json')
  , password = 'ilovekittens'

  , app = express()

  , server = dns.createServer()
  , authority =
  { address: '8.8.8.8'
  , port: 53
  , type: 'udp'
  }

app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'))

app.get('/load', (req, res) => {
  res.send(entries)
})

app.post('/save', (req, res) => {
  if (req.query.password === password) {
    entries = req.body
    fs.writeFileSync('records.json', JSON.stringify(entries))
    res.send('ok')
    console.log('Changed records.json')
  } else {
    res.status(401).send('wrong')
  }
})

app.listen(5380)

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
    let entry = entries.filter(r => new RegExp(r.domain, 'i').exec(question.name))
    if (entry.length) {
      entry[0].records.forEach(record => {
        record.name = question.name
        record.ttl = record.ttl || 1800
        if (record.type === 'CNAME') {
          record.data = record.address
          f.push(cb => {
            proxy({
              name: record.data
            , type: dns.consts.NAME_TO_QTYPE.A
            , class: 1
            }, response, cb)
          })
        }
        response.answer.push(dns[record.type](record))
      })
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

server.serve(53)
