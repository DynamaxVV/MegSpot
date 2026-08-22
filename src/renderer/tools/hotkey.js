import store from '../store'
import { Message } from 'element-ui'

const isDrawn = process.platform === 'darwin'

export const ATTRS_KEYS = [
  {
    name: 'ctrlKey',
    key: 'Control',
    label: isDrawn ? 'Control' : 'Ctrl'
  },
  {
    name: 'metaKey',
    key: 'Meta',
    label: isDrawn ? '⌘ Command' : '⊞ Win'
  },
  {
    name: 'altKey',
    key: isDrawn ? 'Option' : 'Alt',
    label: isDrawn ? '⌥ Option' : 'Alt'
  }
]

export const ATTRS_KEYS_VALUE = ['Control', 'Meta', 'Option', 'Alt']

export const SPECIAL_KEYS = [
  ...ATTRS_KEYS,
  { name: 'Shift', key: 'Shift', label: 'Shift' },
  { name: 'Enter', key: 'Enter', label: 'Enter' },
  {
    name: 'Space',
    key: ' ',
    label: 'Space'
  },
  {
    name: 'Escape',
    key: 'Escape',
    label: 'Esc'
  },
  {
    name: 'ArrowLeft',
    key: 'ArrowLeft',
    label: '←'
  },
  {
    name: 'ArrowUp',
    key: 'ArrowUp',
    label: '↑' // ⇧
  },
  {
    name: 'ArrowRight',
    key: 'ArrowRight',
    label: '→'
  },
  {
    name: 'ArrowDown',
    key: 'ArrowDown',
    label: '↓'
  }
]

export const PRESET_KEYS = [...SPECIAL_KEYS]

export const PRESET_KEYS_MAP = new Map(PRESET_KEYS.map((item) => [item.key, item]))

export const MAX_HOTKEYS_PER_FUNCTION = 2

const ctrlOrCommand = isDrawn ? 'Meta' : 'Control'

export const DEFAULT_HOTKEYS = [
  {
    name: 'back',
    desc: 'back to file select',
    keysArr: [['Escape']]
  },
  {
    name: 'moveUp',
    desc: 'move upward',
    keysArr: [['w']]
  },
  {
    name: 'moveLeft',
    desc: 'move left',
    keysArr: [['a']]
  },
  {
    name: 'moveDown',
    desc: 'move downward',
    keysArr: [['s']]
  },
  {
    name: 'moveRight',
    desc: 'move right',
    keysArr: [['d']]
  },
  {
    name: 'pickColor',
    desc: 'pick color in image',
    keysArr: [[ctrlOrCommand, 'p']]
  },
  {
    name: 'pairPrevious',
    desc: 'previous pair',
    keysArr: [['ArrowUp']]
  },
  {
    name: 'pairNext',
    desc: 'next pair',
    keysArr: [['ArrowDown']]
  },
  {
    name: 'pairPreviewLeft',
    desc: 'show the right image on the left',
    keysArr: [['ArrowLeft']]
  },
  {
    name: 'pairPreviewRight',
    desc: 'show the left image on the right',
    keysArr: [['ArrowRight']]
  },
  {
    name: 'pairReset',
    desc: 'reset the current pair',
    keysArr: [[' ']]
  },
  {
    name: 'reviewToggle',
    desc: 'toggle proofing mode',
    keysArr: [[ctrlOrCommand, 'r']]
  },
  {
    name: 'reviewNumbers',
    desc: 'show or hide proofing annotation numbers',
    keysArr: [[ctrlOrCommand, 'n']]
  }
].map((item, index) => {
  item.index = index
  return item
})

export function getArrStr(arr) {
  let cloneArr = JSON.parse(JSON.stringify(arr))
  cloneArr = Array.isArray(cloneArr) ? cloneArr : [cloneArr]
  return cloneArr.sort().toString()
}

export function getPressedKeysStr(event) {
  const attrsKeys = ATTRS_KEYS.map((item) => item.name)
  const attrsKeyIndex = attrsKeys.findIndex((key) => event[key])
  const pressedKeys = [event.key]
  if (attrsKeyIndex > -1) {
    pressedKeys.push(ATTRS_KEYS.find((keyConf) => keyConf.name === attrsKeys[attrsKeyIndex]).key)
  }
  return pressedKeys.sort().toString()
}

export function ensureHotkeysMapExists() {
  store.dispatch('preferenceStore/ensureHotkeysMap') // 确保keysMap存在
}

export function handleEvent(event, callbackFnMap) {
  ensureHotkeysMapExists()
  const hotkeysMap = store.state.preferenceStore.hotkeysMap
  const pressedKeysStr = getPressedKeysStr(event)
  const hotkeyName = hotkeysMap.get(pressedKeysStr)
  const hotkeyEvent = callbackFnMap.get(hotkeyName)
  if (hotkeyName && hotkeyEvent) {
    hotkeyEvent(event)
    return true
  }
  return false
}
