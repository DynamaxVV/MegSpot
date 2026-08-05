<template>
  <div
    class="pair-compare-workspace"
    :style="workspaceBgStyle"
    :class="{ 'dark-bg': isDarkBg, 'review-panel-resizing': reviewPanelResizing }"
  >
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
          <el-popover
            ref="rowPopover"
            placement="bottom"
            trigger="click"
            popper-class="row-list-popover"
            @show="scrollToActiveRow"
          >
            <div class="row-list" slot="reference">
              <span class="row-progress-text">{{ currentDisplayIndex }}/{{ compareRows.length }}</span>
              <i class="el-icon-arrow-down el-icon--right"></i>
            </div>
            <div ref="rowListScroll" class="row-list-scroll">
              <div
                v-for="(row, index) in compareRows"
                :key="row.id"
                class="row-list-item"
                :class="{ active: index === compareTask.currentIndex }"
                @click="goToRow(index)"
              >
                <span class="row-index">{{ index + 1 }}</span>
                <span class="row-names">
                  <span class="row-name" :class="{ unmatched: !row.left }">
                    {{ row.left ? truncateMiddle(row.left.displayName || row.left.name) : '---' }}
                  </span>
                  <span class="row-sep">vs</span>
                  <span class="row-name" :class="{ unmatched: !row.right }">
                    {{ row.right ? truncateMiddle(row.right.displayName || row.right.name) : '---' }}
                  </span>
                </span>
              </div>
            </div>
          </el-popover>
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
        <el-button
          class="review-toggle"
          size="mini"
          :type="reviewMode ? 'primary' : 'default'"
          @click="toggleReviewMode"
          :title="reviewToggleTitle"
          :aria-label="reviewToggleTitle"
        >
          <i class="el-icon-reading"></i>
        </el-button>
        <span class="keyboard-hint">{{ keyboardHint }}</span>
      </div>
      <div v-if="compareTask.dirty" class="workspace-notice workspace-notice-warning">
        {{ $t('dashboard.compareTask.warnings.staleBody') }}
      </div>
      <div v-if="showSplitFallbackNotice" class="workspace-notice">
        {{ $t('dashboard.compareTask.workspace.splitUnavailable') }}
      </div>
      <div ref="workspaceBody" class="workspace-body">
        <div class="compare-stage">
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
                  :key="`left-${currentRow.id}-${displayedLeft.path}`"
                  :index="0"
                  :path="displayedLeft.path"
                  :displayName="displayedLeft.displayName"
                  :pairTaskMode="true"
                  :diagnosticContext="getImageDiagnosticContext('left')"
                  :annotations="reviewMode && showAnnotationNumbers ? reviewAnnotations : []"
                  :activeAnnotationId="selectedAnnotationId"
                  :_width="panelSize.width"
                  :_height="panelSize.height"
                  @annotation-select="selectAnnotation"
                />
                <div v-else class="panel-placeholder">
                  <span>{{ $t('dashboard.compareTask.workspace.placeholders.unmatchedBaseline') }}</span>
                  <el-button
                    v-if="previousImage('left')"
                    type="text"
                    size="mini"
                    @click="usePreviousImage('left')"
                  >
                    {{ $t('dashboard.compareTask.workspace.placeholders.usePrevious') }}
                  </el-button>
                </div>
              </div>
            </div>
            <div class="pair-panel" @mouseenter="hoveredSide = 'right'" @mouseleave="clearHoveredSide('right')">
              <div class="panel-body">
                <ImageCanvas
                  v-if="displayedRight && panelReady"
                  ref="rightCanvas"
                  :key="`right-${currentRow.id}-${displayedRight.path}`"
                  :index="1"
                  :path="displayedRight.path"
                  :displayName="displayedRight.displayName"
                  :pairTaskMode="true"
                  :diagnosticContext="getImageDiagnosticContext('right')"
                  :annotations="reviewMode && showAnnotationNumbers ? reviewAnnotations : []"
                  :activeAnnotationId="selectedAnnotationId"
                  :_width="panelSize.width"
                  :_height="panelSize.height"
                  @annotation-select="selectAnnotation"
                />
                <div v-else class="panel-placeholder">
                  <span>{{ $t('dashboard.compareTask.workspace.placeholders.unmatchedComparison') }}</span>
                  <el-button
                    v-if="previousImage('right')"
                    type="text"
                    size="mini"
                    @click="usePreviousImage('right')"
                  >
                    {{ $t('dashboard.compareTask.workspace.placeholders.usePrevious') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <div v-show="showSplitCompare" class="split-mode">
            <ImageDragDropCompare ref="splitCompare" :showCompare="true" :isExternal="true" :embedded="true" />
          </div>
        </div>
        <aside
          v-if="reviewMode"
          class="review-panel"
          :class="{ open: reviewPanelOpen }"
          :style="{ width: `${reviewPanelOpen ? reviewPanelWidth : reviewPanelHandleWidth}px` }"
        >
          <button
            type="button"
            class="review-panel-toggle"
            :title="$t(`dashboard.compareTask.workspace.review.${reviewPanelOpen ? 'collapse' : 'expand'}`)"
            :aria-label="$t(`dashboard.compareTask.workspace.review.${reviewPanelOpen ? 'collapse' : 'expand'}`)"
            @click="reviewPanelOpen = !reviewPanelOpen"
          >
            <i :class="reviewPanelOpen ? 'el-icon-arrow-right' : 'el-icon-arrow-left'"></i>
          </button>
          <div
            v-show="reviewPanelOpen"
            class="review-panel-resizer"
            @mousedown="startReviewPanelResize"
          ></div>
          <div class="review-panel-content">
            <div class="review-panel-header">{{ reviewTitle }}</div>
            <div class="review-panel-option" :title="reviewNumbersTitle">
              <el-switch v-model="showAnnotationNumbers" size="mini" />
              <span>{{ $t('dashboard.compareTask.workspace.review.showNumbers') }}</span>
            </div>
            <div ref="annotationList" class="annotation-list">
              <div v-if="!reviewAnnotations.length" class="annotation-empty">
                <div>{{ $t('dashboard.compareTask.workspace.review.empty') }}</div>
                <div>{{ $t('dashboard.compareTask.workspace.review.emptyHelp') }}</div>
              </div>
              <template v-else>
                <button
                  v-for="annotation in reviewAnnotations"
                  :key="annotation.id"
                  :data-annotation-id="annotation.id"
                  type="button"
                  class="annotation-item"
                  :class="[
                    `annotation-type-${annotation.type}`,
                    {
                      active: annotation.id === selectedAnnotationId
                    }
                  ]"
                  :aria-label="`${annotation.number}: ${annotation.text}`"
                  @click="selectAnnotation(annotation)"
                >
                  <span class="annotation-number">{{ annotation.number }}</span>
                  <span class="annotation-type">{{ $t(`dashboard.compareTask.workspace.review.types.${annotation.type}`) }}</span>
                  <span class="annotation-text">{{ annotation.text }}</span>
                </button>
              </template>
            </div>
          </div>
        </aside>
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
import { findPreviousRowImage } from '@/utils/imagePairing'
import { getTranslationForImage } from '@/utils/translationAnnotations'
import { handleEvent, PRESET_KEYS_MAP } from '@/tools/hotkey'
import {
  clearOperationId,
  createOperationId,
  getOperationId,
  logCompareEvent,
  logDiagnosticError,
  setOperationId
} from '@/utils/diagnosticLog'

const { mapGetters, mapActions } = createNamespacedHelpers('imageStore')
const { mapActions: preferenceMapActions } = createNamespacedHelpers('preferenceStore')
const REVIEW_PANEL_HANDLE_WIDTH = 14

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
      previewSide: null,
      temporaryFallbacks: {},
      colorPickerActive: false,
      reviewMode: false,
      reviewPanelOpen: true,
      reviewPanelWidth: 280,
      reviewPanelHandleWidth: REVIEW_PANEL_HANDLE_WIDTH,
      reviewPanelResizing: false,
      reviewPanelResizeState: null,
      showAnnotationNumbers: true,
      selectedAnnotationId: null,
      hotkeyDownEvents: new Map(),
      hotkeyUpEvents: new Map(),
      operationId: '',
      workspaceStartedAt: 0
    }
  },
  computed: {
    ...mapGetters(['compareTask', 'compareRows', 'currentCompareRow', 'imageConfig']),
    compareBgColor() {
      return this.$store.getters['preferenceStore/compareBgColor']
    },
    isDarkBg() {
      const color = this.compareBgColor
      if (!color) return false
      const hex = color.replace('#', '')
      if (hex.length !== 6) return false
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45
    },
    workspaceBgStyle() {
      return this.compareBgColor ? { background: this.compareBgColor } : null
    },
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
    keyboardHint() {
      const hotkeys = new Map(this.$store.state.preferenceStore.preference.hotkeys.map((item) => [item.name, item]))
      const formatHotkey = (name) => (hotkeys.get(name)?.keysArr || [])
        .map((keys) => keys.map((key) => PRESET_KEYS_MAP.get(key)?.label || key).join('+'))
        .join(' / ')
      return `${formatHotkey('pairPrevious')}${formatHotkey('pairNext')}键翻页，${formatHotkey('pairPreviewLeft')}${formatHotkey('pairPreviewRight')}键切换对比，双击调整单图缩放，${formatHotkey('pairReset')}键复位`
    },
    displayedLeft() {
      return this.displayedImage('left')
    },
    displayedRight() {
      return this.displayedImage('right')
    },
    reviewAnnotations() {
      if (!this.currentRow) return []
      const leftAnnotations = getTranslationForImage(
        this.findSourceForItem('left', this.currentRow.left),
        this.currentRow.left && this.currentRow.left.path
      )
      if (leftAnnotations.length) return leftAnnotations
      return getTranslationForImage(
        this.findSourceForItem('right', this.currentRow.right),
        this.currentRow.right && this.currentRow.right.path
      )
    },
    reviewTitle() {
      return this.$t('dashboard.compareTask.workspace.review.title', {
        count: this.reviewAnnotations.length
      })
    },
    reviewNumbersTitle() {
      const shortcut = this.getHotkeyLabel('reviewNumbers')
      return `${this.$t('dashboard.compareTask.workspace.review.showNumbers')}${shortcut ? ` (${shortcut})` : ''}`
    },
    reviewToggleTitle() {
      const shortcut = this.getHotkeyLabel('reviewToggle')
      return `${this.$t('dashboard.compareTask.workspace.review.toggle')}${shortcut ? ` (${shortcut})` : ''}`
    }
  },
  mounted() {
    this.operationId = getOperationId() || createOperationId()
    setOperationId(this.operationId)
    this.logWorkspaceEvent('compare_workspace_mount')
    this.activateWorkspace()
  },
  activated() {
    this.activateWorkspace()
  },
  deactivated() {
    this.deactivateWorkspace()
  },
  beforeDestroy() {
    this.logWorkspaceEvent('compare_workspace_unmount')
    this.deactivateWorkspace()
    clearOperationId(this.operationId)
  },
  methods: {
    ...mapActions(['patchCompareTask', 'setImageConfig']),
    ...preferenceMapActions(['setPreference']),
    getDiagnosticContext(side) {
      const row = this.currentRow
      return {
        operationId: this.operationId,
        taskVersion: this.compareTask.version,
        route: this.$route.fullPath,
        index: this.compareTask.currentIndex,
        rowId: row && row.id,
        side
      }
    },
    getImageDiagnosticContext(side) {
      return this.getDiagnosticContext(side)
    },
    logWorkspaceEvent(event, details = {}) {
      logCompareEvent(event, this.getDiagnosticContext(), {
        rows: this.compareRows.length,
        hasCurrentRow: Boolean(this.currentRow),
        mode: this.compareMode,
        dirty: Boolean(this.compareTask.dirty),
        ...details
      })
    },
    logUserAction(action, details = {}) {
      this.logWorkspaceEvent('compare_user_action', { action, ...details })
    },
    initHotkeyEvents() {
      this.hotkeyDownEvents = new Map([
        ['back', this.goDashboard],
        ['moveUp', () => this.moveImages(0, this.$store.state.preferenceStore.preference.moveDistance)],
        ['moveLeft', () => this.moveImages(this.$store.state.preferenceStore.preference.moveDistance, 0)],
        ['moveDown', () => this.moveImages(0, -this.$store.state.preferenceStore.preference.moveDistance)],
        ['moveRight', () => this.moveImages(-this.$store.state.preferenceStore.preference.moveDistance, 0)],
        ['pickColor', this.toggleColorPicker],
        ['pairPrevious', () => this.stepRow(-1)],
        ['pairNext', () => this.stepRow(1)],
        ['pairPreviewLeft', this.startLeftPreview],
        ['pairPreviewRight', this.startRightPreview],
        ['pairReset', this.resetCurrentGroup],
        ['reviewToggle', this.toggleReviewMode],
        ['reviewNumbers', this.toggleAnnotationNumbers]
      ])
      this.hotkeyUpEvents = new Map([
        ['pairPreviewLeft', this.cancelPreview],
        ['pairPreviewRight', this.cancelPreview]
      ])
    },
    moveImages(x, y) {
      this.$bus.$emit('image_broadcast', {
        name: 'doDrag',
        data: { offset: { x, y } }
      })
    },
    toggleColorPicker() {
      this.colorPickerActive = !this.colorPickerActive
      this.$bus.$emit('image_broadcast', {
        name: 'pickColor',
        data: { status: this.colorPickerActive }
      })
    },
    toggleDisplayMode() {
      this.logUserAction('toggle_display_mode', { from: this.displayMode })
      this.setImageConfig({ displayMode: this.displayMode === 'original' ? 'fit' : 'original' })
    },
    getHotkeyLabel(name) {
      const hotkey = (this.$store.state.preferenceStore.preference.hotkeys || [])
        .find((item) => item.name === name)
      return (hotkey?.keysArr || [])
        .map((keys) => keys.map((key) => PRESET_KEYS_MAP.get(key)?.label || key).join('+'))
        .join(' / ')
    },
    toggleReviewMode() {
      this.reviewMode = !this.reviewMode
      this.logUserAction('toggle_review_mode', { enabled: this.reviewMode })
      if (!this.reviewMode) {
        this.stopReviewPanelResize()
        this.cancelPreview()
      }
    },
    toggleAnnotationNumbers() {
      this.showAnnotationNumbers = !this.showAnnotationNumbers
    },
    findSourceForItem(side, item) {
      if (!item || !item.path) return null
      const folderPath = path.dirname(path.resolve(String(item.path)))
      return (this.compareTask.sources[side] || []).find((source) => (
        source && source.type === 'folder' && path.resolve(String(source.path)) === folderPath
      )) || null
    },
    selectAnnotation(annotation) {
      this.selectedAnnotationId = annotation ? annotation.id : null
      this.$nextTick(() => {
        const items = this.$refs.annotationList
          ? Array.from(this.$refs.annotationList.querySelectorAll('.annotation-item'))
          : []
        const item = items.find((element) => element.dataset.annotationId === this.selectedAnnotationId)
        item && item.scrollIntoView({ block: 'nearest' })
      })
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
    displayedImage(side) {
      if (!this.currentRow) return null
      if (this.currentRow[side]) return this.currentRow[side]
      return this.temporaryFallbacks[`${this.currentRow.id}:${side}`]
        ? this.previousImage(side)
        : null
    },
    previousImage(side) {
      return findPreviousRowImage(this.compareRows, this.compareTask.currentIndex, side)
    },
    usePreviousImage(side) {
      if (this.previousImage(side) && this.currentRow) {
        this.$set(this.temporaryFallbacks, `${this.currentRow.id}:${side}`, true)
      }
    },
    goDashboard() {
      this.$router.push('/dashboard')
    },
    handleDocumentMouseDown(e) {
      if (!this.$refs.rowPopover) return
      const trigger = this.$el && this.$el.querySelector('.row-list')
      if (trigger && trigger.contains(e.target)) return
      const popper = document.querySelector('.row-list-popover')
      if (popper && !popper.contains(e.target)) {
        this.$refs.rowPopover.doClose()
      }
    },
    async stepRow(offset) {
      const nextIndex = Math.min(Math.max(this.compareTask.currentIndex + offset, 0), this.compareRows.length - 1)
      if (nextIndex !== this.compareTask.currentIndex) {
        this.logUserAction('step_row', { fromIndex: this.compareTask.currentIndex, toIndex: nextIndex })
        await this.patchCompareTask({ currentIndex: nextIndex, started: true })
      }
    },
    async goToRow(index) {
      if (index !== this.compareTask.currentIndex) {
        this.logUserAction('select_row', { fromIndex: this.compareTask.currentIndex, toIndex: index })
        await this.patchCompareTask({ currentIndex: index, started: true })
      }
      this.$refs.rowPopover.doClose()
    },
    scrollToActiveRow() {
      this.$nextTick(() => {
        const container = this.$refs.rowListScroll
        if (!container) return
        const activeItem = container.querySelector('.row-list-item.active')
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'center' })
        }
      })
    },
    truncateMiddle(text, maxWidth = 210) {
      if (!text) return text
      // 中文/全角≈2单位(13px)，英文≈1单位(7px)
      const charWidth = (ch) => ch.charCodeAt(0) > 0x7f ? 2 : 1
      let total = 0
      for (let i = 0; i < text.length; i++) total += charWidth(text[i])
      // 13px字体下，每单位≈7px，maxWidth=210px ≈ 30单位
      const maxUnits = Math.floor(maxWidth / 7)
      if (total <= maxUnits) return text
      const frontBudget = Math.floor((maxUnits - 3) / 2)
      const backBudget = maxUnits - 3 - frontBudget
      let fw = 0; let fi = 0
      while (fi < text.length && fw + charWidth(text[fi]) <= frontBudget) { fw += charWidth(text[fi]); fi++ }
      let bw = 0; let bi = text.length
      while (bi > fi && bw + charWidth(text[bi - 1]) <= backBudget) { bw += charWidth(text[bi - 1]); bi-- }
      return text.slice(0, fi) + '...' + text.slice(bi)
    },
    async changeMode(mode) {
      this.logUserAction('change_mode', { from: this.compareMode, to: mode })
      await this.patchCompareTask({ mode, started: true })
    },
    resetCurrentGroup() {
      this.logUserAction('reset_current_group')
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
    startReviewPanelResize(event) {
      if (!this.reviewPanelOpen) return
      this.reviewPanelResizing = true
      this.reviewPanelResizeState = {
        startX: event.clientX,
        startWidth: this.reviewPanelWidth
      }
      document.addEventListener('mousemove', this.handleReviewPanelResize, true)
      document.addEventListener('mouseup', this.stopReviewPanelResize, true)
      event.preventDefault()
    },
    handleReviewPanelResize(event) {
      if (!this.reviewPanelResizeState) return
      const workspaceWidth = this.$refs.workspaceBody
        ? this.$refs.workspaceBody.getBoundingClientRect().width
        : 0
      const maxWidth = Math.max(160, workspaceWidth - 24)
      const minWidth = Math.min(220, maxWidth)
      const width = this.reviewPanelResizeState.startWidth
        - (event.clientX - this.reviewPanelResizeState.startX)
      this.reviewPanelWidth = Math.min(Math.max(width, minWidth), maxWidth)
      this.$nextTick(this.syncPanelSize)
    },
    stopReviewPanelResize() {
      if (!this.reviewPanelResizeState) return
      this.reviewPanelResizing = false
      this.reviewPanelResizeState = null
      document.removeEventListener('mousemove', this.handleReviewPanelResize, true)
      document.removeEventListener('mouseup', this.stopReviewPanelResize, true)
      this.$nextTick(this.syncPanelSize)
    },
    activateWorkspace() {
      if (!this.operationId) {
        this.operationId = createOperationId()
      }
      setOperationId(this.operationId)
      if (this.workspaceActive) {
        this.logWorkspaceEvent('compare_workspace_activate', { reactivated: true })
        this.syncLiveWatcher()
        this.checkTaskFreshness()
        return
      }
      this.workspaceStartedAt = Date.now()
      this.workspaceActive = true
      this.logWorkspaceEvent('compare_workspace_activate')
      if (!this.compareRows.length) {
        this.logWorkspaceEvent('compare_workspace_empty', { reason: 'no_rows' })
      }
      window.addEventListener('resize', this.syncPanelSize, true)
      window.addEventListener('keydown', this.handleKeydown, true)
      window.addEventListener('keyup', this.handleKeyup, true)
      window.addEventListener('blur', this.cancelPreview, true)
      document.addEventListener('mousedown', this.handleDocumentMouseDown, true)
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
      document.removeEventListener('mousedown', this.handleDocumentMouseDown, true)
      this.stopReviewPanelResize()
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
      this.logWorkspaceEvent('compare_source_change', { path: resolvedPath })
      if (this.shouldMarkDirtyForPath(resolvedPath)) {
        this.patchCompareTask({ dirty: true })
        this.warnDirty()
      }
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
      this.logWorkspaceEvent('compare_source_structure_change', { path: resolvedPath })
      if (!this.shouldMarkDirtyForPath(resolvedPath)) {
        return
      }
      await this.patchCompareTask({ dirty: true })
      this.logWorkspaceEvent('compare_task_marked_dirty', { path: resolvedPath })
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
      const startedAt = Date.now()
      this.logWorkspaceEvent('compare_freshness_check_start')
      try {
        const [left, right] = await Promise.all([
          inspectImageSourceFreshness(this.compareTask.sources.left, this.compareTask.leftItems, this.compareTask.sources.left),
          inspectImageSourceFreshness(this.compareTask.sources.right, this.compareTask.rightItems, this.compareTask.sources.right)
        ])
        this.logWorkspaceEvent('compare_freshness_check_done', {
          durationMs: Date.now() - startedAt,
          leftStale: Boolean(left.stale),
          rightStale: Boolean(right.stale)
        })
        if (!left.stale && !right.stale) {
          return
        }
        if (!this.compareTask.dirty) {
          await this.patchCompareTask({ dirty: true })
        }
        this.logWorkspaceEvent('compare_task_marked_dirty', { reason: 'source_stale' })
        this.warnDirty()
      } catch (error) {
        logDiagnosticError('compare', 'compare_freshness_check_failed', error, this.getDiagnosticContext(), {
          durationMs: Date.now() - startedAt
        })
      }
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
      if (handleEvent(event, this.hotkeyDownEvents)) {
        event.preventDefault()
      }
    },
    handleKeyup(event) {
      if (handleEvent(event, this.hotkeyUpEvents)) {
        event.preventDefault()
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
    startLeftPreview() {
      if (this.previewSide === 'left') return
      this.cancelPreview()
      const targetCanvas = this.getCanvas('left')
      const sourceCanvas = this.getCanvas('right')
      if (targetCanvas && sourceCanvas) {
        this.previewSide = 'left'
        targetCanvas.setCoverStatus(sourceCanvas.getSnapshot(), true)
      }
    },
    startRightPreview() {
      if (this.previewSide === 'right') return
      this.cancelPreview()
      const targetCanvas = this.getCanvas('right')
      const sourceCanvas = this.getCanvas('left')
      if (targetCanvas && sourceCanvas) {
        this.previewSide = 'right'
        targetCanvas.setCoverStatus(sourceCanvas.getSnapshot(), true)
      }
    },
    canPreviewLeftSide() {
      return this.showSideBySide && !!this.currentRow?.left && !!this.currentRow?.right
    },
    canPreviewRightSide() {
      return this.showSideBySide && !!this.currentRow?.left && !!this.currentRow?.right
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
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)
    }
  },
  created() {
    this.workspaceActive = false
    this.liveWatcherKey = ''
    this.initHotkeyEvents()
  },
  watch: {
    currentRow: {
      handler(value, previousValue) {
        this.cancelPreview()
        this.selectedAnnotationId = null
        this.updateSplitCompare()
        this.logWorkspaceEvent('compare_row_change', {
          previousRowId: previousValue && previousValue.id,
          hasLeft: Boolean(value && value.left),
          hasRight: Boolean(value && value.right)
        })
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
    compareMode(value, previousValue) {
      this.cancelPreview()
      this.$nextTick(this.syncPanelSize)
      if (value !== previousValue) {
        this.logWorkspaceEvent('compare_mode_change', { from: previousValue, to: value })
      }
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
      this.temporaryFallbacks = {}
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

  .review-toggle {
    flex: 0 0 28px;
    width: 28px;
    padding: 7px 0;
  }

  .workspace-body,
  .compare-stage,
  .side-by-side,
  .split-mode {
    min-height: 0;
    flex: 1;
  }

  .workspace-body {
    display: flex;
    position: relative;
    gap: 6px;
    min-width: 0;
  }

  .compare-stage {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .split-mode {
    display: flex;
    min-width: 0;
  }

  .side-by-side {
    display: flex;
    gap: 6px;
  }

  .review-panel {
    position: relative;
    z-index: 2;
    flex: 0 0 auto;
    width: 280px;
    max-width: calc(100% - 24px);
    min-width: 14px;
    min-height: 0;
    overflow: hidden;
    border: 1px solid #e6e8ee;
    border-radius: 6px;
    background: #fff;
    box-shadow: -3px 0 12px rgba(0, 0, 0, 0.12);
    transition: width 0.18s ease;
  }

  .review-panel-resizer {
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    cursor: col-resize;
  }

  .review-panel-resizer:hover {
    background: rgba(64, 158, 255, 0.24);
  }

  .review-panel-content {
    height: 100%;
    margin-left: 14px;
    overflow: auto;
  }

  .review-panel-toggle {
    position: absolute;
    z-index: 1;
    top: 0;
    bottom: 0;
    left: 0;
    width: 14px;
    padding: 0;
    border: 0;
    border-right: 1px solid #e6e8ee;
    background: #f5f7fa;
    color: $labelColor;
    cursor: pointer;
  }

  .review-panel-toggle:hover {
    color: $primaryColor;
    background: #ecf5ff;
  }

  .review-panel-header {
    height: 36px;
    padding: 0 8px;
    border-bottom: 1px solid #e6e8ee;
    font-size: 13px;
    color: $textColor;
    line-height: 36px;
  }

  .review-panel-option {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 8px;
    border-bottom: 1px solid #ebeef5;
    color: $labelColor;
    font-size: 12px;
  }

  .review-panel-option .el-switch {
    flex: 0 0 auto;
  }

  &.review-panel-resizing,
  &.review-panel-resizing * {
    cursor: col-resize !important;
    user-select: none;
  }

  &.review-panel-resizing .review-panel {
    transition: none;
  }

  .annotation-list {
    padding: 2px 4px 4px;
  }

  .annotation-empty {
    padding: 12px 8px;
    color: $labelColor;
    text-align: center;
    font-size: 12px;
    line-height: 1.5;
  }

  .annotation-empty > div + div {
    margin-top: 4px;
    color: #a0a3a8;
    font-size: 11px;
  }

  .annotation-item {
    display: grid;
    grid-template-columns: 28px auto;
    gap: 1px 6px;
    width: 100%;
    padding: 5px 6px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: $textColor;
    text-align: left;
    cursor: pointer;
    font: inherit;
  }

  .annotation-item:hover,
  .annotation-item.active {
    border-color: #c6e2ff;
    background: #ecf5ff;
  }

  .annotation-item + .annotation-item {
    border-top: 1px solid #ebeef5;
    border-radius: 0;
  }

  .annotation-number {
    grid-row: span 2;
    align-self: start;
    color: $primaryColor;
    font-weight: 600;
    line-height: 1.3;
  }

  .annotation-type {
    font-size: 11px;
    line-height: 1.2;
    color: $labelColor;
  }

  .annotation-type-1 .annotation-type {
    color: $primaryColor;
  }

  .annotation-type-2 .annotation-type {
    color: #b06a00;
  }

  .annotation-text {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.3;
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
    flex-direction: column;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: $labelColor;
  }

  .row-list {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .row-list:hover {
    background: #f0f2f5;
  }

  .row-list:hover .row-progress-text {
    color: $primaryColor;
  }

  .row-progress-text {
    cursor: pointer;
  }

  .dark-bg {
    .workspace-controls {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #d0d0d0;
    }

    ::v-deep .workspace-controls .el-button--default {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.15);
      color: #d0d0d0;

      &:hover {
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
      }
    }

    ::v-deep .workspace-controls .el-radio-group {
      .el-radio-button__inner {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.12);
        color: #b0b0b0;
      }

      .is-active .el-radio-button__inner {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
    }

    .pair-status {
      color: #a0a0a0;
    }

    .keyboard-hint {
      color: rgba(255, 255, 255, 0.5);
    }

    .workspace-notice {
      background: rgba(255, 255, 255, 0.05);
      color: #a0a0a0;
    }

    .panel-placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .review-panel {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.05);
    }

    .review-panel-toggle {
      border-right-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.55);
    }

    .review-panel-toggle:hover {
      background: rgba(64, 158, 255, 0.16);
      color: #fff;
    }

    .review-panel-resizer:hover {
      background: rgba(64, 158, 255, 0.42);
    }

    .review-panel-header {
      border-bottom-color: rgba(255, 255, 255, 0.12);
      color: #d0d0d0;
    }

    .review-panel-option {
      border-bottom-color: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.6);
    }

    .annotation-item {
      color: #d0d0d0;
    }

    .annotation-item:hover,
    .annotation-item.active {
      border-color: rgba(64, 158, 255, 0.45);
      background: rgba(64, 158, 255, 0.16);
    }

    .annotation-item + .annotation-item {
      border-top-color: rgba(255, 255, 255, 0.12);
    }

    .annotation-type {
      color: rgba(255, 255, 255, 0.5);
    }

    .annotation-empty {
      color: rgba(255, 255, 255, 0.45);
    }

    .annotation-empty > div + div {
      color: rgba(255, 255, 255, 0.36);
    }
  }
}

@media (max-width: 900px) {
  .pair-compare-workspace {
    .review-panel {
      width: min(280px, calc(100% - 24px));
    }
  }
}
</style>

<style lang="scss">
.row-list-popover {
  max-width: 546px;
  max-height: 360px;
  overflow: hidden;
  padding: 4px 0;

  .row-list-scroll {
    max-height: 352px;
    overflow-y: auto;
  }

  .row-list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;

    &:hover {
      background: #f0f2f5;
    }

    &.active {
      background: #1067d1;
      color: #fff;

      .row-name.unmatched {
        color: rgba(255, 255, 255, 0.6);
      }

      .row-sep {
        color: rgba(255, 255, 255, 0.7);
      }
    }

    .row-index {
      flex-shrink: 0;
      width: 20px;
      text-align: right;
      font-size: 12px;
      opacity: 0.65;
    }

    .row-names {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .row-name {
      max-width: 210px;
      overflow: hidden;
      white-space: nowrap;
      font-size: 13px;

      &.unmatched {
        font-style: italic;
        color: #c0c4cc;
      }
    }

    .row-sep {
      flex-shrink: 0;
      font-size: 11px;
      color: #c0c4cc;
    }
  }
}
</style>
