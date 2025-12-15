const { app, BrowserWindow } = require('electron')
const path = require('path')

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

    // Check if we are in dev mode
    // We can assume if we are running from 'electron .' with no args it might be dev if we check for localhost
    // But simpler: try to load localhost, if fail, load file.

    // Better approach for this specific setup:
    // If we run `npm run electron:dev`, we want localhost.
    // If we run `npm run electron:start` (which we defined as `electron .`), we might want dist/index.html if built.

    // Let's just check if env var is set or try to connect.
    // For simplicity in this "double click" scenario, we will rely on the build.

    // However, for development, let's allow localhost.
    const isDev = process.env.npm_lifecycle_event === 'electron:dev';

    if (isDev) {
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
