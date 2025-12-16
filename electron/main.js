const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// Zjistit zda běžíme v dev režimu
const isDev = process.env.npm_lifecycle_event === 'electron:dev' || !app.isPackaged

// Cesta k JSON souboru:
// - V dev režimu: přímo v projektu
// - V produkci: vedle .app souboru (pro sdílení mezi uživateli)
const getDataDir = () => {
  if (isDev) {
    return path.join(__dirname, '..', 'data')
  } else {
    // V produkci - vedle .app souboru
    const appPath = app.getPath('exe')
    // Na macOS je exe uvnitř .app/Contents/MacOS/, chceme složku vedle .app
    const appDir = path.dirname(path.dirname(path.dirname(path.dirname(appPath))))
    return path.join(appDir, 'SaaS-Data')
  }
}

const getDataPath = () => path.join(getDataDir(), 'clients-data.json')

// Zajistit že složka data existuje
const ensureDataDir = () => {
  const dataDir = getDataDir()
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Handler pro načtení dat
ipcMain.handle('load-data', async () => {
  try {
    const dataPath = getDataPath()
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Chyba při načítání:', e)
  }
  return null
})

// Handler pro uložení dat
ipcMain.handle('save-data', async (event, data) => {
  try {
    ensureDataDir()
    const dataPath = getDataPath()
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error('Chyba při ukládání:', e)
    return false
  }
})

// Handler pro získání cesty k souboru
ipcMain.handle('get-data-path', async () => {
  return getDataPath()
})

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0a0a0f'
    })

    if (process.env.npm_lifecycle_event === 'electron:dev') {
        win.loadURL('http://localhost:5173')
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
