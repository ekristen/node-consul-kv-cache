var test = require('tape')

var after = require('after')
var consul = require('consul')()
var KVCache = require('./kv-cache')

var cache = new KVCache()

var watch = consul
  .watch({
    method: consul.kv.get,
    options: {
      key: 'test',
      recurse: true
    }
  })
  .on('error', function(err) {
    console.log('watch error', err)
  })
  .on('change', cache.update.bind(cache))

cache
  .on('error', function(err) {
    console.log(err)
  })
  
var done = after(3, function() {
  watch.end()
})

test('triggers on key change', function(t) {

  cache.once('change', function(key) {
    t.equal(key.Key, 'test/me')
    t.equal(key.Value, 'me')

    done()
    t.end()
  })

  consul.kv.set('test/me', 'me', function(err, status) {
    t.ok(!err)
    t.equal(status, true)
  })
  
})

test('triggers single events on multiple keys', function(t) {

  function multipleChange (key) {
    if (key.Key == 'test/me') {
      t.equal(key.Key, 'test/me')
      t.equal(key.Value, 'me')
    } else {
      t.equal(key.Key, 'test/me2')
      t.equal(key.Value, 'me2')
    }

    complete()
  }

  var complete = after(2, function() {
    cache.removeListener('change', multipleChange)
    t.end()
  })
  
  cache.on('change', multipleChange)

  consul.kv.set('test/me', 'me', function(err, status) {
    t.ok(!err)
    t.equal(status, true)
    consul.kv.set('test/me2', 'me2', function(err1, status1) { 
      t.ok(!err1)
      t.equal(status1, true)
    })
  })
  
})

test('does not return tree of keys', function(t) {
  cache.once('change', function(key, tree) {
    t.equal(key.Key, 'test/me1')
    t.equal(key.Value, 'me1')
    t.equal(tree, null)
    
    done()
    t.end()
  })

  consul.kv.set('test/me1', 'me1', function(err, status) {
    t.ok(!err)
    t.equal(status, true)
  })
})

test('should return tree of keys', function(t) {
  cache.once('change', function(key, tree) {
    t.equal(key.Key, 'test/me2')
    t.equal(key.Value, 'me2')
    t.equal(typeof(tree), 'object')

    done()
    t.end()
  })

  consul.kv.set('test/me2', 'me2', function(err, status) {
    t.ok(!err)
    t.equal(status, true)
  })
})
