const fs = require('fs')
    , filePath = './data/config'

let settings = {
  adminUrl: 'admin.nodedns'
, dnsAuthority: '8.8.8.8'
}

function get (key) {
  return key ? settings[key] : settings
}

function set (key, val) {
  settings[key] = val
}

function save (cb) {
  fs.writeFile(filePath, JSON.stringify(settings), cb)
}

function load () {
  let fileData = fs.readFileSync(filePath)

  try {
    settings = JSON.parse(fileData)
  } catch (e) {
    // TODO log
  }
  return settings
}

module.exports = {
  get: get
, set: set
, save: save
, load: load
}
