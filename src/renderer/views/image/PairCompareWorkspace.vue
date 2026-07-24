<template>
  <div class="pair-compare-workspace">
    <div v-if="!compareRows.length" class="workspace-empty">
      <p>{{ $t('dashboard.compareTask.workspace.empty') }}</p>
      <el-button size="mini" type="primary" @click="goDashboard">
        {{ $t('dashboard.compareTask.workspace.returnToDashboard') }}
      </el-button>
    </div>
    <template v-else>
      <div class="workspace-controls">
        <el-button size="mini" @click="goDashboard">
          <i class="el-icon-d-arrow-left"></i>
          {{ $t('dashboard.compareTask.workspace.returnToDashboard') }}
        </el-button>
        <div class="pair-nav">
          <el-button size="mini" :disabled="!hasPrev" @click="stepRow(-1)">
            {{ $t('dashboard.compareTask.workspace.prev') }}
          </el-button>
          <span>{{ currentDisplayIndex }}/{{ compareRows.length }}</span>
          <el-button size="mini" :disabled="!hasNext" @click="stepRow(1)">
            {{ $t('dashboard.compareTask.workspace.next') }}
          </el-button>
        </div>
        <div class="pair-status">{{ currentStatus }}</div>
        <el-radio-group :value="compareMode" size="mini" @input="changeMode">
          <el-radio-button label="side-by-side">
            {{ $t('dashboard.compareTask.workspace.modes.sideBySide') }}
          </el-radio-button>
          <el-radio-button label="single">
            {{ $t('dashboard.compareTask.workspace.modes.single') }}
          </el-radio-button>
          <el-radio-button label="split">
            {{ $t('dashboard.compareTask.workspace.modes.split') }}
          </el-radio-button>
        </el-radio-group>
        <el-button
          size="mini"
          :type="displayMode === 'original' ? 'primary' : 'default'"
          @click="toggleDisplayMode"
          :title="$t('imageCenter.originalMode')"
        >
          {{ $t('imageCenter.originalMode') }}
        </el-button>
        <span class="keyboard-hint">↑↓键翻译，←→键切换对比，双击调整单图缩放，空格键复位</span>
      </div>
      <div v-if="compareTask.dirty" class="workspace-notice workspace-notice-warning">
        {{ $t('dashboard.compareTask.warnings.staleBody') }}
      </div>
      <div v-if="showSplitFallbackNotice" class="workspace-notice">
        {{ $t('dashboard.compareTask.workspace.splitUnavailable') }}
      </div>
      <div
        v-show="showSideBySide"
        ref="sideBySide"
        :class="['side-by-side', { stacked: isStacked, 'single-page': isSingleMode }]"
      >
        <div
          v-show="!isSingleMode"
          class="pair-panel"
          @mouseenter="hoveredSide = 'left'"
          @mouseleave="clearHoveredSide('left')"
        >
          <div class="panel-body">
            <ImageCanvas
              v-if="displayedLeft && panelReady"
              ref="leftCanvas"
              :key="`left-${currentRow.id}`"
              :index="0"
              :path="displayedLeft.path"
              :displayName="displayedLeft.displayName"
              :pairTaskMode="true"
              :_width="panelSize.width"
              :_height="panelSize.height"
            />
            <div v-else class="panel-placeholder">
              {{ $t('dashboard.compareTask.workspace.placeholders.unmatchedBaseline') }}
            </div>
          </div>
        </div>
        <div class="pair-panel" @mouseenter="hoveredSide = 'right'" @mouseleave="clearHoveredSide('right')">
          <div class="panel-body">
            <ImageCanvas
              v-if="displayedRight && panelReady"
              ref="rightCanvas"
              :key="`right-${currentRow.id}`"
              :index="1"
              :path="displayedRight.path"
              :displayName="displayedRight.displayName"
              :pairTaskMode="true"
              :_width="panelSize.width"
              :_height="panelSize.height"
            />
            <div v-else class="panel-placeholder">
              {{ $t('dashboard.compareTask.workspace.placeholders.unmatchedComparison') }}
            </div>
          </div>
        </div>
      </div>
      <div v-show="showSplitCompare" class="split-mode">
        <ImageDragDropCompare ref="splitCompare" :showCompare="true" :isExternal="true" :embedded="true" />
      </div>
    </template>
  </div>
</template>

<script>
import path from 'path'
import chokidar from 'chokidar'
import { createNamespacedHelpers } from 'vuex'
import ImageCanvas from './components/ImageCanvas'
import ImageDragDropCompare from './ImageDragDropCompare'
import { getImageUrlSyncNoCache } from '@/utils/image'
import { inspectImageSourceFreshness } from '@/utils/imageComparisonSources'

