<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <div class="header-copy">
        <h1>{{ $t('dashboard.compareTask.title') }}</h1>
        <p>{{ summaryText }}</p>
      </div>
      <div class="header-actions">
        <el-button plain icon="el-icon-sort" @click="swapSides">
          {{ $t('dashboard.compareTask.actions.swap') }}
        </el-button>
        <el-button plain icon="el-icon-refresh" @click="refreshPairs">
          {{ $t('dashboard.compareTask.actions.refresh') }}
        </el-button>
        <el-button plain icon="el-icon-delete" @click="confirmNewTask">
          {{ $t('dashboard.compareTask.actions.new') }}
        </el-button>
        <el-button type="primary" icon="el-icon-video-play" :disabled="!canStart" @click="startCompare">
          {{ $t(startActionKey) }}
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="compareTask.dirty"
      :title="$t('dashboard.compareTask.warnings.staleTitle')"
      :description="$t('dashboard.compareTask.warnings.staleBody')"
      type="warning"
      :closable="false"
      show-icon
    />

    <div class="panel-grid">
      <section
        v-for="side in sides"
        :key="side"
        class="source-panel"
        @dragenter.prevent.stop
        @dragover.prevent.stop
        @dragleave.prevent.stop
        @drop.prevent.stop="onDrop(side, $event)"
      >
        <div class="panel-header">
          <div>
            <h2>{{ getPanelLabel(side) }}</h2>
            <p>{{ $t('dashboard.compareTask.panels.hint') }}</p>
          </div>
          <div class="panel-action-group">
            <div class="panel-actions">
              <el-button size="mini" @click="openFiles(side)">
                {{ $t('dashboard.compareTask.buttons.selectImages') }}
              </el-button>
              <el-button size="mini" @click="openFolders(side)">
                {{ $t('dashboard.compareTask.buttons.selectFolders') }}
              </el-button>
            </div>
            <el-button
              v-if="getRecentFolder(side)"
              type="text"
              class="recent-folder"
              :title="getRecentFolder(side)"
              @click="useRecentFolder(side)"
            >
              {{ $t('dashboard.compareTask.buttons.recentFolder') }}：{{ getSourceName(getRecentFolder(side)) }}
            </el-button>
          </div>
        </div>

        <div class="sort-row">
          <el-select
            :value="getSortValue(side, 'field')"
            size="mini"
            @change="changeSortField(side, $event)"
          >
            <el-option
              v-for="field in sortFields"
              :key="field"
              :label="getSortFieldLabel(field)"
              :value="field"
            />
          </el-select>
          <el-radio-group
            :value="getSortValue(side, 'order')"
            size="mini"
            @input="changeSortOrder(side, $event)"
          >
            <el-radio-button label="asc">
              {{ $t('dashboard.compareTask.sort.orders.asc') }}
            </el-radio-button>
            <el-radio-button label="desc">
              {{ $t('dashboard.compareTask.sort.orders.desc') }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="source-list">
          <div v-if="!getSources(side).length" class="source-empty">
            {{ $t('dashboard.compareTask.table.empty') }}
          </div>
          <draggable
            :value="getSources(side)"
            :group="{ name: 'compare-sources', pull: false, put: false }"
            handle=".source-drag-handle"
            class="source-list-items"
            @change="handleSourceDragChange(side, $event)"
          >
            <div v-for="(source, index) in getSources(side)" :key="getSourceKey(side, source)" class="source-item">
              <span
                v-if="source.type === 'folder'"
                class="source-drag-handle"
                :title="$t('dashboard.compareTask.buttons.reorderSource')"
              >⠿</span>
              <span v-else></span>
              <el-tag size="mini" effect="plain">{{ getSourceTypeLabel(source.type) }}</el-tag>
              <el-tooltip :content="source.path" placement="top">
                <div class="source-copy">
                  <span class="source-name">{{ getSourceName(source.path) }}</span>
                  <span class="source-path">{{ source.path }}</span>
                </div>
              </el-tooltip>
              <el-button type="text" icon="el-icon-close" @click="removeSource(side, index)" />
            </div>
          </draggable>
        </div>
      </section>
    </div>

    <section class="preview-panel">
      <div class="preview-header">
        <h2>{{ $t('dashboard.compareTask.table.title') }}</h2>
        <span>{{ compareRows.length }}</span>
      </div>
      <div v-if="compareRows.length" class="preview-table">
        <el-table
          :data="tableRows"
          height="100%"
          @row-click="selectRow"
          :row-class-name="rowClassName"
        >
          <el-table-column :label="$t('dashboard.compareTask.table.index')" prop="index" width="70" />
          <el-table-column :label="$t('dashboard.compareTask.table.baseline')" min-width="260">
            <template slot-scope="{ row }">
              <span :class="{ missing: !row.left }">
                {{ row.left ? (row.left.displayName || row.left.name) : $t('dashboard.compareTask.placeholders.missingBaseline') }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.compareTask.table.comparison')" min-width="260">
            <template slot-scope="{ row }">
              <span :class="{ missing: !row.right }">
                {{ row.right ? (row.right.displayName || row.right.name) : $t('dashboard.compareTask.placeholders.missingComparison') }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.compareTask.table.status')" width="160">
            <template slot-scope="{ row }">
              {{ getStatusLabel(row) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else class="preview-empty">
        {{ $t('dashboard.compareTask.table.empty') }}
      </div>
    </section>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { createNamespacedHelpers } from 'vuex'
import {
  ingestImageSources,
  inspectImageSourceFreshness,
  rebuildItemsFromSources
} from '@/utils/imageComparisonSources'

const { dialog } = require('@electron/remote')
const { mapGetters, mapActions } = createNamespacedHelpers('imageStore')
const SIDE_TO_STORE_KEY = {
  baseline: 'left',
  comparison: 'right'
}
const SORT_FIELDS = ['name', 'lastModifyTime', 'size']
const IGNORED_REASON_MESSAGE_KEYS = {
  duplicate: 'duplicates',
  missing: 'missing',
  'invalid-path': 'invalid',
  'unsupported-type': 'unsupported',
  'unsupported-image': 'unsupported'
}

const reduceIgnored = (ignored = []) => ignored.reduce((acc, item) => {
  const reason = item && item.reason ? item.reason : 'invalid-path'
  acc[reason] = (acc[reason] || 0) + 1
  return acc
}, {})

export default {
  name: 'dashboard',
  components: { draggable },
  data() {
    return {
      sides: Object.keys(SIDE_TO_STORE_KEY),
      sortFields: SORT_FIELDS,
      freshnessCheckPromise: null
    }
  },
  computed: {
    ...mapGetters(['compareTask', 'compareRows', 'recentCompareFolders']),
    sourceCounts() {
      return {
        left: (this.compareTask.sources.left || []).length,
        right: (this.compareTask.sources.right || []).length
      }
    },
    canStart() {
      return this.compareTask.leftItems.length > 0 && this.compareTask.rightItems.length > 0
    },
    hasTask() {
      return this.sourceCounts.left > 0 || this.sourceCounts.right > 0
    },
    startActionKey() {
      return this.compareTask.started ? 'dashboard.compareTask.actions.resume' : 'dashboard.compareTask.actions.start'
    },
    summaryText() {
      if (!this.hasTask) {
        return this.$t('dashboard.compareTask.summaryEmpty')
      }
      return this.$t('dashboard.compareTask.summary', {
        leftCount: this.sourceCounts.left,
        rightCount: this.sourceCounts.right,
        pairCount: this.compareRows.length
      })
    },
    tableRows() {
      return this.compareRows.map((row, index) => ({ ...row, index: index + 1 }))
    }
  },
  mounted() {
    this.checkTaskFreshness()
  },
  activated() {
    this.checkTaskFreshness()
  },
  methods: {
    ...mapActions([
      'patchCompareTask',
      'refreshCompareTask',
      'swapCompareTask',
      'clearCompareTask',
      'clearAllImageData',
      'setRecentCompareFolder'
    ]),
    mapSide(side) {
      return SIDE_TO_STORE_KEY[side]
    },
    getPanelLabel(side) {
      return this.$t(`dashboard.compareTask.panels.${side}`)
    },
    getSources(side) {
      return this.compareTask.sources[this.mapSide(side)] || []
    },
    getRecentFolder(side) {
      return (this.recentCompareFolders || {})[this.mapSide(side)] || ''
    },
    getSortValue(side, key) {
      return this.compareTask[`${this.mapSide(side)}Sort`][key]
    },
    getSortFieldLabel(field) {
      return this.$t(`dashboard.compareTask.sort.fields.${field}`)
    },
    getSourceKey(side, source) {
      return `${side}-${source.path}`
    },
    getSourceName(sourcePath = '') {
      return String(sourcePath).split(/[\\/]/).pop() || sourcePath
    },
    getSourceTypeLabel(type) {
      return this.$t(`dashboard.compareTask.sourceType.${type}`)
    },
    getRowStatus(row) {
      if (!row.left) return 'missingBaseline'
      if (!row.right) return 'missingComparison'
      return 'ready'
    },
    getStatusLabel(row) {
      return this.$t(`dashboard.compareTask.status.${this.getRowStatus(row)}`)
    },
    rowClassName({ row }) {
      return row.index - 1 === this.compareTask.currentIndex ? 'pair-row-active' : ''
    },
    async openFiles(side) {
      await this.openDialog(side, 'file')
    },
    async openFolders(side) {
      await this.openDialog(side, 'folder')
    },
    async openDialog(side, type) {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: this.$t(`dashboard.compareTask.dialog.${type}`),
        defaultPath: type === 'folder' ? this.getRecentFolder(side) || undefined : undefined,
        properties: type === 'folder' ? ['openDirectory', 'multiSelections'] : ['openFile', 'multiSelections']
      })
      if (!canceled && filePaths && filePaths.length) {
        if (type === 'folder') {
          await this.setRecentCompareFolder({ side: this.mapSide(side), folderPath: filePaths[0] })
        }
        await this.mergeSources(side, filePaths)
      }
    },
    async useRecentFolder(side) {
      await this.mergeSources(side, [this.getRecentFolder(side)])
    },
    async onDrop(side, event) {
      const filePaths = Array.from((event.dataTransfer && event.dataTransfer.files) || [])
        .map((file) => file.path)
        .filter(Boolean)
      if (!filePaths.length) {
        this.$message.warning(this.$t('dashboard.compareTask.messages.noDroppedFiles'))
        return
      }
      await this.mergeSources(side, filePaths)
    },
    buildSidePatch(side, result) {
      const storeSide = this.mapSide(side)
      return {
        sources: { [storeSide]: result.sources },
        [`${storeSide}Items`]: result.items
      }
    },
    async applySideResult(side, action, result) {
      await this.refreshCompareTask(this.buildSidePatch(side, result))
      this.showIgnoredMessage(action, result.ignored)
    },
    async mergeSources(side, incoming) {
      const result = await ingestImageSources(this.getSources(side).concat(incoming))
      await this.applySideResult(side, 'added', result)
    },
    async removeSource(side, index) {
      const nextSources = this.getSources(side).filter((item, itemIndex) => itemIndex !== index)
      const result = await rebuildItemsFromSources(nextSources)
      await this.applySideResult(side, 'added', result)
    },
    async handleSourceDragChange(side, change) {
      if (change && change.moved) {
        const nextSources = this.getSources(side).slice()
        const [source] = nextSources.splice(change.moved.oldIndex, 1)
        nextSources.splice(change.moved.newIndex, 0, source)
        await this.refreshSourceSides({ [this.mapSide(side)]: nextSources })
        return
      }
      if (!change || !change.added) {
        return
      }
      const otherSide = side === 'baseline' ? 'comparison' : 'baseline'
      const nextSources = this.getSources(side).slice()
      nextSources.splice(change.added.newIndex, 0, change.added.element)
      const otherSources = this.getSources(otherSide)
        .filter((source) => source.path !== change.added.element.path)
      await this.refreshSourceSides({
        [this.mapSide(side)]: nextSources,
        [this.mapSide(otherSide)]: otherSources
      })
    },
    async refreshSourceSides(sourcePatch) {
      const nextSources = {
        left: sourcePatch.left || this.compareTask.sources.left,
        right: sourcePatch.right || this.compareTask.sources.right
      }
      const [left, right] = await Promise.all([
        rebuildItemsFromSources(nextSources.left),
        rebuildItemsFromSources(nextSources.right)
      ])
      await this.refreshCompareTask({
        sources: { left: left.sources, right: right.sources },
        leftItems: left.items,
        rightItems: right.items
      })
    },
    async refreshPairs() {
      if (!this.hasTask) {
        this.$message.warning(this.$t('dashboard.compareTask.messages.noSources'))
        return
      }
      const [left, right] = await Promise.all([
        rebuildItemsFromSources(this.compareTask.sources.left),
        rebuildItemsFromSources(this.compareTask.sources.right)
      ])
      await this.refreshCompareTask({
        sources: { left: left.sources, right: right.sources },
        leftItems: left.items,
        rightItems: right.items,
        dirty: false
      })
      this.showIgnoredMessage('refreshed', left.ignored.concat(right.ignored))
    },
    async changeSortField(side, field) {
      const storeSide = this.mapSide(side)
      await this.refreshCompareTask({
        [`${storeSide}Sort`]: { ...this.compareTask[`${storeSide}Sort`], field }
      })
    },
    async changeSortOrder(side, order) {
      const storeSide = this.mapSide(side)
      await this.refreshCompareTask({
        [`${storeSide}Sort`]: { ...this.compareTask[`${storeSide}Sort`], order }
      })
    },
    async selectRow(row) {
      await this.refreshCompareTask({ currentIndex: row.index - 1 })
    },
    async swapSides() {
      await this.swapCompareTask()
      this.$message.success(this.$t('dashboard.compareTask.messages.swapped'))
    },
    async confirmNewTask() {
      try {
        await this.$confirm(
          this.$t('dashboard.compareTask.confirm.message'),
          this.$t('dashboard.compareTask.confirm.title'),
          {
            confirmButtonText: this.$t('common.confirm'),
            cancelButtonText: this.$t('common.cancel'),
            type: 'warning'
          }
        )
        await this.clearCompareTask()
        await this.clearAllImageData()
        this.$message.success(this.$t('dashboard.compareTask.messages.cleared'))
      } catch (error) {
        return error
      }
    },
    async startCompare() {
      if (!this.canStart) {
        this.$message.warning(this.$t('dashboard.compareTask.messages.nothingReady'))
        return
      }
      await this.checkTaskFreshness()
      await this.refreshCompareTask({ started: true })
      this.$router.push({ path: '/image/compare', query: { pairTask: '1' } })
    },
    async checkTaskFreshness() {
      if (this.freshnessCheckPromise) {
        return this.freshnessCheckPromise
      }
      this.freshnessCheckPromise = Promise.all([
        inspectImageSourceFreshness(this.compareTask.sources.left, this.compareTask.leftItems, this.compareTask.sources.left),
        inspectImageSourceFreshness(this.compareTask.sources.right, this.compareTask.rightItems, this.compareTask.sources.right)
      ]).then(async ([left, right]) => {
        if ((left.stale || right.stale) && !this.compareTask.dirty) {
          await this.patchCompareTask({ dirty: true })
        }
      }).finally(() => {
        this.freshnessCheckPromise = null
      })
      return this.freshnessCheckPromise
    },
    showIgnoredMessage(action, ignored = []) {
      const counts = reduceIgnored(ignored)
      const parts = [this.$t(`dashboard.compareTask.messages.${action}`)]
      Object.entries(IGNORED_REASON_MESSAGE_KEYS).forEach(([reason, key]) => {
        if (counts[reason]) {
          parts.push(this.$t(`dashboard.compareTask.messages.${key}`, { count: counts[reason] }))
        }
      })
      this.$message({
        type: ignored.length ? 'warning' : 'success',
        message: parts.join(' ')
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import '@/styles/variables.scss';

.dashboard-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 20px;
  color: $textColor;
  box-sizing: border-box;

  .dashboard-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;

    .header-copy {
      h1 {
        margin: 0;
        font-size: 26px;
      }

      p {
        margin: 8px 0 0;
        color: $labelColor;
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .source-panel,
  .preview-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 16px;
    background: #fff;
    border: 1px solid #e6e8ee;
    border-radius: 12px;
    box-sizing: border-box;
  }

  .source-empty,
  .preview-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    color: $labelColor;
    border: 1px dashed #d5dae3;
    border-radius: 10px;
  }

  .source-panel {
    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;

      h2 {
        margin: 0;
        font-size: 18px;
      }

      p {
        margin: 6px 0 0;
        color: $labelColor;
      }
    }

    .panel-actions,
    .sort-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .panel-action-group {
      display: flex;
      align-items: flex-end;
      flex-direction: column;
    }

    .recent-folder {
      max-width: 240px;
      padding: 5px 0 0;
      overflow: hidden;
      color: $labelColor;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sort-row {
      margin-top: 12px;
    }

    .source-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 160px;
      max-height: 260px;
      margin-top: 14px;
      overflow: auto;
    }

    .source-list-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .source-item {
      display: grid;
      grid-template-columns: 12px auto minmax(0, 1fr) auto;
      gap: 6px;
      align-items: center;
      padding: 8px 10px;
      background: #f8fafc;
      border-radius: 10px;
    }

    .source-drag-handle {
      cursor: grab;
      color: $labelColor;
      font-size: 14px;
      font-style: normal;
      line-height: 1;
      text-align: center;
    }

    .source-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .source-name,
    .source-path {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .source-path {
      color: $labelColor;
      font-size: 12px;
      margin-top: 2px;
    }
  }

  .preview-panel {
    flex: 1;

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      h2 {
        margin: 0;
        font-size: 18px;
      }

      span {
        color: $labelColor;
      }
    }

    .preview-table {
      flex: 1;
      min-height: 220px;
      overflow: hidden;
    }

    .missing {
      color: #d14343;
    }
  }
}

::v-deep .pair-row-active {
  td {
    background: rgba($primaryColor, 0.08) !important;
  }
}

@media (max-width: 800px) {
  .dashboard-container {
    .panel-grid {
      grid-template-columns: 1fr;
    }

    .source-panel {
      .source-list {
        max-height: 220px;
      }
    }

    .preview-panel .preview-table {
      min-height: 180px;
    }
  }
}
</style>
