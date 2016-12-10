const fs = require('fs')
    , os = require('os')

let summaryDefault = {
  incoming: {
    total: 0
  , topKeys: [ ]
  , topValues: [ ]
  , topPercent: [ ]
  }
, caught: {
    total: 0
  , topKeys: [ ]
  , topValues: [ ]
  , topPercent: [ ]
  }
, sources: {
    total: 0
  , topKeys: [ ]
  , topValues: [ ]
  , topPercent: [ ]
  }
, statistics: { }
}
module.exports = {
  get: get
, summaryDefault: summaryDefault
}

function get (logFile, cb) {
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
      , sources: { total: 0 }
      }

    for (let i = 0; i < data.length; i++) {
      let logLine = JSON.parse(data[i] || '{}')
      if (!logLine.message) continue

      if (logLine.message === 'received') {
        counts.incoming[logLine.for] = (counts.incoming[logLine.for] || 0) + 1
        summary.incoming.total += 1

        counts.sources[logLine.from] = (counts.sources[logLine.from] || 0) + 1
        summary.sources.total += 1
      } else if (logLine.message === 'caught') {
        counts.caught[logLine.destination] = (counts.caught[logLine.destination] || 0) + 1
        summary.caught.total += 1
      }
    }
    // Sort
    summary.incoming.topKeys = sort(counts.incoming).slice(0, 10)
    summary.incoming.topValues = topValues(summary.incoming.topKeys, counts.incoming)
    summary.incoming.topPercent = topPercent(summary.incoming)
    summary.caught.topKeys = sort(counts.caught).slice(0, 10)
    summary.caught.topValues = topValues(summary.caught.topKeys, counts.caught)
    summary.caught.topPercent = topPercent(summary.caught)
    summary.sources.topKeys = sort(counts.sources).slice(0, 10)
    summary.sources.topValues = topValues(summary.sources.topKeys, counts.sources)
    summary.sources.topPercent = topPercent(summary.sources)

    summary = getStatistics(summary, logFileName)

    cb(null, summary)
  })
}

function getStatistics (summary, logFileName) {
  let statistics = {
    'System Uptime': formatTime(os.uptime())
  , 'Node DNS Uptime': formatTime(process.uptime())
  , 'Memory Usage': formatData(process.memoryUsage().heapUsed) + ' / ' + formatData(os.totalmem())
  , 'Log File Size': formatData(fs.statSync(logFileName).size)
  }

  summary.statistics = statistics
  return summary
}

function formatTime (time) {
  let seconds = time.toFixed(1)
    , minutes = (time / (60)).toFixed(1)
    , hours = (time / (60 * 60)).toFixed(1)
    , days = (time / (60 * 60 * 24)).toFixed(1)

  if (seconds < 60) {
    return seconds + ' Sec'
  } else if (minutes < 60) {
    return minutes + ' Min'
  } else if (hours < 24) {
    return hours + ' Hrs'
  } else {
    return days + ' Days'
  }
}

function formatData (bytes) {
   if (bytes === 0) return '0 Byte'
   let k = 1024
     , sizes = ['Bytes', 'KiB', 'MiB', 'GiB']
     , i = Math.floor(Math.log(bytes) / Math.log(k))
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

function topPercent (obj) {
  let values = obj.topValues
    , total = obj.total

  return values.map((val) => {
    return ((val / total) * 100).toFixed(2) + '\xA0%'
  })
}
