const fs = require('fs')
    , dataPath = './data/'

let settings =
  { adminUrl: 'admin.nodedns'
  , dnsAuthority: '8.8.8.8'
  }
, lists =
  { whitelist: { }
  , blacklist: { }
  }

function get (key) {
  return key ? settings[key] : settings
}

function set (key, val) {
  settings[key] = val
}

function save (cb) {
  fs.writeFile(dataPath + 'config', JSON.stringify(settings), cb)
}

function load (logger) {
  let fileData = fs.readFileSync(dataPath + 'config', 'utf8')
    , adDomains = fs.readFileSync(dataPath + 'adDomains.list', 'utf8').split('\n')
    , whitelist = fs.readFileSync(dataPath + 'whitelist.list', 'utf8').split('\n')
    , blacklist = fs.readFileSync(dataPath + 'blacklist.list', 'utf8').split('\n')

  try {
    JSON.parse(fileData)
    settings = JSON.parse(fileData)
  } catch (e) {
    settings = {
      adminUrl: 'admin.nodedns'
    , dnsAuthority: '8.8.8.8'
    }
  }

  adDomains.forEach((url) => {
    lists.blacklist[url] = 1
  })
  lists.blacklist[settings.adminUrl] = 1

  whitelist.forEach((url) => {
    lists.whitelist[url] = 1
  })

  blacklist.forEach((url) => {
    lists.blacklist[url] = 1
  })

  logger.info(`Blocking ${Object.keys(lists.blacklist).length - 1} domains.`)
  logger.info(`Whitelisted ${Object.keys(lists.whitelist).length} domains.`)
}

function getList (listname) {
  return listname ? lists[listname] : lists
}

function saveToList (listname, url, cb) {
  url = url.toLowerCase()
  if (!validList(listname)) return cb('Invalid list name')

  fs.readFile(`./data/${listname}.list`, (err, data) => {
    if (err) return cb(err)

    let urls = data.toString().split('\n')
    if (urls.indexOf(url) === -1) {
      urls.push(url)
      fs.writeFile(`./data/${listname}.list`, urls.join('\n'), (err) => {
        // Added to file, now add to list
        lists[listname][url] = 1
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
  if (!validList(listname)) return cb('Invalid list name')

  fs.readFile(`./data/${listname}.list`, (err, data) => {
    if (err) return cb(err)

    let urls = data.toString().split('\n')
      , urlPos = urls.indexOf(url)
    if (urlPos !== -1) {
      urls.splice(urlPos, 1)
      fs.writeFile(`./data/${listname}.list`, urls.join('\n'), (err) => {
        // Removed from file, now remove from list
        delete lists[listname][url]
        cb(err)
      })
    } else {
      // URL is not in list
      cb(null)
    }
  })
}

function validList (listname) {
  let allowedLists = [ 'whitelist', 'blacklist' ]
  return allowedLists.indexOf(listname) !== -1
}

module.exports = {
  get: get
, set: set
, save: save
, load: load
, saveToList: saveToList
, deleteFromList: deleteFromList
, getList: getList
}
