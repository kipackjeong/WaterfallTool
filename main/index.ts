// Packages
import { BrowserWindow, app } from 'electron'
import serve from 'electron-serve'
import isDev from 'electron-is-dev'
import { join } from 'path'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

// Prepare nextjs in dev mode
const prepareNext = async () => {
  const nextApp = next({ dev: true, dir: join(app.getAppPath(), 'renderer') })
  const handle = nextApp.getRequestHandler()
  await nextApp.prepare()
  return handle
}

// Initialize serve for production mode
const loadURL = serve({ directory: 'renderer/out' })

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  // Setup IPC API handlers
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1050,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Temporarily disable for debugging
      preload: join(app.getAppPath(), 'main/preload.js'), // Absolute path to preload script
    },
  })

  // Add event handlers for debugging
  mainWindow.webContents.on('did-fail-load', (errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window finished loading')
  })

  mainWindow.webContents.on('console-message', (message) => {
    console.log('Renderer console:', message)
  })

  if (isDev) {
    // Development - use Next.js dev server
    const handle = await prepareNext()
    const port = process.argv[2] || 3000

    createServer((req: any, res: any) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    }).listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`)
      mainWindow.loadURL(`http://localhost:${port}/`)
    })

    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools()
  } else {
    // Production - use static files
    console.log('Running in production mode')
    console.log('App path:', app.getAppPath())
    console.log('Loading from static files directory:', join(app.getAppPath(), 'renderer/out'))

    try {
      // Try loading directly from file path first
      const indexPath = join(app.getAppPath(), 'renderer/out/index.html')
      console.log('Attempting to load index from:', indexPath)

      try {
        // Try the loadURL helper first
        console.log('Trying loadURL helper...')
        await loadURL(mainWindow)
      } catch (loadUrlError) {
        console.error('Error using loadURL:', loadUrlError)

        // Fallback to direct file loading
        console.log('Falling back to direct file loading...')
        try {
          await mainWindow.loadFile(indexPath)
        } catch (fileLoadError) {
          console.error('Error using loadFile:', fileLoadError)
        }
      }

      // Enable DevTools in production temporarily for debugging
      mainWindow.webContents.openDevTools()
    } catch (error) {
      console.error('Error loading URL:', error)
    }
  }

  // Show window when content is ready
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
})

// Quit the app once all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    app.emit('ready')
  }
})
