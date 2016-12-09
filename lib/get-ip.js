const ip = require('ip')

module.exports = function (addr) {
  return ip.isPrivate(addr) ? ip.address('private') : ip.address('public')
}
