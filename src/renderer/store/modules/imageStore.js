import * as GLOBAL_CONSTANT from '../../constants'
import { trimSep } from '@/utils/file'
import {
  DEFAULT_COMPARE_MODE,
  DEFAULT_SORT_CONFIG,
  rebuildCompareTask,
  swapCompareTaskSides
} from '@/utils/imagePairing'
import { logCompareEvent, logDiagnosticError } from '../../utils/diagnosticLog'

export const useCurrentCollection = (state) => {
  let collection = state.collections.find((collection) => collection.name === state.collectionName)
  if (!collection) {
    collection = {
      name: state.collectionName,
      type: 'file',
      list: []
    }
    state.collections.push(collection)
  }
  return collection
}

const createCompareTask = () => ({
  sources: {
    left: [],
    right: []
  },
  leftItems: [],
  rightItems: [],
  leftSort: { ...DEFAULT_SORT_CONFIG },
  rightSort: { ...DEFAULT_SORT_CONFIG },
  rows: [],
  currentIndex: 0,
  mode: DEFAULT_COMPARE_MODE,
  started: false,
  dirty: false,
  baselineSide: 'left',
  version: 0
})

const mergeCompareSources = (taskSources = {}, fallbackSources = {}) => ({
  left: Array.isArray(taskSources.left) ? taskSources.left : (fallbackSources.left || []),
  right: Array.isArray(taskSources.right) ? taskSources.right : (fallbackSources.right || [])
})

const normalizeCompareTask = (task = {}, fallbackTask = createCompareTask()) => {
  const baseTask = createCompareTask()
  const compareTask = rebuildCompareTask({
    ...baseTask,
    ...fallbackTask,
    ...task,
    sources: mergeCompareSources(task.sources, fallbackTask.sources || baseTask.sources)
  })
  compareTask.started = typeof compareTask.started === 'boolean' ? compareTask.started : false
  compareTask.dirty = typeof compareTask.dirty === 'boolean' ? compareTask.dirty : false
  compareTask.baselineSide = compareTask.baselineSide === 'right' ? 'right' : 'left'
  compareTask.version = Number.isFinite(compareTask.version) ? compareTask.version : 0
  return compareTask
}

const summarizeCompareTask = (task = {}) => ({
  sources: {
    left: Array.isArray(task.sources?.left) ? task.sources.left.length : 0,
    right: Array.isArray(task.sources?.right) ? task.sources.right.length : 0
  },
  leftItems: Array.isArray(task.leftItems) ? task.leftItems.length : 0,
  rightItems: Array.isArray(task.rightItems) ? task.rightItems.length : 0,
  rows: Array.isArray(task.rows) ? task.rows.length : 0,
  currentIndex: Number.isInteger(task.currentIndex) ? task.currentIndex : 0,
  mode: task.mode,
  started: Boolean(task.started),
  dirty: Boolean(task.dirty),
  version: Number.isFinite(task.version) ? task.version : 0
})

const logTaskMutation = (event, previous, next) => {
  const currentIndex = Number.isInteger(next.currentIndex) ? next.currentIndex : 0
  const row = Array.isArray(next.rows) ? next.rows[currentIndex] : null
  logCompareEvent(event, {
    taskVersion: next.version,
    index: currentIndex,
    rowId: row && row.id
  }, {
    before: summarizeCompareTask(previous),
    after: summarizeCompareTask(next)
  })
}

