import path from 'path'
import {app} from 'electron'
import fs from 'fs'
import assert from 'assert'

const getWindow = _ => {
  // return BrowserWindow
}

const defaultConfig = {
  config: {},
  statics: {
    configPath: path.join(app.getPath('userData'), 'config.json')
  },
  tmp: {}
}

let config = {}

let watchers = {}

function mergeConfig (appConfig, defaultConfig) {
  if (Object.prototype.toString.call(defaultConfig) === '[object Array]') {
    return appConfig
  }
  Object.keys(defaultConfig).forEach(key => {
    if (appConfig[key] === undefined) {
      appConfig[key] = defaultConfig[key]
    } else if (typeof appConfig[key] === 'object' && typeof defaultConfig[key] === 'object') {
      appConfig[key] = mergeConfig(appConfig[key], defaultConfig[key])
    }
  })
  return appConfig
}

const read = () => {
  const exists = fs.existsSync(defaultConfig.statics.configPath)
  if (!exists) {
    config = defaultConfig
    write()
    return
  }
  let j = fs.readFileSync(defaultConfig.statics.configPath)
  config.config = mergeConfig(JSON.parse(j), defaultConfig)
}

const write = () => {
  fs.writeFileSync(
    defaultConfig.statics.configPath,
    JSON.stringify(config.config)
  )
}

const _hasKeyPath = (obj, keyPath) => {
  const keys = keyPath.split(/\./)

  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i]
    if (key === '') {
      continue
    }
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      obj = obj[key]
    } else {
      return false
    }
  }

  return true
}

const _getValueAtKeyPath = (obj, keyPath) => {
  const keys = keyPath.split(/\./)

  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i]
    if (key === '') {
      continue
    }
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      obj = obj[key]
    } else {
      return undefined
    }
  }

  return obj
}

const _setValueAtKeyPath = (obj, keyPath, value) => {
  let keysa = keyPath.split(/\./)
  let keys = []
  let old = JSON.parse(JSON.stringify(obj))
  for (let i = 0, len = keysa.length; i < len; i++) {
    if (keysa[i] !== '') {
      keys.push(keysa[i])
    }
  }
  while (keys.length > 1) {
    const key = keys.shift()
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      obj[key] = {}
    }

    obj = obj[key]
  }
  obj[keys.shift()] = value
  _callWatcherAtKeyPath(keyPath, old)
}

const _deleteValueAtKeyPath = (obj, keyPath) => {
  let keysa = keyPath.split(/\./)
  let keys = []
  let old = JSON.parse(JSON.stringify(obj))
  for (let i = 0, len = keysa.length; i < len; i++) {
    if (keysa[i] !== '') {
      keys.push(keysa[i])
    }
  }
  while (keys.length > 1) {
    const key = keys.shift()
    if (key === '') {
      continue
    }
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return
    }

    obj = obj[key]
  }

  delete obj[keys.shift()]
  _callWatcherAtKeyPath(keyPath, old)
}

const _callWatcherAtKeyPath = (keyPath, old, perfix = '') => {
  if (keyPath === '' && perfix !== '') {
    return // 上一层递归中已经处理过。
  }
  if (perfix === '') {
    if (Object.prototype.hasOwnProperty.call(watchers, '')) {
      for (let i = 0, len = watchers[''].length; i < len; i++) {
        watchers[''][i](_getValueAtKeyPath(old, ''), _getValueAtKeyPath(config, ''), '')
      }
    }
  }
  let index = keyPath.indexOf('.')
  if (index === -1) { // 处理找不到.的情况
    let path = perfix + keyPath
    // console.log(path)
    if (Object.prototype.hasOwnProperty.call(watchers, path)) {
      for (let i = 0, len = watchers[path].length; i < len; i++) {
        watchers[path][i](_getValueAtKeyPath(old, path), _getValueAtKeyPath(config, path), path)
      }
    }
    return
  }
  let path = perfix
  path = path + keyPath.substr(0, index)
  if (keyPath.substr(0, index) !== '') { // 处理找到.的情况 perfix拼接新的path
    if (Object.prototype.hasOwnProperty.call(watchers, path)) {
      for (let i = 0, len = watchers[path].length; i < len; i++) {
        watchers[path][i](_getValueAtKeyPath(old, path), _getValueAtKeyPath(config, path), path)
      }
    }
    perfix = path + '.'
  } else {
    perfix = path
  }
  _callWatcherAtKeyPath(keyPath.substr(index + 1, keyPath.length), old, perfix) // 递归处理
}

