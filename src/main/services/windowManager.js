import { BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'path'
import menuconfig from '../config/menu'
import config from '@config/index'
import { platform } from 'os'
import setIpc from './ipcMain'
import { winURL, loadingURL } from '../config/StaticPath'
import setTray from './tray'
import { cmdArg } from './cmdParse'

export var loadWindow = null
export var mainWindow = null

function loadPage(window, url) {
  const loadPromise = process.env.NODE_ENV === 'development' ? window.loadURL(url) : window.loadFile(url)
  loadPromise.catch((error) => {
    console.error('Failed to load window page', { url, error: error?.message || error })
  })
}

export function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return false
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
  return true
}

const appIconName = 'logo_icon.png'
const iconPath = path.join(__dirname, '../../renderer/assets/images/' + appIconName)
export function createMainWindow() {
  mainWindow = new BrowserWindow({
    height: 800,
    useContentSize: true,
    width: 1700,
    show: false,
    frame: config.IsUseSysTitle,
    titleBarStyle: platform().includes('win32') ? 'default' : 'hidden',
    // backgroundColor: '#2e2c29',
    icon: iconPath, // sets window icon
    webPreferences: {
      experimentalFeatures: true,
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false,
      // 如果是开发模式可以使用devTools
      devTools: true,
      // devTools: true,
      // 在macos中启用橡皮动画
      scrollBounce: process.platform === 'darwin'
    }
  })
  // 加载托盘图标
  // setTray(mainWindow, iconPath);

  // 全屏
  mainWindow.maximize()

  // 载入菜单
  if (process.platform === 'darwin') {
    menuconfig.push({
      label: 'Application',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function () {
            mainWindow.close()
          }
        }
      ]
    })
  }
  const menu = Menu.buildFromTemplate(menuconfig)
  Menu.setApplicationMenu(menu)
  loadPage(mainWindow, winURL)

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Main window failed to load', {
      errorCode,
      errorDescription,
      validatedURL
    })
  })

  require('@electron/remote/main').enable(mainWindow.webContents)

  setIpc.Mainfunc(mainWindow, config.IsUseSysTitle)
  ipcMain.on('get_start_cmd_arg', (event) => {
    event.returnValue = cmdArg
  })
  mainWindow.once('ready-to-show', () => {
    console.log('=== show mainWindow ===')
    mainWindow.show()
    if (config.UseStartupChart && loadWindow) loadWindow?.destroy()
  })


  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools(true)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
// https://www.electronjs.org/docs/api/browser-window#new-browserwindowoptions
function loadingWindow() {
  loadWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,

    show: true,
    backgroundColor: '#222',
    skipTaskbar: true,
    transparent: true,
    resizable: true,
    center: true,
    maximizable: true,
    webPreferences: {
      experimentalFeatures: true
    }
  })

  loadPage(loadWindow, loadingURL)

  loadWindow.show()
  console.log('=== show loadWindow   ===')

  createMainWindow()

  loadWindow.on('closed', () => {
    loadWindow = null
  })
}

function initWindow() {
  return loadingWindow()
}
export default initWindow