const imageStore = {
  namespaced: true,
  state: {
    imageFolders: [],
    imageList: [],
    collections: [
      {
        name: GLOBAL_CONSTANT.DEFAULT_IMAGE_COLLECTION_NAME,
        type: 'file', // file / url / function
        list: []
      }
    ],
    collectionName: GLOBAL_CONSTANT.DEFAULT_IMAGE_COLLECTION_NAME,
    imageConfig: {
      smooth: true,
      layout: GLOBAL_CONSTANT.LAYOUT_1x2,
      displayMode: 'fit',
      defaultSort: {
        order: 'asc',
        field: 'name'
      }
    },
    //当前文件夹路径
    currentPath: '',
    // 记忆文件树展开
    expandData: [],
    recentCompareFolders: {
      left: '',
      right: ''
    },
    compareTask: createCompareTask()
  },
  getters: {
    imageList: (state) => {
      const collection = useCurrentCollection(state)
      return collection.list
    },
    collection: (state) => {
      const collection = useCurrentCollection(state)
      return collection
    },
    collections: (state) => state.collections,
    imageFolders: (state) => state.imageFolders,
    getImageFolders: (state) => () => state.imageFolders,
    imageConfig: (state) => state.imageConfig,
    currentPath: (state) => state.currentPath,
    expandData: (state) => state.expandData,
    recentCompareFolders: (state) => state.recentCompareFolders,
    compareTask: (state) => state.compareTask,
    compareRows: (state) => state.compareTask.rows,
    currentCompareRow: (state) => state.compareTask.rows[state.compareTask.currentIndex] || null
  },
  mutations: {
    SET_IMAGE_CONFIG: (state, configOb) => {
      const newConfig = Object.assign({}, state.imageConfig, configOb)
      state.imageConfig = newConfig
    },
    SET_IMAGE_FOLDERS: (state, folders) => {
      state.imageFolders = folders.map(trimSep)
    },
    ADD_IMAGE_FOLDER: (state, folder) => {
      if (!state.imageFolders.includes(trimSep(folder))) {
        const tmp = [...state.imageFolders]
        tmp.push(folder)
        state.imageFolders = tmp
      }
    },
    REMOVE_IMAGE_FOLDER: (state, folder) => {
      if (state.imageFolders.includes(trimSep(folder))) {
        const tmp = [...state.imageFolders]
        tmp.splice(state.imageFolders.indexOf(folder), 1)
        state.imageFolders = tmp
      }
    },
    ADD_IMAGE: (state, image) => {
      const collection = useCurrentCollection(state)
      if (image && !collection.list.includes(image)) {
        collection.list = [...collection.list, image]
      }
    },
    ADD_IMAGES: (state, images) => {
      const collection = useCurrentCollection(state)
      if (images && images.length) {
        collection.list = [...new Set(collection.list.concat(images))]
      }
    },
    REMOVE_IMAGES: (state, images) => {
      const collection = useCurrentCollection(state)
      const tmp = [...collection.list]
      images.forEach((image) => {
        let index = tmp.indexOf(image)
        if (index > -1) {
          tmp.splice(index, 1)
        }
      })
      collection.list = tmp
    },
    SET_IMAGES: (state, newImageList) => {
      const collection = useCurrentCollection(state)
      collection.list = newImageList
    },
    EMPTY_IMAGE: (state) => {
      const collection = useCurrentCollection(state)
      collection.list = []
    },
    ADD_COLLECTION: (state, newCollection) => {
      const collection = state.collections.find((collection) => collection.name === newCollection.name)
      if (!collection) {
        state.collections = [...state.collections, newCollection]
      }
    },
    REMOVE_COLLECTION: (state, collectionName) => {
      const tmpList = [...state.collections]
      const collectionIndex = tmpList.findIndex((collection) => collection.name === collectionName)
      if (collectionIndex > -1) {
        tmpList.splice(collectionIndex, 1)
        state.collections = tmpList
      }
    },
    REMOVE_TMP_COLLECTION: (state) => {
      const collection = state.collections.find((collection) => collection.name === state.collectionName)
      if (collection && collection.isTmp) {
        state.collectionName = GLOBAL_CONSTANT.DEFAULT_IMAGE_COLLECTION_NAME
      }
      const tmpList = [...state.collections.filter((collection) => !collection.isTmp)]
      state.collections = tmpList
    },
    SET_COLLECTION_NAME: (state, newCollectionName) => {
      state.collectionName = newCollectionName
    },
    // 修改当前文件夹
    SET_CURRENT_FOLDER_PATH: (state, newFolderPath) => {
      state.currentPath = newFolderPath
    },
    SET_RECENT_COMPARE_FOLDER: (state, { side, folderPath }) => {
      state.recentCompareFolders = { ...(state.recentCompareFolders || {}), [side]: folderPath }
    },
    // 记忆文件树展开情况
    ADD_IMAGE_EXPAND_DATA: (state, newOpenFolder) => {
      state.expandData.push(newOpenFolder)
    },
    REMOVE_IMAGE_EXPAND_DATA: (state, closeFolder) => {
      state.expandData = state.expandData.filter((item) => {
        return !item.startsWith(closeFolder)
      })
    },
    SET_COMPARE_TASK: (state, task) => {
      const previous = state.compareTask
      state.compareTask = normalizeCompareTask(task, state.compareTask)
      logTaskMutation('compare_task_set', previous, state.compareTask)
    },
    PATCH_COMPARE_TASK: (state, patch) => {
      const previous = state.compareTask
      state.compareTask = normalizeCompareTask({
        ...state.compareTask,
        ...patch,
        version: state.compareTask.version + 1
      }, state.compareTask)
      logTaskMutation('compare_task_patch', previous, state.compareTask)
    },
    CLEAR_COMPARE_TASK: (state) => {
      const previous = state.compareTask
      state.compareTask = createCompareTask()
      logTaskMutation('compare_task_clear', previous, state.compareTask)
    },
    // Clear all image data: folders, selected images, all collections, and expand data
    CLEAR_ALL_IMAGE_DATA: (state) => {
      state.imageFolders = []
      state.collections.forEach((c) => { c.list = [] })
      state.imageList = []
      state.expandData = []
    }
  },
  actions: {
    setImageConfig({ commit }, config) {
      commit('SET_IMAGE_CONFIG', config)
    },
    setImageFolders({ commit }, folders) {
      commit('SET_IMAGE_FOLDERS', folders)
    },
    addImageFolders({ commit }, folders) {
      if (!Array.isArray(folders)) {
        commit('ADD_IMAGE_FOLDER', folders)
      } else {
        folders.forEach((item) => commit('ADD_IMAGE_FOLDER', item))
      }
    },
    removeImageFolders({ commit }, folders) {
      if (!Array.isArray(folders)) {
        commit('REMOVE_IMAGE_FOLDER', folders)
      } else {
        folders.forEach((item) => commit('REMOVE_IMAGE_FOLDER', item))
      }
    },
    addImages({ commit }, images) {
      if (!Array.isArray(images)) {
        commit('ADD_IMAGE', images)
      } else {
        commit('ADD_IMAGES', images)
      }
    },
    removeImages({ commit }, images) {
      commit('REMOVE_IMAGES', Array.isArray(images) ? images : [images])
    },
    setImages({ commit }, newImageList) {
      commit('SET_IMAGES', newImageList)
    },
    emptyImages({ commit }) {
      commit('EMPTY_IMAGE')
    },
    addCollection({ commit }, _newCollection) {
      const newCollection = Object.assign(
        {
          name: '_newCollection',
          type: 'file',
          list: []
        },
        _newCollection
      )
      commit('ADD_COLLECTION', newCollection)
    },
    removeCollection({ commit }, collectionName) {
      if (collectionName === GLOBAL_CONSTANT.DEFAULT_IMAGE_COLLECTION_NAME) {
        console.log('cannot remove default image collection')
        return
      }
      commit('REMOVE_COLLECTION', collectionName)
    },
    removeTmpCollection({ commit }) {
      commit('REMOVE_TMP_COLLECTION')
    },
    setCollectionName({ commit }, newCollectionName) {
      commit('SET_COLLECTION_NAME', newCollectionName)
    },
    //修改当前文件夹路径
    setFolderPath({ commit }, newFolderPath) {
      commit('SET_CURRENT_FOLDER_PATH', newFolderPath)
    },
    setRecentCompareFolder({ commit }, payload) {
      commit('SET_RECENT_COMPARE_FOLDER', payload)
    },
    // 记忆文件树展开
    addExpandData({ commit }, newFolder) {
      commit('ADD_IMAGE_EXPAND_DATA', newFolder)
    },
    removeExpandData({ commit }, newFolderArr) {
      commit('REMOVE_IMAGE_EXPAND_DATA', newFolderArr)
    },
    setCompareTask({ commit }, compareTask) {
      commit('SET_COMPARE_TASK', compareTask)
    },
    patchCompareTask({ commit }, patch) {
      commit('PATCH_COMPARE_TASK', patch)
    },
    clearCompareTask({ commit }) {
      commit('CLEAR_COMPARE_TASK')
    },
    clearAllImageData({ commit }) {
      commit('CLEAR_ALL_IMAGE_DATA')
    },
    swapCompareTask({ state, commit }) {
      commit('SET_COMPARE_TASK', {
        ...swapCompareTaskSides(state.compareTask),
        version: state.compareTask.version + 1
      })
    },
    refreshCompareTask({ state, commit }, patch = {}) {
      const startedAt = Date.now()
      logCompareEvent('compare_task_refresh_start', {
        taskVersion: state.compareTask.version,
        index: state.compareTask.currentIndex,
        rowId: state.compareTask.rows[state.compareTask.currentIndex]?.id
      }, {
        patchKeys: Object.keys(patch)
      })
      try {
        const nextTask = rebuildCompareTask({
          ...state.compareTask,
          ...patch,
          sources: {
            left: patch.sources && Array.isArray(patch.sources.left) ? patch.sources.left : state.compareTask.sources.left,
            right: patch.sources && Array.isArray(patch.sources.right) ? patch.sources.right : state.compareTask.sources.right
          },
          version: state.compareTask.version + 1
        })
        commit('SET_COMPARE_TASK', nextTask)
        logCompareEvent('compare_task_refresh_done', {
          taskVersion: nextTask.version,
          index: nextTask.currentIndex,
          rowId: nextTask.rows[nextTask.currentIndex]?.id
        }, { durationMs: Date.now() - startedAt })
        return nextTask
      } catch (error) {
        logDiagnosticError('compare', 'compare_task_refresh_failed', error, {
          taskVersion: state.compareTask.version,
          index: state.compareTask.currentIndex,
          rowId: state.compareTask.rows[state.compareTask.currentIndex]?.id
        }, { durationMs: Date.now() - startedAt })
        throw error
      }
    }
  }
}

export default imageStore
