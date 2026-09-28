import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronPosApi {
  getAppInfo: () => Promise<{
    version: string;
    userDataPath: string;
    posDataDir: string;
    backupsDir: string;
    isPackaged: boolean;
    platform: string;
  }>;
  getPrinters: () => Promise<Array<{
    name: string;
    displayName: string;
    description: string;
    status: number;
    isDefault: boolean;
  }>>;
  printReceiptHtml: (options: {
    html: string;
    deviceName?: string;
    paperSize?: '58mm' | '80mm' | 'A4';
    silent?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  printSilent: (options: {
    deviceName?: string;
    paperSize?: '58mm' | '80mm' | 'A4';
    silent?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
}

const electronPosApi: ElectronPosApi = {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceiptHtml: (options) => ipcRenderer.invoke('print-receipt-html', options),
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
};

contextBridge.exposeInMainWorld('electronPos', electronPosApi);