const has = (keyPath) => {
  assert.strictEqual(typeof keyPath, 'string', 'First parameter must be a string')
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  return _hasKeyPath(config, keyPath)
}

const get = (keyPath, defaultValue = undefined) => {
  assert.strictEqual(typeof keyPath, 'string', 'First parameter must be a string')
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  const exists = _hasKeyPath(config, keyPath)
  const value = _getValueAtKeyPath(config, keyPath)
  if (!exists && typeof defaultValue !== 'undefined') {
    return defaultValue
  }
  return value
}

const set = (keyPath, value) => {
  assert.strictEqual(typeof keyPath, 'string', 'First parameter must be a string')
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  _setValueAtKeyPath(config, keyPath, value)
  return true
}

const del = (keyPath) => {
  assert.strictEqual(typeof keyPath, 'string', 'First parameter must be a string')
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  const exists = _hasKeyPath(config, keyPath)

  if (exists) {
    _deleteValueAtKeyPath(config, keyPath)
  }
}

const watch = (keyPath, handler) => {
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  if (keyPath[keyPath.length] === '.') {
    keyPath = keyPath.substr(0, keyPath.length - 1)
  }
  if (!Object.prototype.hasOwnProperty.call(watchers, keyPath)) {
    watchers[keyPath] = []
  }
  watchers[keyPath].push(handler)
}
const compare = (config1, config2) => {
  let ret = []
  if (JSON.stringify(config1) === JSON.stringify(config2)) {
    return ret
  }
  config1 = JSON.parse(JSON.stringify(config1))
  config2 = JSON.parse(JSON.stringify(config2))
  Object.keys(config1).forEach(key => {
    if (typeof config1[key] === 'object' && typeof config2[key] === 'object') {
      if (Object.prototype.toString.call(config1[key]) === '[object Array]' &&
        Object.prototype.toString.call(config2[key]) === '[object Array]' &&
        JSON.stringify(config1[key]) !== JSON.stringify(config2[key])) {
        ret.push(key)
        delete config2[key]
        return
      }
      if (config1[key] === undefined || config2[key] === undefined) {
        ret.push(key)
        delete config2[key]
        return
      }
      let r = compare(config1[key], config2[key])
      for (let i = 0, len = r.length; i < len; i++) {
        ret.push(key + '.' + r[i])
      }
    } else {
      if (config1[key] === undefined || config2[key] === undefined) {
        ret.push(key)
      } else if (JSON.parse(JSON.stringify(config1[key])) !== JSON.parse(JSON.stringify(config2[key]))) {
        ret.push(key)
      }
    }
    delete config2[key]
  })
  Object.keys(config2).forEach(key => {
    if (typeof config1[key] === 'object' && typeof config2[key] === 'object') {
      if (Object.prototype.toString.call(config1[key]) === '[object Array]' &&
        Object.prototype.toString.call(config2[key]) === '[object Array]' &&
        JSON.stringify(config1[key]) !== JSON.stringify(config2[key])) {
        ret.push(key)
        return
      }
      if (config1[key] === undefined || config2[key] === undefined) {
        ret.push(key)
        return
      }
      let r = compare(config1[key], config2[key])
      for (let i = 0, len = r.length; i < len; i++) {
        ret.push(key + '.' + r[i])
      }
    } else {
      if (config1[key] === undefined || config2[key] === undefined) {
        ret.push(key)
      } else if (JSON.parse(JSON.stringify(config1[key])) !== JSON.parse(JSON.stringify(config2[key]))) {
        ret.push(key)
      }
    }
  })
  return ret
}
export default {
  has, get, set, del, watch, read, write, compare
}

const {ipcMain} = require('electron')
watchers[''] = []
watchers[''].push(function (old, newv) {
  const window = getWindow()
  window.webContents.send('update_config', newv)
  // console.log(ipcMain.send('update_config', newv))
})
ipcMain.on('update_config', (event, newv) => {
  // console.log('received new value from vue!', newv)
  let diff = compare(config, newv)
  let tmp = JSON.parse(JSON.stringify(config))
  config = newv
  diff.forEach(v => {
    // console.log('calling watcher at ', v)
    _callWatcherAtKeyPath(v, tmp)
  })
  event.returnValue = true
})
ipcMain.on('pull_config', (event) => {
  const window = getWindow()
  window.webContents.send('update_config', config)
  // console.log('Sending config to vue...................', config)
  event.returnValue = 'sent'
})
