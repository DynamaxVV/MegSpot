import Vue from 'vue'
import Vuex from 'vuex'
import { isExist } from '../utils/file'

// 注释这个的原因是因为会导致vuex操作失败
import PersistedState from 'vuex-electron-store'
import modules from './modules'

import { DEFAULT_HOTKEYS } from '@/tools/hotkey'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules,
  // 如果使用插件 vuex 无法使用console.log debugger 进行调试
  plugins: [PersistedState.create()],
  strict: process.env.NODE_ENV !== 'production'
})
const checkStore = function (pathList = [], removeFnName = '') {
  let removeList = []
  pathList.forEach((item) => {
    if (!item || !isExist(item)) {
      removeList.push(item)
    }
  })
  store.dispatch(removeFnName, removeList)
}

const checkHotkeysStore = () => {
  const savedHotkeys = new Map(preferenceStore.preference.hotkeys.map((hotkey) => [hotkey.name, hotkey]))
  const newHotkeys = DEFAULT_HOTKEYS.map((defaultHotkey) => {
    const savedHotkey = savedHotkeys.get(defaultHotkey.name)
    return savedHotkey
      ? { ...defaultHotkey, keysArr: savedHotkey.keysArr }
      : defaultHotkey
  })
  store.dispatch('preferenceStore/setPreference', {
    hotkeys: newHotkeys
  })
}

// 校验文件/文件夹存在性 移除不存在的  todo:改成单次不展示
const { imageStore = {}, videoStore = {}, preferenceStore } = store.state
const { imageFolders = [], imageList = [] } = imageStore
const { videoFolders = [], videoList = [] } = videoStore
store.dispatch('imageStore/clearCompareTask')
checkStore(imageFolders, 'imageStore/removeImageFolders')
checkStore(imageList, 'imageStore/removeImages')
checkStore(videoFolders, 'videoStore/removeVideoFolders')
checkStore(videoList, 'videoStore/removeVideos')
checkHotkeysStore()

export default store