const { mapGetters, mapActions } = createNamespacedHelpers('imageStore')

export default {
  name: 'PairCompareWorkspace',
  components: {
    ImageCanvas,
    ImageDragDropCompare
  },
  data() {
    return {
      panelSize: {
        width: 400,
        height: 400
      },
      panelReady: false,
      isStacked: false,
      liveWatcher: null,
      warnedDirty: false,
      hoveredSide: null,
      previewSide: null
    }
  },
  computed: {
    ...mapGetters(['compareTask', 'compareRows', 'currentCompareRow', 'imageConfig']),
    compareMode() {
      return ['side-by-side', 'single', 'split'].includes(this.compareTask.mode)
        ? this.compareTask.mode
        : 'side-by-side'
    },
    isSingleMode() {
      return this.compareMode === 'single'
    },
    currentRow() {
      return this.currentCompareRow
    },
    displayMode() {
      return this.imageConfig.displayMode || 'fit'
    },
    currentDisplayIndex() {
      return this.compareRows.length ? this.compareTask.currentIndex + 1 : 0
    },
    hasPrev() {
      return this.compareTask.currentIndex > 0
    },
    hasNext() {
      return this.compareTask.currentIndex < this.compareRows.length - 1
    },
    currentStatus() {
      return this.$t(`dashboard.compareTask.status.${this.getRowStatus(this.currentRow)}`)
    },
    splitAvailable() {
      return Boolean(this.currentRow && this.currentRow.left && this.currentRow.right)
    },
    showSplitCompare() {
      return this.compareMode === 'split' && this.splitAvailable
    },
    showSideBySide() {
      return this.compareMode !== 'split' || !this.splitAvailable
    },
    showSplitFallbackNotice() {
      return this.compareMode === 'split' && !this.splitAvailable
    },
    displayedLeft() {
      return this.currentRow && this.currentRow.left
    },
    displayedRight() {
      return this.currentRow && this.currentRow.right
    }
  },
  mounted() {
    this.activateWorkspace()
  },
  activated() {
    this.activateWorkspace()
  },
  deactivated() {
    this.deactivateWorkspace()
  },
  beforeDestroy() {
    this.deactivateWorkspace()
  },
  methods: {
    ...mapActions(['patchCompareTask', 'setImageConfig']),
    toggleDisplayMode() {
      this.setImageConfig({ displayMode: this.displayMode === 'original' ? 'fit' : 'original' })
    },
    getRowStatus(row) {
      if (!row || !row.left) {
        return 'missingBaseline'
      }
      if (!row.right) {
        return 'missingComparison'
      }
      return 'ready'
    },
    goDashboard() {
      this.$router.push('/dashboard')
    },
    async stepRow(offset) {
      const nextIndex = Math.min(Math.max(this.compareTask.currentIndex + offset, 0), this.compareRows.length - 1)
      if (nextIndex !== this.compareTask.currentIndex) {
        await this.patchCompareTask({ currentIndex: nextIndex, started: true })
      }
    },
    async changeMode(mode) {
      await this.patchCompareTask({ mode, started: true })
    },
    resetCurrentGroup() {
      this.cancelPreview()
      this.$bus.$emit('image_handleSelect', null)
      if (this.showSideBySide) {
        const canvasRefs = ['leftCanvas', 'rightCanvas']
        canvasRefs.forEach((refName) => {
          this.$refs[refName] && this.$refs[refName].reset(false)
        })
      }
      if (this.showSplitCompare && this.$refs.splitCompare) {
        this.$refs.splitCompare.reset()
      }
    },
    activateWorkspace() {
      if (this.workspaceActive) {
        this.syncLiveWatcher()
        this.checkTaskFreshness()
        return
      }
      this.workspaceActive = true
      window.addEventListener('resize', this.syncPanelSize, true)
      window.addEventListener('keydown', this.handleKeydown, true)
      window.addEventListener('keyup', this.handleKeyup, true)
      window.addEventListener('blur', this.cancelPreview, true)
      this.$nextTick(() => {
        this.updateSplitCompare()
        if (this.showSplitCompare && this.$refs.splitCompare) {
          window.requestAnimationFrame(() => this.$refs.splitCompare.refreshLayout())
        }
        window.requestAnimationFrame(this.syncPanelSize)
      })
      this.syncLiveWatcher()
      this.checkTaskFreshness()
    },
    deactivateWorkspace() {
      if (!this.workspaceActive) {
        return
      }
      this.workspaceActive = false
      window.removeEventListener('keydown', this.handleKeydown, true)
      window.removeEventListener('keyup', this.handleKeyup, true)
      window.removeEventListener('blur', this.cancelPreview, true)
      window.removeEventListener('resize', this.syncPanelSize, true)
      this.cancelPreview()
      this.closeLiveWatcher()
    },
    syncPanelSize() {
      const host = this.$refs.sideBySide
      if (!host) {
        return
      }
      const width = host.clientWidth || 0
      const height = host.clientHeight || 0
      const single = this.isSingleMode
      const stacked = !single && width < 800
      this.isStacked = stacked
      this.panelSize = {
        width: Math.max(Math.floor((width - (stacked || single ? 0 : 6)) / (stacked || single ? 1 : 2)), 240),
        height: Math.max(Math.floor((height - (stacked ? 6 : 0)) / (stacked ? 2 : 1)), 240)
      }
      this.panelReady = true
    },
    buildSplitList() {
      if (!this.splitAvailable) {
        return []
      }
      return [
        {
          name: this.currentRow.left.displayName || this.currentRow.left.name,
          imageUrl: this.getSplitImageUrl(this.currentRow.left.path)
        },
        {
          name: this.currentRow.right.displayName || this.currentRow.right.name,
          imageUrl: this.getSplitImageUrl(this.currentRow.right.path)
        }
      ]
    },
    updateSplitCompare() {
      if (!this.showSplitCompare || !this.$refs.splitCompare) {
        return
      }
      this.$refs.splitCompare.setImageInfoList(this.buildSplitList())
    },
    getSplitImageUrl(imagePath) {
      return getImageUrlSyncNoCache(imagePath)
    },
    getWatchPaths() {
      const collect = (this.compareTask.sources.left || []).concat(this.compareTask.sources.right || [])
      const seen = new Set()
      return collect.reduce((list, source) => {
        if (!source || !source.path) {
          return list
        }
        const sourcePath = path.resolve(String(source.path))
        if (seen.has(sourcePath)) {
          return list
        }
        seen.add(sourcePath)
        list.push(sourcePath)
        return list
      }, [])
    },
    syncLiveWatcher() {
      if (!this.workspaceActive) {
        return
      }
      const nextPaths = this.getWatchPaths()
      if (!nextPaths.length) {
        this.closeLiveWatcher()
        return
      }
      const nextKey = nextPaths.join('\n')
      if (this.liveWatcher && this.liveWatcherKey === nextKey) {
        return
      }
      this.closeLiveWatcher()
      this.liveWatcherKey = nextKey
      this.liveWatcher = chokidar.watch(nextPaths, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 800,
          pollInterval: 100
        }
      })
      this.liveWatcher
        .on('change', this.handleSourceChange)
        .on('add', this.handleSourceStructureChange)
        .on('unlink', this.handleSourceStructureChange)
        .on('unlinkDir', this.handleSourceStructureChange)
    },
    closeLiveWatcher() {
      if (this.liveWatcher) {
        this.liveWatcher.close()
        this.liveWatcher = null
      }
      this.liveWatcherKey = ''
    },
    isCurrentRowPath(filePath) {
      if (!this.currentRow) {
        return false
      }
      return [this.currentRow.left && this.currentRow.left.path, this.currentRow.right && this.currentRow.right.path]
        .filter(Boolean)
        .some((itemPath) => path.resolve(itemPath) === filePath)
    },
    handleSourceChange(changedPath) {
      const resolvedPath = path.resolve(String(changedPath))
      if (this.isCurrentRowPath(resolvedPath)) {
        this.$nextTick(() => {
          this.updateSplitCompare()
        })
      }
    },
    async handleSourceStructureChange(changedPath) {
      if (this.compareTask.dirty) {
        return
      }
      const resolvedPath = path.resolve(String(changedPath))
      if (!this.shouldMarkDirtyForPath(resolvedPath)) {
        return
      }
      await this.patchCompareTask({ dirty: true })
      this.warnDirty()
    },
    shouldMarkDirtyForPath(changedPath) {
      return this.getTrackedSources().some((source) => this.matchesSourceStructureChange(source, changedPath))
    },
    getTrackedSources() {
      return (this.compareTask.sources.left || [])
        .concat(this.compareTask.sources.right || [])
        .filter((source) => source && source.path)
        .map((source) => ({
          path: path.resolve(String(source.path)),
          type: source.type
        }))
    },
    matchesSourceStructureChange(source, changedPath) {
      if (source.type === 'file') {
        return source.path === changedPath
      }
      return source.path === changedPath || path.dirname(changedPath) === source.path
    },
    async checkTaskFreshness() {
      const [left, right] = await Promise.all([
        inspectImageSourceFreshness(this.compareTask.sources.left, this.compareTask.leftItems),
        inspectImageSourceFreshness(this.compareTask.sources.right, this.compareTask.rightItems)
      ])
      if (!left.stale && !right.stale) {
        return
      }
      if (!this.compareTask.dirty) {
        await this.patchCompareTask({ dirty: true })
      }
      this.warnDirty()
    },
    warnDirty() {
      if (this.warnedDirty) {
        return
      }
      this.warnedDirty = true
      this.$message.warning(this.$t('dashboard.compareTask.warnings.staleToast'))
    },
    handleKeydown(event) {
      if (this.shouldIgnoreKeydown(event)) {
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.stepRow(-1)
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.stepRow(1)
      }
      if (event.code === 'Space') {
        event.preventDefault()
        this.resetCurrentGroup()
      }
      if (['ArrowLeft', 'ArrowRight'].includes(event.key) && this.canPreviewHoveredSide()) {
        event.preventDefault()
        this.startPreview()
      }
    },
    handleKeyup(event) {
      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.cancelPreview()
      }
    },
    cancelPreview() {
      const targetCanvas = this.getCanvas(this.previewSide)
      targetCanvas && targetCanvas.setCoverStatus({}, false)
      this.previewSide = null
    },
    startPreview() {
      if (this.previewSide === this.hoveredSide) {
        return
      }
      this.cancelPreview()
      const sourceSide = this.hoveredSide === 'left' ? 'right' : 'left'
      const targetCanvas = this.getCanvas(this.hoveredSide)
      const sourceCanvas = this.getCanvas(sourceSide)
      if (targetCanvas && sourceCanvas) {
        this.previewSide = this.hoveredSide
        targetCanvas.setCoverStatus(sourceCanvas.getSnapshot(), true)
      }
    },
    getCanvas(side) {
      return side ? this.$refs[`${side}Canvas`] : null
    },
    canPreviewHoveredSide() {
      return this.showSideBySide && this.hoveredSide && this.currentRow && this.currentRow.left && this.currentRow.right
    },
    clearHoveredSide(side) {
      if (this.hoveredSide === side) {
        this.hoveredSide = null
        this.previewSide = null
      }
    },
    shouldIgnoreKeydown(event) {
      const tagName = event.target && event.target.tagName
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || event.metaKey || event.ctrlKey || event.altKey
    }
  },
  created() {
    this.workspaceActive = false
    this.liveWatcherKey = ''
  },
  watch: {
    currentRow: {
      handler() {
        this.updateSplitCompare()
      },
      immediate: true
    },
    showSplitCompare() {
      this.$nextTick(() => {
        this.updateSplitCompare()
        if (this.showSplitCompare && this.$refs.splitCompare) {
          window.requestAnimationFrame(() => this.$refs.splitCompare.refreshLayout())
        }
      })
    },
    compareMode() {
      this.cancelPreview()
      this.$nextTick(this.syncPanelSize)
    },
    showSideBySide(visible) {
      if (!visible) {
        return
      }
      this.$nextTick(() => {
        this.syncPanelSize()
      })
    },
    'compareTask.dirty'(value) {
      if (!value) {
        this.warnedDirty = false
      }
    },
    'compareTask.version'() {
      this.syncLiveWatcher()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.pair-compare-workspace {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  padding: 6px;
  box-sizing: border-box;
  background: #f4f4f5;

  .workspace-empty,
  .workspace-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    border-radius: 10px;
    background: #fff;
    color: $labelColor;
  }

  .workspace-notice-warning {
    color: #8a5a00;
    background: #fff7e6;
    border: 1px solid #f3d19e;
  }

  .workspace-empty {
    flex: 1;
    flex-direction: column;
  }

  .workspace-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 6px;
    background: #fff;
    flex-wrap: nowrap;
  }

  .pair-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pair-status {
    min-width: 110px;
    color: $labelColor;
  }

  .keyboard-hint {
    margin-left: auto;
    color: $labelColor;
    font-size: 12px;
    white-space: nowrap;
  }

  .side-by-side,
  .split-mode {
    min-height: 0;
    flex: 1;
  }

  .split-mode {
    display: flex;
    min-width: 0;
  }

  .side-by-side {
    display: flex;
    gap: 6px;
  }

  .side-by-side.stacked {
    flex-direction: column;
  }

  .pair-panel {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    border-radius: 6px;
    overflow: hidden;
    background: #fff;
    border: 1px solid #e6e8ee;
  }

  .panel-body {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  .panel-body > * {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .panel-placeholder {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    color: $labelColor;
  }
}
</style>
