<template>
  <el-dialog ref="aboutDialog" :visible.sync="visible" title="Preference" center width="80%">
    <div ref="container" style="height: 100%">
      <el-tabs v-model="activeTab" tab-position="left" stretch style="height: 600px">
        <el-tab-pane name="introduction" :label="$t('help.introduction')">
          <div style="text-align: left">
            <div class="introduction">
              {{ $t('common.desc') }}
            </div>
            <el-collapse v-model="originalInfoExpanded" class="original-info">
              <el-collapse-item :title="$t('common.originalProjectInfo')" name="original-project-info">
                <div class="introduction">
                  {{ $t('common.originalDesc') }}
                </div>
                <img src="../../assets/images/group-qrcode.png" alt style="width: 300px" />
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-tab-pane>
        <el-tab-pane name="settings" :label="$t('help.settings')">
          <el-form label-position="right">
            <el-form-item :label="$t('general.language')">
              <el-select v-model="appLanguage">
                <el-option
                  v-for="item in langOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('general.defaultFileListShowType')">
              <el-select v-model="defaultFileListShowType">
                <el-option :label="$t('general.list')" value="list"></el-option>
                <el-option :label="$t('general.thumbnail')" value="thumbnail"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('general.baselineSide')">
              <el-select v-model="baselineSide">
                <el-option :label="$t('general.leftSide')" value="left"></el-option>
                <el-option :label="$t('general.rightSide')" value="right"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('general.colorPickerMode')">
              <el-select v-model="colorPickerMode">
                <el-option value="rgb"></el-option>
                <el-option value="hex"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('general.colorPickerShowPos')">
              <el-switch v-model="colorPickerShowPos" />
            </el-form-item>
            <el-form-item class="annotation-opacity-item" :label="$t('imageSetting.annotationOpacity')">
              <el-slider
                class="annotation-opacity-slider"
                v-model="annotationOpacity"
                :min="0"
                :max="100"
                :step="1"
                :format-tooltip="formatOpacityTooltip"
              ></el-slider>
            </el-form-item>
            <el-form-item label="对比背景色">
              <div flex="cross:center" style="gap: 8px">
                <el-select v-model="compareBgColor" style="width: 120px" placeholder="默认" clearable>
                  <el-option label="默认" value=""></el-option>
                  <el-option label="白色" value="#ffffff"></el-option>
                  <el-option label="黑色" value="#1e1e1e"></el-option>
                </el-select>
                <el-color-picker v-model="compareBgColor" :predefine="['#ffffff', '#1e1e1e', '#2d2d2d', '#3c3c3c']" />
              </div>
              <div style="font-size: 12px; color: #909399; margin-top: 4px">选空或取消选择恢复默认</div>
            </el-form-item>
            <el-form-item :label="$t('general.importOrExportSettings')">
              <el-button @click="settingsImport" type="primary">{{ $t('general.import') }}</el-button>
              <el-button @click="settingsExport" type="primary">{{ $t('general.export') }}</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane name="version" :label="$t('help.version')">
          <el-row class="row-style">
            <el-col :span="5">version</el-col>
            <el-col :span="15">
              {{ appVersion }}
            </el-col>
          </el-row>
          <el-row class="row-style">
            <el-col :span="5">releaseDate</el-col>
            <el-col :span="15">
              {{ releaseDate }}
            </el-col>
          </el-row>
          <el-row class="row-style">
            <el-col :span="5">releaseNotes</el-col>
            <el-col :span="17" style="white-space: break-spaces">{{ releaseNotes }}</el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane name="hotkey" :label="$t('help.hotkey')">
          <vxe-table
            ref="xTable"
            :data="hotkeys"
            :edit-config="{ trigger: 'manual', mode: 'row' }"
            :expand-config="{
              accordion: true,
              visibleMethod: expandVisibleMethod
            }"
            :height="maxHeight"
            :loading="loading"
            class="hotkey-table-scrollbar"
            keep-source
          >
            <!-- <vxe-column field="name" title="Name">
              <template #default="{row}">
                <span>{{ row.name }}</span>
              </template>
            </vxe-column> -->
            <vxe-column type="expand" width="80">
              <template #content="{ row, rowIndex }">
                <div class="hotkey-edit-list">
                  <template v-for="(_, index) in temporaryKeysArrProxy">
                    <span v-if="index > 0" :key="`separator-${index}`" class="hotkey-or">{{ $t('hotkey.or') }}</span>
                    <el-card :key="index" class="hotkey-edit-card" flex="cross:center">
                      <div flex="cross:center">
                        <el-input
                          :id="generateRowId(rowIndex, index)"
                          :disabled="activeRowId !== generateRowId(rowIndex)"
                          v-model="temporaryKeysArrProxy[index]"
                        ></el-input>
                        <el-tooltip :content="$t('gallery.clear')" placement="top">
                          <el-button
                            icon="el-icon-close"
                            circle
                            @click="clearKeys(index, generateRowId(rowIndex, index))"
                            style="margin-left: 10px"
                          ></el-button>
                        </el-tooltip>
                      </div>
                    </el-card>
                  </template>
                  <vxe-button
                    v-if="temporaryKeysArr.length < MAX_HOTKEYS_PER_FUNCTION"
                    icon="el-icon-plus"
                    @click="addHotkey(rowIndex)"
                  >
                    {{ $t('hotkey.add') }}
                  </vxe-button>
                </div>
              </template>
            </vxe-column>
            <vxe-column :title="$t('hotkey.desc')" field="desc" align="left">
              <template #default="{ row }">
                {{ $t(`hotkey.${row.name}`) || row.desc }}
              </template>
            </vxe-column>
            <vxe-column :title="$t('hotkey.key')" field="keysArr" width="250">
              <template #default="{ row }">
                <div class="hotkey-display-list">
                  <template v-for="(keys, index) in row.keysArr">
                    <span v-if="index > 0" :key="`display-separator-${index}`" class="hotkey-or">
                      &nbsp;{{ $t('hotkey.or') }}&nbsp;
                    </span>
                    <span :key="`display-hotkey-${index}`" class="hotkey-display-item">
                      <span v-for="(key, _index) in keys" :key="_index">
                        <kbd class="hotkey">{{ getLabel(key) }}</kbd>
                        <span v-if="_index < keys.length - 1">&nbsp;+&nbsp;</span>
                      </span>
                    </span>
                  </template>
                </div>
              </template>
            </vxe-column>
            <vxe-column title="操作" width="180">
              <template #header>
                <span>{{ $t('generateGIF.operation') }}</span>
                <el-button type="danger" @click="ResetHotkeys" style="margin-left: 8px">
                  {{ $t('common.reset') }}
                </el-button>
              </template>
              <template #default="{ row, rowIndex }">
                <template v-if="activeRowId === generateRowId(rowIndex)">
                  <vxe-button @click="handleSaveHotkey(row)">{{ $t('common.save') }}</vxe-button>
                  <vxe-button @click="handleCancelSaveHotkey(row)">{{ $t('common.cancel') }}</vxe-button>
                </template>
                <template v-else>
                  <vxe-button @click="handleEditHotkey(row, rowIndex)">{{ $t('common.edit') }}</vxe-button>
                </template>
              </template>
            </vxe-column>
          </vxe-table>
        </el-tab-pane>
        <el-tab-pane name="log" :label="$t('help.log')">
          <section class="log-page">
            <header class="log-page-header">
              <div>
                <div class="log-eyebrow">{{ $t('help.logPage.eyebrow') }}</div>
                <h3>{{ $t('help.logPage.title') }}</h3>
                <p>{{ $t('help.logPage.description') }}</p>
              </div>
              <el-button type="primary" size="mini" class="log-open-button" @click="openLogFolder">
                <i class="el-icon-folder-opened"></i>
                {{ $t('help.logPage.openFolder') }}
              </el-button>
            </header>

            <div class="log-file-card">
              <div class="log-file-icon"><i class="el-icon-document"></i></div>
              <div class="log-file-content">
                <div class="log-file-label">{{ $t('help.logPage.fileLabel') }}</div>
                <div class="log-file-path" :title="logPath">{{ logPath }}</div>
              </div>
            </div>

            <div class="log-viewer-header">
              <div>
                <span class="log-viewer-title">{{ $t('help.logPage.recentTitle') }}</span>
                <span class="log-viewer-hint">{{ $t('help.logPage.recentHint') }}</span>
              </div>
              <el-button type="text" size="mini" icon="el-icon-refresh" @click="refreshLogs">
                {{ $t('help.logPage.refresh') }}
              </el-button>
            </div>

            <div class="log-viewer" role="log" :aria-label="$t('help.logPage.viewerLabel')">
              <pre v-if="logTxt">{{ logTxt }}</pre>
              <div v-else class="log-empty">
                <i class="el-icon-document"></i>
                <span>{{ $t('help.logPage.empty') }}</span>
              </div>
            </div>
          </section>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script>
