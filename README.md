# electron-vue-ipc-settings
Sorry for my poor english. For English users, feel free to use Google Translate :)

基于IPC的线程安全的electron主进程与渲染进程之间的数据同步框架<br>
为electron和vuex设计 [electron-vue](https://github.com/SimulatedGREG/electron-vue)<br>
在主进程中修改变量,会自动同步到vuex中,自动渲染页面,vue中修改数据会自动同步到主进程中

支持subscribe: 当指定key值的变量变化时,调用回调函数

## Usage:

1. 将config.js放入src/main文件夹中一个你喜欢的位置 并在主进程中引用
2. 将config-vue.js放入vuex的moduels文件夹中
3. 在app.vue中引入:
```vuejs
import store from './store'
import { ipcRenderer } from 'electron'
ipcRenderer.on('update_config', (event, new_value) => {
    console.log('New config updated from electron', new_value)
    store.commit('setAll', new_value)
})
ipcRenderer.sendSync('pull_config')
```
4.修改config.js中的getwindow函数 返回对应的BrowserWindow object

## Demo:

```vuejs
---main---
import config from './config'
config.watch('foo', (old, new_value) => {
    console.log('config.foo changed from ', old, 'to ', new_value)
})
config.read()
config.set('foo','bar')
config.get('foo'bar'') // undefined
config.has('foo'bar'') // false
config.get('foo') // 'bar'
config.write()

---renderer---

export default {
    name: 'yourApp',
    data() {
        let foo = JSON.parse(JSON.stringify(this.$store.getters.get('foo))) // 防止在vuex的mutation外修改state
        return {
            foo:foo
        }
    },
    methods:{
        on_update() {
           this.$store.commit('set',{
             keyPath: 'foo',
             value: 'bar'
           })
           this.foo = JSON.parse(JSON.stringify(this.$store.getters.get('foo)))
        }
    }
}

```

## WIKI

配置信息分为3部分:`config` `statics` `tmp`,其中config下的变量会在read时读入,write时写入配置文件,tmp不会被保存,写入(每一次启动程序tmp都和config.js中提供的defaultconfig中的tmp相同) statics无法被修改 无法被写入 读取defaultocnfig内给出的值

简写方式:

```vuejs
config.get('foo') // config.foo
config.get('.foo') // tmp.foo
config.get('..foo') // static.foo
```

### main
read: 从默认设置中的config_path中读取配置信息,如果文件不存在,创建并写入默认文件.<br>
`config.read()`

write: 写入配置文件<br>
`config.write()`

get: 获取配置值<br>
`config.get('foo')`

set: 设置配置值<br>
`config.set('foo','bar')`

has: 返回指定keyPath是否存在<br>
`config.has('foo.bar')`

watch: 当指定keypath的值变动时执行<br>
```vuejs
config.watch('foo', (old, new_value) => {
    console.log('config.foo changed from ', old, 'to ', new_value)
})
```

### renderer


get: 获取配置值<br>
`this.$store.getters.get('foo')`

set: 设置配置值<br>
```vuejs
this.$store.commit('set',{
    keyPath: 'foo',
    value: 'bar'
})
```

has: 返回指定keyPath是否存在<br>
`this.$store.getters.has('foo.bar')`

# 鸣谢:
[electron-settings](https://github.com/nathanbuchar/electron-settings)