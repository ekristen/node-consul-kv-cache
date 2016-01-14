var util = require('util')
var after = require('after')
var debug = require('debug')('consul-kv-cache')
var MemDB = require('memdb')

var db = MemDB()

function ConsulKVCache(opts) {
  if (!(this instanceof ConsulKVCache)) {
    return new ConsulKVCache(opts)
  }

  this.initial = true
  
  return this
}
util.inherits(ConsulKVCache, require('events').EventEmitter)

ConsulKVCache.prototype.update = function ConsulKVCacheUpdate (keys) {
  var self = this

  if (typeof keys == 'undefined') {
    debug('no keys sent')
    return
  }

  debug('keys: %d', keys.length)

  var done = after(keys.length, function(err) {
    if (err) {
      self.emit('error', err)
    }
    
    self.initial = false
  })

  keys.forEach(function(key) {
    debug('key: %j', key)

    db.get(key.Key, function(err, existingKey) {
      if (err && !err.notFound) {
        debug('key get error: %s, %j', key.Key, err)
        return done(err)
      }

      try {
        existingKey = JSON.parse(existingKey)
      } catch(e) {
        existingKey = key
      }

      db.put(key.Key, JSON.stringify(key), function(err1) {
        if (err1) {
          debug('key put error: %s, %j', key.Key, err)
          return done(err1)
        }

        if (self.initial == true) {
          return done()
        }

        if (err && err.notFound || (!err && existingKey.ModifyIndex !== key.ModifyIndex)) {
          debug('new key: %s', key.Key)
          self.emit('change', existingKey)
        }
        
        return done()
      })
    })
  })
}

module.exports = ConsulKVCache
