const request = require('request')
    , fs = require('fs')
    , async = require('async')
    , domainSourceFile = 'data/domain-sources.list'
    , domainsFile = 'data/domains.list'

let unique = (arr) => [...new Set(arr)]

fs.readFile(domainSourceFile, (err, data) => {
  if (err) {
    console.error(`Couldn\'t read ${domainSourceFile}, aborting:`, err)
    return
  }
  data = data.toString().split('\n')
  data = filterComments(data)
  data = data.map(line => line.split(' '))
  let types = data.map(line => line[0])
    , urls = data.map(line => line[1])

  console.log(`Read ${domainSourceFile}, fetching domain lists from ${urls.length} sources...`)

  async.map(urls, request, (err, results) => {
    if (err) {
      console.error('Couldn\'t fetch domain list, aborting:', err)
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

    writeDomainList(domainList)
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
    filteredDomains = domains.map((line) => line.split(/\s+/)[1])
  } else if (type === 'inline') {
    /*
      Domains are in the format:
       - One per line
       - May have a comment on the same line as the domain
       - May have comments
    */
    domains = filterComments(domains.split('\n'))
    // Split and trim the comment and whitespace after domain
    filteredDomains = domains.map((line) => line.split(/\s*#+/)[0])
  }
  return filteredDomains
}

function filterComments (data) {
  return data.filter((line) => line !== '' && line.slice(0, 1) !== '#')
}

function writeDomainList (domainsList) {
  // Delete existing list
  fs.unlink(domainsFile, (err) => {
    if (err) {
      console.log(`Couldn't delete ${domainsFile}, maybe it doesn't exist already?`)
    } else {
      console.log(`Deleted ${domainsFile}`)
    }

    domainsList = unique(domainsList).join('\n')
    fs.writeFile(domainsFile, domainsList, (err) => {
      if (err) {
        console.error(`Couldn't write to ${domainsFile}, aborting: ${err}`)
        return
      }
      console.log(`Wrote ${domainsList.length} domains to`, domainsFile)
    })
  })
}
