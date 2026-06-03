const { contextBridge, ipcRenderer } = require('electron')
import { exposeElectronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  calculateManpower: (data: any) => ipcRenderer.invoke('calc:manpower', data),
  getShifts: () => ipcRenderer.invoke('get:shifts'),
  addShift: (data: any) => ipcRenderer.invoke('add:shift', data),
  updateShift: (data: any) => ipcRenderer.invoke('update:shift', data),
  deleteShift: (id: number) => ipcRenderer.invoke('delete:shift', id),
  getPromotions: () => ipcRenderer.invoke('get:promotions'),
  addPromotion: (data: any) => ipcRenderer.invoke('add:promotion', data),
  updatePromotion: (data: any) => ipcRenderer.invoke('update:promotion', data),
  deletePromotion: (id: number) => ipcRenderer.invoke('delete:promotion', id),
  getSchemes: () => ipcRenderer.invoke('get:schemes'),
  addScheme: (data: any) => ipcRenderer.invoke('add:scheme', data),
  updateScheme: (data: any) => ipcRenderer.invoke('update:scheme', data),
  deleteScheme: (id: number) => ipcRenderer.invoke('delete:scheme', id),
  setDefaultScheme: (id: number) => ipcRenderer.invoke('set-default:scheme', id),
  getHistory: () => ipcRenderer.invoke('get:history'),
  addHistory: (data: any) => ipcRenderer.invoke('add:history', data),
  deleteHistory: (id: number) => ipcRenderer.invoke('delete:history', id),

  // 部门管理
  getDepartments: () => ipcRenderer.invoke('get:departments'),
  addDepartment: (data: any) => ipcRenderer.invoke('add:department', data),
  updateDepartment: (data: any) => ipcRenderer.invoke('update:department', data),
  deleteDepartment: (id: number) => ipcRenderer.invoke('delete:department', id),

  // 人员管理
  getPersonnel: (deptId?: number) => ipcRenderer.invoke('get:personnel', deptId),
  addPersonnel: (data: any) => ipcRenderer.invoke('add:personnel', data),
  updatePersonnel: (data: any) => ipcRenderer.invoke('update:personnel', data),
  deletePersonnel: (id: number) => ipcRenderer.invoke('delete:personnel', id),
  batchPersonnel: (data: any[]) => ipcRenderer.invoke('batch:personnel', data),

  // 排班管理
  getAssignments: (startDate: string, endDate: string) => ipcRenderer.invoke('get:assignments', startDate, endDate),
  addAssignment: (data: any) => ipcRenderer.invoke('add:assignment', data),
  deleteAssignment: (id: number) => ipcRenderer.invoke('delete:assignment', id),
  batchAssignments: (assignments: any[]) => ipcRenderer.invoke('batch:assignments', assignments),

  // 历史项目管理
  getHistoryProjects: () => ipcRenderer.invoke('get:historyProjects'),
  addHistoryProject: (data: any) => ipcRenderer.invoke('add:historyProject', data),
  updateHistoryProject: (data: any) => ipcRenderer.invoke('update:historyProject', data),
  deleteHistoryProject: (id: number) => ipcRenderer.invoke('delete:historyProject', id),

  // 历史业务数据
  getHistoryData: (projectId?: number, limit?: number) => ipcRenderer.invoke('get:historyData', projectId, limit),
  addHistoryData: (data: any) => ipcRenderer.invoke('add:historyData', data),
  batchHistoryData: (projectId: number, records: any[]) => ipcRenderer.invoke('batch:historyData', projectId, records),
  deleteHistoryData: (ids: number[]) => ipcRenderer.invoke('delete:historyData', ids),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if ((process as any).contextIsolated) {
  try {
    exposeElectronAPI()
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
