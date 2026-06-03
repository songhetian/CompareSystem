import { contextBridge as contextBridge$1, webUtils, webFrame, ipcRenderer as ipcRenderer$1 } from "electron";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const electronAPI$1 = {
  ipcRenderer: {
    send(channel, ...args) {
      ipcRenderer$1.send(channel, ...args);
    },
    sendTo(webContentsId, channel, ...args) {
      const electronVer = process.versions.electron;
      const electronMajorVer = electronVer ? parseInt(electronVer.split(".")[0]) : 0;
      if (electronMajorVer >= 28) {
        throw new Error('"sendTo" method has been removed since Electron 28.');
      } else {
        ipcRenderer$1.sendTo(webContentsId, channel, ...args);
      }
    },
    sendSync(channel, ...args) {
      return ipcRenderer$1.sendSync(channel, ...args);
    },
    sendToHost(channel, ...args) {
      ipcRenderer$1.sendToHost(channel, ...args);
    },
    postMessage(channel, message, transfer) {
      ipcRenderer$1.postMessage(channel, message, transfer);
    },
    invoke(channel, ...args) {
      return ipcRenderer$1.invoke(channel, ...args);
    },
    on(channel, listener) {
      ipcRenderer$1.on(channel, listener);
      return () => {
        ipcRenderer$1.removeListener(channel, listener);
      };
    },
    once(channel, listener) {
      ipcRenderer$1.once(channel, listener);
      return () => {
        ipcRenderer$1.removeListener(channel, listener);
      };
    },
    removeListener(channel, listener) {
      ipcRenderer$1.removeListener(channel, listener);
      return this;
    },
    removeAllListeners(channel) {
      ipcRenderer$1.removeAllListeners(channel);
    }
  },
  webFrame: {
    insertCSS(css) {
      return webFrame.insertCSS(css);
    },
    setZoomFactor(factor) {
      if (typeof factor === "number" && factor > 0) {
        webFrame.setZoomFactor(factor);
      }
    },
    setZoomLevel(level) {
      if (typeof level === "number") {
        webFrame.setZoomLevel(level);
      }
    }
  },
  webUtils: {
    getPathForFile(file) {
      return webUtils.getPathForFile(file);
    }
  },
  process: {
    get platform() {
      return process.platform;
    },
    get versions() {
      return process.versions;
    },
    get env() {
      return { ...process.env };
    }
  }
};
function exposeElectronAPI() {
  if (process.contextIsolated) {
    try {
      contextBridge$1.exposeInMainWorld("electron", electronAPI$1);
    } catch (error) {
      console.error(error);
    }
  } else {
    window.electron = electronAPI$1;
  }
}
const { contextBridge, ipcRenderer } = require2("electron");
const api = {
  calculateManpower: (data) => ipcRenderer.invoke("calc:manpower", data),
  getShifts: () => ipcRenderer.invoke("get:shifts"),
  addShift: (data) => ipcRenderer.invoke("add:shift", data),
  updateShift: (data) => ipcRenderer.invoke("update:shift", data),
  deleteShift: (id) => ipcRenderer.invoke("delete:shift", id),
  getPromotions: () => ipcRenderer.invoke("get:promotions"),
  addPromotion: (data) => ipcRenderer.invoke("add:promotion", data),
  updatePromotion: (data) => ipcRenderer.invoke("update:promotion", data),
  deletePromotion: (id) => ipcRenderer.invoke("delete:promotion", id),
  getSchemes: () => ipcRenderer.invoke("get:schemes"),
  addScheme: (data) => ipcRenderer.invoke("add:scheme", data),
  updateScheme: (data) => ipcRenderer.invoke("update:scheme", data),
  deleteScheme: (id) => ipcRenderer.invoke("delete:scheme", id),
  setDefaultScheme: (id) => ipcRenderer.invoke("set-default:scheme", id),
  getHistory: () => ipcRenderer.invoke("get:history"),
  deleteHistory: (id) => ipcRenderer.invoke("delete:history", id),
  // 历史项目管理
  getHistoryProjects: () => ipcRenderer.invoke("get:historyProjects"),
  addHistoryProject: (data) => ipcRenderer.invoke("add:historyProject", data),
  updateHistoryProject: (data) => ipcRenderer.invoke("update:historyProject", data),
  deleteHistoryProject: (id) => ipcRenderer.invoke("delete:historyProject", id),
  // 历史业务数据
  getHistoryData: (projectId, limit) => ipcRenderer.invoke("get:historyData", projectId, limit),
  addHistoryData: (data) => ipcRenderer.invoke("add:historyData", data),
  batchHistoryData: (projectId, records) => ipcRenderer.invoke("batch:historyData", projectId, records),
  deleteHistoryData: (ids) => ipcRenderer.invoke("delete:historyData", ids)
};
if (process.contextIsolated) {
  try {
    exposeElectronAPI();
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