const { dialog } = require('@electron/remote')
const { shell, ipcRenderer } = require('electron')
import fse from 'fs-extra'
import _ from 'lodash'
const appVersion = require('@/../../package.json').version
const { releaseNotes, releaseDate } = require('@/../../package.json').build.releaseInfo
import { createNamespacedHelpers } from 'vuex'
const { mapGetters, mapActions } = createNamespacedHelpers('preferenceStore')
import { i18nRender } from '@/lang'
import {
  ATTRS_KEYS,
  SPECIAL_KEYS,
  PRESET_KEYS_MAP,
  DEFAULT_HOTKEYS,
  MAX_HOTKEYS_PER_FUNCTION
} from '@/tools/hotkey'

export default {
  name: 'AboutDialog',
  data() {
    return {
      activeTab: 'introduction',
      originalInfoExpanded: [],
      activeRowId: '',
      temporaryKeysEleMap: new Map(),
      temporaryKeysArr: [],
      temporaryKeysArrProxy: {},
      visible: false,
      loading: false,
      logPath: '',
      appVersion,
      releaseNotes,
      releaseDate,
      MAX_HOTKEYS_PER_FUNCTION,
      maxHeight: '0',
      logTxt: '',
      langOptions: [
        {
          label: '中文',
          value: 'zh'
        },
        {
          label: 'English',
          value: 'en'
        },
        {
          label: '日本語',
          value: 'ja'
        }
      ]
    }
  },
  computed: {
    ...mapGetters(['preference']),
    hotkeys: {
      get() {
        return [...this.preference.hotkeys].sort((a, b) => a.index - b.index)
      },
      set(arg) {
        this.setPreference({
          hotkeys: arg
        })
      }
    },
    hotkeyStrArr() {
      return this.preference.hotkeys
        .map((keyConf) => keyConf.keysArr.map((keys) => [...keys].sort().toString()))
        .flat(2)
    },
    appLanguage: {
      get() {
        return this.preference.appLanguage
      },
      set(arg) {
        this.setPreference({
          appLanguage: arg
        })
      }
    },
    neverCheckLanguage: {
      get() {
        return this.preference.neverCheckLanguage
      },
      set(arg) {
        this.setPreference({
          neverCheckLanguage: arg
        })
      }
    },
    defaultFileListShowType: {
      get() {
        return this.preference.defaultFileListShowType
      },
      set(arg) {
        this.setPreference({
          defaultFileListShowType: arg
        })
      }
    },
    baselineSide: {
      get() {
        return this.preference.baselineSide === 'right' ? 'right' : 'left'
      },
      set(arg) {
        const baselineSide = arg === 'right' ? 'right' : 'left'
        this.setPreference({ baselineSide })
        this.$store.dispatch('imageStore/refreshCompareTask', { baselineSide })
      }
    },
    colorPickerMode: {
      get() {
        return this.preference.colorPickerMode
      },
      set(arg) {
        this.setPreference({
          colorPickerMode: arg
        })
      }
    },
    colorPickerShowPos: {
      get() {
        return this.preference.colorPickerShowPos
      },
      set(arg) {
        this.setPreference({
          colorPickerShowPos: arg
        })
      }
    },
    annotationOpacity: {
      get() {
        const value = Number(this.preference.annotationOpacity)
        return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 100
      },
      set(arg) {
        this.setPreference({ annotationOpacity: Number(arg) })
      }
    },
    compareBgColor: {
      get() {
        return this.preference.compareBgColor
      },
      set(arg) {
        const color = arg || ''
        this.setPreference({ compareBgColor: color })
        const defaultBg = {
          mode: 'default',
          style: 'background: #e3e7e9; background-image: linear-gradient(45deg, #f6fafc 25%, transparent 0), linear-gradient(45deg, transparent 75%, #f6fafc 0), linear-gradient(45deg, #f6fafc 25%, transparent 0), linear-gradient(45deg, transparent 75%, #f6fafc 0); background-position: 0 0, 10px 10px, 10px 10px, 20px 20px; background-size: 20px 20px;'
        }
        const bg = color
          ? { mode: color === '#ffffff' ? 'light' : 'dark', style: `background: ${color};` }
          : defaultBg
        this.setPreference({ background: bg })
      }
    }
  },
  watch: {
    appLanguage: {
      handler: function () {
        this.$i18n.locale = this.appLanguage
      },
      immediate: true
    },
    activeTab: {
      handler: function () {
        if (this.activeTab === 'hotkey') {
          this.$nextTick(() => {
            this.maxHeight = this.$refs.container.offsetHeight
          })
        }
      }
    }
  },
  mounted() {
    ipcRenderer.on('aboutDialog', (event) => {
      this.visible = !this.visible
      ipcRenderer.send(this.visible ? 'put-in-tray' : 'tray-removed')
    })
    this.logPath = this.$log.transports.file.getFile().path
    this.refreshLogs()
    // check hotkeys
    if (this.hotkeys.length === 0) {
      this.hotkeys = JSON.parse(JSON.stringify(DEFAULT_HOTKEYS))
    }
    this.checkSystemLanguage()
  },
  methods: {
    ...mapActions(['setPreference', 'setHotkey']),
    refreshLogs() {
      this.logTxt = ''
      try {
        const logs = this.$log.transports.file.readAllLogs()
        const lastLog = (logs[0]?.lines || []).slice(-100)
        lastLog.forEach((logLine) => {
          this.logTxt += logLine + '\r\n'
        })
      } catch (e) {
        console.error('get log txt error', e.messages)
        this.logTxt = `${this.$t('help.logPage.readError')}: ${e.message || e}`
      }
    },
    openLogFolder() {
      if (this.logPath) shell.showItemInFolder(this.logPath)
    },
    formatOpacityTooltip(value) {
      return `${value}%`
    },
    checkSystemLanguage() {
      console.log('navigator', navigator, navigator.language)
      if (this.appLanguage !== 'zh' && !this.neverCheckLanguage && navigator?.language?.includes('zh')) {
        const h = this.$createElement
        this.$msgbox({
          title: '设置语言',
          message: h('p', null, [
            h('span', null, '是否将MegSpot使用语言设置为"中文"？ '),
            h('div', { attrs: { flex: 'cross:center' } }, [
              h('input', {
                style: 'color: teal',
                attrs: {
                  type: 'checkbox',
                  id: 'never-show-checkbox'
                },
                // domProps: {
                //   value: this.neverCheckLanguage
                // },
                on: {
                  input: (event) => {
                    this.neverCheckLanguage = event.target.checked
                  }
                }
              }),
              h(
                'label',
                {
                  style: 'color: rgba(0,0,0,0.5)',
                  attrs: {
                    for: 'never-show-checkbox'
                  }
                },
                '不再显示'
              )
            ])
          ]),
          showCancelButton: true,
          confirmButtonText: '使用中文',
          cancelButtonText: '取消',
          type: 'info',
          'append-to-body': true
        }).then(() => {
          this.appLanguage = 'zh'
        })
      }
    },
    getLabel(key) {
      return PRESET_KEYS_MAP.has(key) ? PRESET_KEYS_MAP.get(key).label : key
    },
    show() {
      this.visible = true
    },
    settingsImport() {
      dialog
        .showOpenDialog({
          title: 'import settings',
          filters: [
            {
              name: 'json',
              extensions: ['json']
            }
          ]
        })
        .then(async ({ canceled, filePaths }) => {
          if (canceled) {
            this.$message.info(i18nRender('general.canceled'))
            return
          }
          if (filePaths && filePaths.length) {
            const filePath = filePaths[0]
            try {
              await fse.readJson(filePath).then((json) => {
                this.$store.replaceState(json)
              })
              this.$message.success(i18nRender('general.import') + ' ' + i18nRender('general.success'))
            } catch (err) {
              console.error(err)
              this.$message.error(err)
            }
          }
        })
    },
    settingsExport() {
      const obj = _.cloneDeep(this.$store.state)
      this.saveFile(obj)
    },
    generateRowId(rowIndex, index = '') {
      return `hotkey-${rowIndex}-${index}`
    },
    getOriginStr(row, index) {
      return [...this.hotkeys.find((keyConf) => keyConf.name === row.name).keysArr[index]].sort().toString()
    },
    expandVisibleMethod({ rowIndex }) {
      return this.activeRowId === this.generateRowId(rowIndex)
    },
    closeRow(row) {
      this.activeRowId = ''
      this.$refs.xTable.clearActived()
      row && this.$refs.xTable.setRowExpand(row, false)
    },
    ResetHotkeys() {
      this.closeRow()
      this.$confirm('是否重置快捷键配置为默认配置', '重置快捷键', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        'append-to-body': true
      }).then(() => {
        this.hotkeys = DEFAULT_HOTKEYS
      })
    },
    clearKeys(index, id) {
      this.temporaryKeysArr[index] = []
      this.temporaryKeysEleMap.get(id).value = ''
    },
    addHotkey(rowIndex) {
      if (this.temporaryKeysArr.length >= MAX_HOTKEYS_PER_FUNCTION) {
        return
      }
      this.temporaryKeysArr.push([])
      this.$nextTick(() => {
        const index = this.temporaryKeysArr.length - 1
        const id = this.generateRowId(rowIndex, index)
        const ele = document.getElementById(id)
        this.temporaryKeysEleMap.set(id, ele)
        ele && ele.addEventListener('keydown', this.handleKeydown, true)
      })
    },
    handleKeydown(event) {
      if (event.defaultPrevented) {
        return // Do nothing if the event was already processed
      }
      const { index } = this.parseRowId(event.target.id)
      const attrsKeys = ATTRS_KEYS.map((item) => item.name)
      const specialKeys = SPECIAL_KEYS.map((item) => item.key)
      // 转换ctrlKey、altKey等按键信号
      const attrsKeyIndex = attrsKeys.findIndex((key) => event[key])
      const isCommon = (key) => (key.length === 1 && /\w/.test(key)) || !specialKeys.includes(key)
      let eventKey = event.key
      if (attrsKeyIndex > -1 && !isCommon(eventKey)) {
        eventKey = ATTRS_KEYS.find((keyConf) => keyConf.name === attrsKeys[attrsKeyIndex]).key
      }
      // 已出现则不响应
      if (this.temporaryKeysArr[index].includes(eventKey)) {
        event.preventDefault()
        return
      }
      // 最多出现一个常规字符，否则覆盖已有
      const hasCommonKey = this.temporaryKeysArr[index].some(isCommon)
      if (hasCommonKey) {
        this.temporaryKeysArr[index] = []
      }
      const keys = [eventKey]
      this.temporaryKeysArr[index].push(eventKey)
      if (attrsKeyIndex > 0 && !specialKeys.includes(event.key)) {
        this.temporaryKeysArr[index].push(event.key)
      }
      event.target.value = this.temporaryKeysArrProxy[index]
      event.preventDefault()
    },
    parseRowId(rowId) {
      return /^hotkey-(?<rowIndex>\d+)-(?<index>\d+)$/.exec(rowId).groups
    },
    handleEditHotkey(row, rowIndex) {
      this.temporaryKeysArr = JSON.parse(JSON.stringify(row.keysArr))
      this.temporaryKeysArrProxy = new Proxy(this.temporaryKeysArr, {
        get: (target, key) => {
          if (!isNaN(key) && target[key].map) {
            return target[key].map((key) => this.getLabel(key)).join('+')
          }
          return target[key]
        },
        set: (target, key, value) => {
          // console.log('set', target, key, value);
          target[key] = value
          return true
        }
      })
      this.$nextTick(() => {
        this.$nextTick(() => {
          this.temporaryKeysEleMap.clear()
          for (let i = 0; i < row.keysArr.length; i++) {
            const id = this.generateRowId(rowIndex, i)
            const ele = document.getElementById(id)
            this.temporaryKeysEleMap.set(id, ele)
            ele && ele.addEventListener('keydown', this.handleKeydown, true)
          }
        })
      })
      this.$refs.xTable.setActiveRow(row)
      this.$refs.xTable.setRowExpand(row, true)
      this.activeRowId = this.generateRowId(rowIndex)
    },
    handleSaveHotkey(row) {
      this.closeRow(row)
      const { name, keysArr } = row
      const temporaryKeysArr = JSON.parse(JSON.stringify(this.temporaryKeysArr))
      const temporaryKeysStr = temporaryKeysArr.sort().toString()
      if (JSON.parse(JSON.stringify(keysArr)).sort().toString() === temporaryKeysStr) {
        this.$message.info('无更改')
      } else {
        if (temporaryKeysArr.some((keys) => keys.length === 0)) {
          this.$message.info('快捷键不可为空')
          return
        }
        if (temporaryKeysArr.length > MAX_HOTKEYS_PER_FUNCTION) {
          this.$message.info(`同一功能最多设置${MAX_HOTKEYS_PER_FUNCTION}个快捷键`)
          return
        }
        const otherHotkeyStrArr = this.preference.hotkeys
          .filter((keyConf) => keyConf.name !== name)
          .map((keyConf) => keyConf.keysArr.map((keys) => [...keys].sort().toString()))
          .flat(2)
        const temporaryHotkeyStrArr = temporaryKeysArr.map((keys) => [...keys].sort().toString())
        if (
          new Set(temporaryHotkeyStrArr).size !== temporaryHotkeyStrArr.length ||
          temporaryHotkeyStrArr.some((key) => otherHotkeyStrArr.includes(key))
        ) {
          this.$message.info('已存在相同快捷键')
          return
        }
        this.hotkeys = JSON.parse(
          JSON.stringify([
            ...this.hotkeys.filter((keyConf) => keyConf.name !== name),
            Object.assign({}, row, {
              keysArr: temporaryKeysArr
            })
          ])
        )
        //  this.setHotkey({ name, keysArr: temporaryKeysArr });
        this.$message.success('保存成功')
      }
    },
    handleCancelSaveHotkey(row) {
      this.closeRow(row)
      const $table = this.$refs.xTable
      $table.clearActived().then(() => {
        // 还原行数据
        // $table.revertData(row);
      })
    },
    saveFile(data) {
      dialog
        .showSaveDialog({
          title: 'select folder',
          filters: [{ name: 'json', extensions: ['json'] }]
        })
        .then(async ({ canceled, filePath }) => {
          if (canceled) {
            this.$message.info(i18nRender('general.canceled'))
            return
          }
          if (filePath) {
            try {
              await fse.outputFile(filePath, JSON.stringify(data, null, 2))
              this.$message({
                message: `${i18nRender('general.export')} ${i18nRender(
                  'general.success'
                )}:  <a style="color: blue;">${filePath}</a>`,
                type: 'success',
                dangerouslyUseHTMLString: true
              })
            } catch (err) {
              console.error(err)
              this.$message.error(err)
            }
          }
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.row-style {
  height: 25px;
}

::v-deep {
  .el-dialog__body {
    z-index: 10000;
  }

  #pane-log {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
}

.log-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
  padding: 4px 6px 6px;
  background: #f7f8fa;
  color: #181725;
}

.log-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.log-eyebrow {
  color: #1067d1;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.log-page-header h3 {
  margin: 3px 0 4px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
}

.log-page-header p {
  max-width: 520px;
  margin: 0;
  color: #82848a;
  font-size: 12px;
  line-height: 1.5;
}

.log-open-button {
  flex: 0 0 auto;
  margin-top: 8px;
}

.log-file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(36, 46, 66, 0.06);
}

.log-file-icon {
  display: flex;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #eaf2ff;
  color: #1067d1;
  font-size: 18px;
}

.log-file-content {
  min-width: 0;
}

.log-file-label {
  margin-bottom: 3px;
  color: #82848a;
  font-size: 11px;
}

.log-file-path {
  overflow: hidden;
  color: #181725;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
}

.log-viewer-title {
  font-size: 14px;
  font-weight: 600;
}

.log-viewer-hint {
  margin-left: 8px;
  color: #9a9ca3;
  font-size: 11px;
}

.log-viewer {
  flex: 1;
  min-height: 160px;
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid #29354a;
  border-radius: 8px;
  background: #161d29;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.log-viewer pre {
  margin: 0;
  color: #d8e2f0;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', monospace;
  font-size: 11px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-empty {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8795aa;
  font-size: 12px;
}

@media (max-width: 700px) {
  .log-page-header {
    flex-direction: column;
  }

  .log-open-button {
    margin-top: 0;
  }
}

.introduction {
  padding: 10px;
  text-align: left;
  white-space: pre-line;
  word-break: break-word;
}

.original-info {
  margin-top: 12px;
}

.annotation-opacity-slider {
  width: 120px;
  max-width: 100%;
}

.annotation-opacity-item {
  display: flex;
  align-items: center;

  ::v-deep .el-form-item__label {
    flex: 0 0 140px;
    width: 140px;
    padding-right: 12px;
    text-align: left;
    white-space: nowrap;
  }

  ::v-deep .el-form-item__content {
    flex: 1 1 auto;
    min-width: 0;
    margin-left: 0 !important;
  }
}

.hotkey {
  background-color: rgba(100, 100, 250, 0.2);
  border-radius: 4px;
  padding: 4px;
  box-shadow: inset 0 0 0 1px #b9b9b9;
}

.hotkey-edit-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hotkey-display-list {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.hotkey-display-item {
  display: inline-flex;
  align-items: center;
}

.hotkey-edit-card {
  flex: 0 1 360px;
}

.hotkey-or {
  color: #606266;
  font-weight: 600;
}

/*滚动条整体部分*/
.hotkey-table-scrollbar ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

/*滚动条的轨道*/
.hotkey-table-scrollbar ::-webkit-scrollbar-track {
  background-color: #ffffff;
}

/*滚动条里面的小方块，能向上向下移动*/
.hotkey-table-scrollbar ::-webkit-scrollbar-thumb {
  background-color: #bfbfbf;
  border-radius: 5px;
  border: 1px solid #f1f1f1;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
}

.hotkey-table-scrollbar ::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.hotkey-table-scrollbar ::-webkit-scrollbar-thumb:active {
  background-color: #787878;
}

/*边角，即两个滚动条的交汇处*/
.hotkey-table-scrollbar ::-webkit-scrollbar-corner {
  background-color: #ffffff;
}
</style>
