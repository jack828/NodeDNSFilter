const fs = require('fs')

module.exports = function (logFile, cb) {
  let date = new Date()
   , month = date.getMonth() + 1
   , day = date.getDate()
   , logFileName

  month = month > 9 ? month : '0' + month
  day = day > 9 ? day : '0' + day
  logFileName = logFile + `.${date.getFullYear()}-${month}-${day}.log`

  fs.readFile(logFileName, function (err, raw) {
    if (err) return cb(err)
    let data = raw.toString().split('\n')
      , counts = {
        incoming: { }
      , caught: { }
      , sources: { }
      }
      , summary = {
        incoming: { total: 0 }
      , caught: { total: 0 }
      , sources: { }
      }

    for (let i = 0; i < data.length; i++) {
      let logLine = JSON.parse(data[i] || '{}')
      if (!logLine.message) continue

      if (logLine.message === 'received') {
        counts.incoming[logLine.for] = (counts.incoming[logLine.for] || 0) + 1
        summary.incoming.total += 1

        counts.sources[logLine.from] = (counts.sources[logLine.from] || 0) + 1
      } else if (logLine.message === 'caught') {
        counts.caught[logLine.destination] = (counts.caught[logLine.destination] || 0) + 1
        summary.caught.total += 1
      }
    }
    // Sort
    summary.incoming.topKeys = sort(counts.incoming).slice(0, 10)
    summary.incoming.topValues = topValues(summary.incoming.topKeys, counts.incoming)
    summary.caught.topKeys = sort(counts.caught).slice(0, 10)
    summary.caught.topValues = topValues(summary.caught.topKeys, counts.caught)
    summary.sources.topKeys = sort(counts.sources).slice(0, 10)
    summary.sources.topValues = topValues(summary.sources.topKeys, counts.sources)

    cb(null, summary)
  })
}

function sort (obj) {
  return Object.keys(obj).sort(function (a, b) { return obj[a] - obj[b] }).reverse()
}

function topValues (keys, obj) {
  var values = [ ]
  keys.forEach((key) => {
    values.push(obj[key])
  })
  return values
}
