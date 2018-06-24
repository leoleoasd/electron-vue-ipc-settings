import assert from 'assert'
import path from 'path'
import vue from 'vue'
const app = require('electron').remote.app

const state = {}

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
  vue.set(obj, keys.shift(), value)
  _callWatcherAtKeyPath(state, keyPath, old)
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

  vue.delete(obj, keys.shift())
  _callWatcherAtKeyPath(state, keyPath, old)
}

const _callWatcherAtKeyPath = (state, keyPath, old, perfix = '') => {
  if (keyPath === '' && perfix !== '') {
    return // 上一层递归中已经处理过。
  }
  if (perfix === '') {
    if (Object.prototype.hasOwnProperty.call(state.watchers, '')) {
      for (let i = 0, len = state.watchers[''].length; i < len; i++) {
        setTimeout(() => {
          state.watchers[''][i](_getValueAtKeyPath(old, ''), _getValueAtKeyPath(state.data, ''), '')
        }, 0)
      }
    }
  }
  let index = keyPath.indexOf('.')
  if (index === -1) { // 处理找不到.的情况
    let path = perfix + keyPath
    // console.log(path)
    if (Object.prototype.hasOwnProperty.call(state.watchers, path)) {
      for (let i = 0, len = state.watchers[path].length; i < len; i++) {
        setTimeout(() => {
          state.watchers[path][i](_getValueAtKeyPath(old, path), _getValueAtKeyPath(state.data, path), path)
        }, 0)
      }
    }
    return
  }
  let path = perfix
  path = path + keyPath.substr(0, index)
  if (keyPath.substr(0, index) !== '') { // 处理找到.的情况 perfix拼接新的path
    if (Object.prototype.hasOwnProperty.call(state.watchers, path)) {
      for (let i = 0, len = state.watchers[path].length; i < len; i++) {
        setTimeout(() => {
          state.watchers[path][i](_getValueAtKeyPath(old, path), _getValueAtKeyPath(state.data, path), path)
        }, 0)
      }
    }
    perfix = path + '.'
  } else {
    perfix = path
  }
  _callWatcherAtKeyPath(state, keyPath.substr(index + 1, keyPath.length), old, perfix) // 递归处理
}

const has = (state) => (keyPath) => {
  assert.strictEqual(typeof keyPath, 'string', 'First parameter must be a string')
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  return _hasKeyPath(state.data, keyPath)
}

const get = (state) => (keyPath, defaultValue = undefined) => {
  assert.strictEqual(typeof keyPath, 'string', 'First parameter must be a string')
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  const exists = _hasKeyPath(state.data, keyPath)
  const value = _getValueAtKeyPath(state.data, keyPath)
  if (!exists && typeof defaultValue !== 'undefined') {
    return defaultValue
  }
  return value
}

const setAll = (state, payload) => {
  vue.set(state, 'data', payload)
}

const set = (state, payload) => {
  assert.strictEqual(typeof payload.keyPath, 'string', 'First parameter must be a string')
  if (payload.keyPath.substr(0, 2) === '..') {
    payload.keyPath = 'statics.' + payload.keyPath.substr(2, payload.keyPath.length)
  } else if (payload.keyPath.indexOf('.') === 0) {
    payload.keyPath = 'tmp.' + payload.keyPath.substr(1, payload.keyPath.length)
  } else {
    payload.keyPath = 'config.' + payload.keyPath
  }
  _setValueAtKeyPath(state.data, payload.keyPath, payload.value)
  return true
}

const del = (state, keyPath) => {
  assert.strictEqual(typeof keyPath, 'string', 'First parameter must be a string')
  if (keyPath.substr(0, 2) === '..') {
    keyPath = 'statics.' + keyPath.substr(2, keyPath.length)
  } else if (keyPath.indexOf('.') === 0) {
    keyPath = 'tmp.' + keyPath.substr(1, keyPath.length)
  } else {
    keyPath = 'config.' + keyPath
  }
  const exists = _hasKeyPath(state.data, keyPath)

  if (exists) {
    _deleteValueAtKeyPath(state.data, keyPath)
  }
}
const watch = (state, payload) => {
  if (payload.keyPath.substr(0, 2) === '..') {
    payload.keyPath = 'statics.' + payload.keyPath.substr(2, payload.keyPath.length)
  } else if (payload.keyPath.indexOf('.') === 0) {
    payload.keyPath = 'tmp.' + payload.keyPath.substr(1, payload.keyPath.length)
  } else {
    payload.keyPath = 'config.' + payload.keyPath
  }
  if (payload.keyPath[payload.keyPath.length] === '.') {
    payload.keyPath = payload.keyPath.substr(0, payload.keyPath.length - 1)
  }
  if (!Object.prototype.hasOwnProperty.call(state.watchers, payload.keyPath)) {
    state.watchers[payload.keyPath] = []
  }
  state.watchers[payload.keyPath].push(payload.handler)
}
const {ipcRenderer} = require('electron')
state.watchers[''] = []
state.watchers[''].push(function (old, newv) {
  ipcRenderer.send('update_config', newv)
})

const mutations = {
  set,
  del,
  setAll,
  watch
}

const getters = {
  get,
  has
}

export {
  get,
  set,
  has,
  del
}

export default {
  state,
  mutations,
  getters
}
