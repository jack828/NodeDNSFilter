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

function saveToList (listname, url, cb) {
  url = url.toLowerCase()
  fs.readFile(`./data/${listname}.list`, (err, data) => {
    if (err) return cb(err)

    let urls = data.toString().split('\n')
    if (urls.indexOf(url) === -1) {
      urls.push(url)
      fs.writeFile(`./data/${listname}.list`, urls.join('\n'), (err) => {
        cb(err)
      })
    } else {
      // URL is already listed
      cb(null)
    }
  })
}

function deleteFromList (listname, url, cb) {
  url = url.toLowerCase()
  fs.readFile(`./data/${listname}.list`, (err, data) => {
    if (err) return cb(err)

    let urls = data.toString().split('\n')
      , urlPos = urls.indexOf(url)
    if (urlPos !== -1) {
      urls.splice(urlPos, 1)
      fs.writeFile(`./data/${listname}.list`, urls.join('\n'), (err) => {
        cb(err)
      })
    } else {
      // URL is not in list
      cb(null)
    }
  })
}

module.exports = {
  get: get
, set: set
, save: save
, load: load
, saveToList: saveToList
, deleteFromList: deleteFromList
}
