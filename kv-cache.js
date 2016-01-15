var _ = require('lodash')
var util = require('util')
var after = require('after')
var xtend = require('xtend')
var debug = require('debug')('consul-kv-cache')
var MemDB = require('memdb')

var db = MemDB()

function ConsulKVCache(opts) {
  if (!(this instanceof ConsulKVCache)) {
    return new ConsulKVCache(opts)
  }

  this.initial = true
  
  this.opts = xtend({
    createTree: false,
    returnKey: null
  }, opts)
  
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
          self.emit('change', existingKey, self.createTree(keys))
        }
        
        return done()
      })
    })
  })
}

ConsulKVCache.prototype.createTree = function createTree(data) {
  if (this.opts.createTree == false) {
    return null
  }

  var lst = []
  var compiledData = {}

  data.forEach(function(entry) {
    if (entry.Key.substring(entry.Key.length-1) == '/') {
      return
    }

    var arr = entry.Key.split('/')
    for(var i=0; i<arr.length; i++) {
      if (arr[i] == '' || arr[i] == null) {
        arr.pop()
      }
    }

    arr.push(entry.Value)
    lst.push(arr)

    var tree = {}
    lst.forEach(function(item) {
        var value = item.pop()
        item.reduce(function(node, chr, index, array) {
          if (index == array.length - 1) {
            return node[chr] = value
          }

          return node[chr] = {}
        }, tree)
    });

  
    compiledData = _.merge(compiledData, tree)
  })

  var args = [compiledData]
  if (this.opts.returnKey != null) {
    var keyArgs = this.opts.returnKey.split('/')
    args = args.concat(keyArgs)
  }

  return _.get.apply(args)
}

module.exports = ConsulKVCache
