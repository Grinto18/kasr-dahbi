var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var electronPosApi = {
  getAppInfo: () => import_electron.ipcRenderer.invoke("get-app-info"),
  getPrinters: () => import_electron.ipcRenderer.invoke("get-printers"),
  printReceiptHtml: (options) => import_electron.ipcRenderer.invoke("print-receipt-html", options),
  printSilent: (options) => import_electron.ipcRenderer.invoke("print-silent", options)
};
import_electron.contextBridge.exposeInMainWorld("electronPos", electronPosApi);
