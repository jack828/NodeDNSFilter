const request = require('request')
    , fs = require('fs')
    , async = require('async')
    , adSourceUrlsFile = 'data/adSourceUrls.list'
    , blacklistFile = 'data/blacklist.list'
    , adDomainsFile = 'data/adDomains.list'

let unique = (arr) => [...new Set(arr)]

fs.readFile(adSourceUrlsFile, function (err, data) {
  if (err) {
    console.error('Couldn\'t read `adUrls.list`, aborting:', err)
    return
  }
  data = data.toString().split('\n')
  data = filterComments(data)
  data = data.map(line => line.split(' '))
  let types = data.map(line => line[0])
    , urls = data.map(line => line[1])

  console.log(`Read ${adSourceUrlsFile}, fetching ad lists from ${urls.length} sources...`)

  async.map(urls, request, function (err, results) {
    if (err) {
      console.error('Couldn\'t fetch ad list, aborting:', err)
      return
    }
    console.log(`Fetched ${results.length} ad lists`)
    let domainList = [ ]
    for (var i = 0; i < types.length; i++) {
      let type = types[i]
        , domains = results[i].body
        , filteredDomains = filter(type, domains)
      domainList = domainList.concat(filteredDomains)

      console.log(`Fetched ${filteredDomains.length} from ${results[i].request.uri.href}`)
    }
    console.log(`Total domains: ${domainList.length}`)

    readUserBlacklist((err, blacklist) => {
      if (err) {
        console.log(`Couldn't read user blacklist at ${blacklistFile}, err: ${err}`)
      }
      writeAdList(domainList, blacklist)
    })
  })
})

function filter (type, domains) {
  let filteredDomains = [ ]
  if (type === 'raw') {
    /*
      Domains are in the format:
       - One per line
       - May have comments
    */
    filteredDomains = filterComments(domains.split('\n'))
  } else if (type === 'hosts') {
    /*
      Domains are in the format:
       - One per line
       - Has host IP before domain name
       - IP and domain name may be seperated by any number of spaces
       - May have comments
    */
    domains = filterComments(domains.split('\n'))
    filteredDomains = domains.map(line => line.split(/\s+/)[1])
  } else if (type === 'inline') {
    /*
      Domains are in the format:
       - One per line
       - May have a comment on the same line as the domain
       - May have comments
    */
    domains = filterComments(domains.split('\n'))
    // Split and trim the comment and whitespace after domain
    filteredDomains = domains.map(line => line.split(/\s*#+/)[0])
  }
  return filteredDomains
}

function filterComments (data) {
  return data.filter(line => line !== '' && line.slice(0, 1) !== '#')
}

function writeAdList (adDomainsList, blacklist) {
  // Delete existing list
  fs.unlink(adDomainsFile, function (err) {
    if (err) {
      console.log(`Couldn't delete ${adDomainsFile}, maybe it doesn't exist already?`)
    } else {
      console.log(`Deleted ${adDomainsFile}`)
    }

    adDomainsList = adDomainsList.concat(blacklist)
    adDomainsList = unique(adDomainsList)
    fs.writeFile(adDomainsFile, adDomainsList.join('\n'), function (err) {
      if (err) {
        console.error(`Couldn't write to ${adDomainsFile}, aborting: ${err}`)
        return
      }
      console.log(`Wrote ${adDomainsList.length} domains to`, adDomainsFile)
    })
  })
}

function readUserBlacklist (callback) {
  fs.readFile(blacklistFile, function (err, data) {
    if (err) return callback(err)
    callback(null, data.toString())
  })
}
