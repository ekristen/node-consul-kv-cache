# node-consul-kv-cache

[![David](https://img.shields.io/david/ekristen/node-consul-kv-cache.svg)]() [![David](https://img.shields.io/david/dev/ekristen/node-consul-kv-cache.svg)]() [![npm](https://img.shields.io/npm/v/consul-kv-cache.svg)]() [![npm](https://img.shields.io/npm/l/consul-kv-cache.svg)]() [![npm](https://img.shields.io/npm/dt/consul-kv-cache.svg)]()

This is designed to be used with `node-consul` and the watch command with `consul.kv.get` this library turns each key change received into an node emitted event, and keeps track so duplicates are not sent.

If multiple key changes are received with single update, the cache library will trigger 2 separate change events.

## Install Instructions

```
npm install consul-kv-cache
```

## Example

```javascript
var consul = require('consul')()

var ConsulKVCache = require('consul-kv-cache')

var cache = new ConsulKVCache()

consul
  .watch({
    method: consul.kv.get,
    options: {
      key: 'me',
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
  .on('change', function(key) {
    console.log(key)
  })
```
