import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

// Determine userData directory (e.g. %APPDATA%/GoldenPalacePOS on Windows)
const userDataPath = app.getPath('userData');
const posDataDir = path.join(userDataPath, 'data');
const backupsDir = path.join(posDataDir, 'backups');

// Ensure data and backup directories exist safely in AppData
if (!fs.existsSync(posDataDir)) {
  fs.mkdirSync(posDataDir, { recursive: true });
}
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// If user does not yet have a database in AppData, seed it with the default DB
const destDbFile = path.join(posDataDir, 'golden_palace_db.json');
if (!fs.existsSync(destDbFile)) {
  const possibleSeedPaths = [
    path.join(__dirname, '..', 'data', 'golden_palace_db.json'),
    path.join(process.resourcesPath || '', 'data', 'golden_palace_db.json'),
    path.join(process.cwd(), 'data', 'golden_palace_db.json'),
  ];
  for (const seedPath of possibleSeedPaths) {
    if (fs.existsSync(seedPath)) {
      try {
        fs.copyFileSync(seedPath, destDbFile);
        console.log(`Copied initial seed DB from ${seedPath} to ${destDbFile}`);
        break;
      } catch (err) {
        console.error('Error copying seed DB:', err);
      }
    }
  }
}

// Pass POS_DATA_DIR so engine.ts persists in AppData (immune to app updates)
process.env.POS_DATA_DIR = posDataDir;
process.env.IS_ELECTRON = 'true';
process.env.NODE_ENV = app.isPackaged ? 'production' : (process.env.NODE_ENV || 'production');

let mainWindow: BrowserWindow | null = null;
let serverInstance: any = null;

async function createWindow(serverPort: number) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Golden Palace POS - القصر الذهبي',
    backgroundColor: '#0B0B0E',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'public', 'pwa-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load local express server running locally
  const targetUrl = `http://127.0.0.1:${serverPort}`;
  console.log(`Loading Golden Palace POS in Electron window from: ${targetUrl}`);
  await mainWindow.loadURL(targetUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC handlers for silent/thermal printing and system information
ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    userDataPath,
    posDataDir,
    backupsDir,
    isPackaged: app.isPackaged,
    platform: process.platform,
  };
});

ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err: any) {
    console.error('Error getting Windows printers:', err);
    return [];
  }
});

// Direct HTML thermal receipt printer via invisible print window to target Windows Print Spooler
ipcMain.handle(
  'print-receipt-html',
  async (
    _event,
    options: {
      html: string;
      deviceName?: string;
      paperSize?: '58mm' | '80mm' | 'A4';
      silent?: boolean;
    }
  ) => {
    return new Promise((resolve) => {
      try {
        const is58 = options.paperSize === '58mm';
        const is80 = options.paperSize === '80mm';

        // 58mm = 58000 microns, 80mm = 80000 microns
        const pageSize = is58
          ? { width: 58000, height: 250000 }
          : is80
          ? { width: 80000, height: 350000 }
          : 'A4';

        // Create an off-screen background window dedicated to printing the receipt HTML
        const printWin = new BrowserWindow({
          show: false,
          width: is58 ? 320 : is80 ? 420 : 800,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        // Load thermal receipt HTML with UTF-8 encoding
        const encodedData = `data:text/html;charset=utf-8,${encodeURIComponent(options.html)}`;
        printWin.loadURL(encodedData);

        printWin.webContents.on('did-finish-load', () => {
          setTimeout(() => {
            printWin.webContents.print(
              {
                silent: options.silent ?? true,
                printBackground: true,
                deviceName: options.deviceName || '',
                pageSize,
                margins: {
                  marginType: 'none',
                },
              },
              (success, failureReason) => {
                try {
                  printWin.close();
                } catch {
                  // ignore
                }
                if (!success) {
                  console.warn('Windows Print Spooler failure:', failureReason);
                  resolve({
                    success: false,
                    error: failureReason || 'فشل إرسال مهمة الطباعة إلى نظام Windows Spooler',
                  });
                } else {
                  console.log(`Print job dispatched successfully to Windows printer [${options.deviceName || 'Default'}]`);
                  resolve({ success: true });
                }
              }
            );
          }, 300); // Allow fonts and layout to settle
        });

        printWin.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
          try {
            printWin.close();
          } catch {
            // ignore
          }
          resolve({
            success: false,
            error: `تعذر تحميل قالب الإيصال: ${errorDescription} (${errorCode})`,
          });
        });
      } catch (err: any) {
        console.error('Unhandled printing error:', err);
        resolve({ success: false, error: err.message || 'خطأ غير متوقع أثناء الطباعة' });
      }
    });
  }
);

ipcMain.handle(
  'print-silent',
  async (
    _event,
    options: {
      deviceName?: string;
      paperSize?: '58mm' | '80mm' | 'A4';
      silent?: boolean;
    }
  ) => {
    if (!mainWindow) return { success: false, error: 'Window not available' };

    return new Promise((resolve) => {
      const pageSize =
        options.paperSize === '58mm'
          ? { width: 58000, height: 200000 }
          : options.paperSize === '80mm'
          ? { width: 80000, height: 297000 }
          : 'A4';

      mainWindow?.webContents.print(
        {
          silent: options.silent ?? true,
          printBackground: true,
          deviceName: options.deviceName || '',
          pageSize,
          margins: {
            marginType: 'none',
          },
        },
        (success, failureReason) => {
          if (!success) {
            console.warn('Print failed or cancelled:', failureReason);
            resolve({ success: false, error: failureReason });
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  }
);

app.whenReady().then(async () => {
  try {
    // Import server module from local bundle or source
    let startServerFn: any;
    if (fs.existsSync(path.join(__dirname, 'server.cjs'))) {
      const srvMod = require('./server.cjs');
      startServerFn = srvMod.startServer;
    } else {
      const srvMod = await import('../server.ts');
      startServerFn = srvMod.startServer;
    }
    
    // Determine path to built frontend dist
    const distPath = app.isPackaged
      ? path.join(process.resourcesPath, 'dist')
      : path.join(__dirname, '..', 'dist');

    // Start local express server on dynamic available port
    const { server, port } = await startServerFn(0, distPath);
    serverInstance = server;

    await createWindow(port);
  } catch (err) {
    console.error('Failed to start Golden Palace POS application:', err);
  }
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
    // Recreate if needed
  }
});
