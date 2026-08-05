<template>
  <div class="home" flex="dir:top">
    <div class="toolbar" flex="main:justify cross:center">
      <div class="toolbar-items">
        <el-button
          @click="addFolder"
          type="primary"
          round
          class="toolbar-item add-folder"
          title="add folder to root"
          size="mini"
        >
          {{ $t('image.toolbar.addFolder') }}
        </el-button>
        <SelectedBtn :selectedList="imageList" @update="setImages" @remove="removeImages" @clearAll="emptyImages" />
        <el-button
          type="primary"
          round
          class="toolbar-item"
          :disabled="!imageList.length"
          @click="compare"
        >
          {{ $t('general.compare') }}
        </el-button>
        <el-button
          type="primary"
          round
          class="toolbar-item"
          :disabled="!imageList.length || imageList.length < 2"
          @click="dragDropCompare"
        >
          {{ $t('general.dragDropCompare') }}
        </el-button>
        <el-tooltip :content="$t('image.sequence.compareTip')">
          <el-button
            type="primary"
            round
            class="toolbar-item"
            :disabled="!collections.length || collections.length < 2"
            @click="showSequenceCompareDialog"
          >
            {{ $t('image.sequence.compare') }}
          </el-button>
        </el-tooltip>
        <el-button type="primary" round class="toolbar-item" @click="loadShareProject">
          {{ $t('image.toolbar.loadShareProject') }}
        </el-button>
        <!-- <el-button
          type="text"
          size="small"
          title="line-Browse"
          class="toolbar-item"
          :disabled="!imageList.length"
          @click="imageBrowser"
        >
          {{ $t('general.imageBrowser') }}
        </el-button> -->
      </div>
      <FileSequenceSelector />
    </div>

    <div class="content" flex-box="1">
      <Split :gutterSize="4">
        <SplitArea :size="23" :maxSize="1000" :minSize="200">
          <FileTree
            ref="folderTree"
            id="folderTree"
            :currentPath="currentPath"
            :openedFolders="imageFolders"
            :checkedFiles="checkedFiles"
            @close="onClose"
            :addFolder="addFolder"
            :defaultExpand="expandData"
            @select="onSelect"
            @addExpand="addExpandData"
            @removeExpand="removeExpandData"
          ></FileTree>
        </SplitArea>
        <SplitArea :size="77">
          <ImagePreview ref="ImagePreview" @addFolder="addFolder"></ImagePreview>
        </SplitArea>
      </Split>
    </div>

    <FileSequenceCompareDialog ref="sequenceCompareDialogRef" />
  </div>
</template>

<script>
import store from '@/store'
const { dialog } = require('@electron/remote')
import FileTree from '@/components/file-tree/FileTree.vue'
import SelectedBtn from '@/components/selected-btn'
import ShowPath from '@/components/show-path'
import FileSequenceSelector from '@/components/image-sequence'
import FileSequenceCompareDialog from '@/components/image-sequence-compare-dialog'
import ImagePreview from './ImagePreview'
import { SnapshotHelper } from '@/tools/compress'
import { createNamespacedHelpers } from 'vuex'
const { mapGetters, mapActions } = createNamespacedHelpers('imageStore')
import addDragFolderListener from '@/utils/dragFolder.js'
import { imageCache } from '@/utils/imageCache'

export default {
  name: 'ImageRoot',
  components: { FileTree, ImagePreview, SelectedBtn, ShowPath, FileSequenceSelector, FileSequenceCompareDialog },
  data() {
    return {
      isDraging: false,
      checkedFiles: [],
      dragFiles: []
    }
  },
  computed: {
    ...mapGetters(['imageList', 'imageFolders', 'expandData', 'currentPath', 'collections'])
  },
  mounted() {
    addDragFolderListener(document.getElementById('folderTree'))
  },
  deactivated() {
    // Release heavy renderer memory when navigating away
    imageCache.clear()
    imageCache.clearPreloadPool()
    this.$refs.ImagePreview?.cleanup()
  },
  methods: {
    ...mapActions([
      'removeImages',
      'emptyImages',
      'setImageFolders',
      'setImages',
      'setFolderPath',
      'addExpandData',
      'removeExpandData'
    ]),
    compare() {
      this.$router.push('/image/compare')
    },
    dragDropCompare() {
      this.$router.push('/image/drag-drop-compare')
    },
    showSequenceCompareDialog() {
      this.$refs.sequenceCompareDialogRef.show()
    },
    imageBrowser() {
      this.$router.push('/image/browser')
    },
    addFolder() {
      dialog
        .showOpenDialog({
          title: 'add folder',
          properties: ['openDirectory']
        })
        .then(({ canceled, filePaths }) => {
          if (!filePaths || !(filePaths.length > 0)) {
            this.$message.info('Cancelled to add folder')
          } else if (this.imageFolders.includes(filePaths[0])) {
            this.$message.info('The folder has been added.')
          } else {
            this.setImageFolders([...this.imageFolders, filePaths[0]])
            this.$nextTick(() => {
              this.$message.success('Successed to add folder')
            })
          }
        })
    },
    onClose(data) {
      this.removeExpandData(data.path)
      const index = this.imageFolders.findIndex((item) => {
        return item === data.path
      })
      if (index >= 0) {
        const tmp = [...this.imageFolders]
        tmp.splice(index, 1)
        this.setImageFolders(tmp)
      }
      const removeList = []
      this.imageList.forEach((item) => {
        if (item.startsWith(data.path)) {
          removeList.push(item)
        }
      })
      this.removeImages(removeList)
      this.setFolderPath('')
    },
    onSelect(data) {
      // 如果选中了文件夹 更新当前激活的文件夹
      if (data.type === 0) {
        this.$nextTick(() => {
          // 等左侧导航树先渲染
          this.setFolderPath(data.path)
        })
      }
    },
    async loadShareProject() {
      const snapshotHelper = new SnapshotHelper()
      const res = await snapshotHelper.load()
      console.log('res', res)
      if (res) {
        const { config, files } = res
        this.$router.push({
          path: '/image/compare',
          query: { snapshotMode: true }
        })
        console.log('store', store, { config, files })
        store.dispatch('imageSnapshotStore/setSnapshotConfig', config)
        store.dispatch('imageSnapshotStore/setFiles', files)
      } else {
        this.$message.info('cancel')
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';

.home {
  color: $labelColor;
  height: 100%;
  width: 100%;
  margin: 0px;
  padding: 0px;
  box-sizing: border-box;
  position: relative;

  .toolbar {
    padding: 0 10px;
    border-bottom: 1px solid #eee;

    .toolbar-items {
      position: relative;
    }

    .toolbar-item + .toolbar-item {
      margin-left: 10px;
    }
  }

  .content {
    overflow: auto;
  }
}
</style>
