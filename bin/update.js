const request = require('request')
    , fs = require('fs')
    , adListUrl = process.env.AD_LIST_URL || 'https://pgl.yoyo.org/adservers/serverlist.php?showintro=0&mimetype=plaintext'

request.get(adListUrl)
  .on('error', function (err) {
    console.error('Couldn\'t fetch ad list, aborting:', err)
  })
  .pipe(fs.createWriteStream('data/adlist.txt'))
