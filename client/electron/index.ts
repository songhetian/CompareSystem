const { app, shell, BrowserWindow, ipcMain } = require('electron')
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ManpowerCalculator } from '../src/utils/calculator'
import { DBManager } from './db'
import dayjs from 'dayjs'

const dbManager = new DBManager()

// IPC Handlers for History Records
ipcMain.handle('get:history', async (_event: any) => {
  return dbManager.query('SELECT * FROM historical_schemes ORDER BY create_time DESC', [])
})

ipcMain.handle('delete:history', async (_event: any, id: number) => {
  return dbManager.execute('DELETE FROM historical_schemes WHERE id = ?', [id])
})

ipcMain.handle('add:history', async (_event: any, data: { name: string, params: any, result: any, desc: string, startDate?: string, endDate?: string }) => {
  return dbManager.execute(
    'INSERT INTO historical_schemes (scheme_name, params_json, result_json, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, JSON.stringify(data.params), JSON.stringify(data.result), data.desc, data.startDate || null, data.endDate || null]
  )
})

// IPC Handlers for Parameter Schemes
ipcMain.handle('get:schemes', async (_event: any) => {
  return dbManager.query('SELECT * FROM parameter_schemes ORDER BY is_default DESC, update_time DESC', [])
})

ipcMain.handle('add:scheme', async (_event: any, data: { name: string, params: any, desc: string }) => {
  return dbManager.execute(
    'INSERT INTO parameter_schemes (scheme_name, params_json, description) VALUES (?, ?, ?)',
    [data.name, JSON.stringify(data.params), data.desc]
  )
})

ipcMain.handle('update:scheme', async (_event: any, data: { id: number, name: string, params: any, desc: string }) => {
  return dbManager.execute(
    'UPDATE parameter_schemes SET scheme_name = ?, params_json = ?, description = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
    [data.name, JSON.stringify(data.params), data.desc, data.id]
  )
})

ipcMain.handle('delete:scheme', async (_event: any, id: number) => {
  return dbManager.execute('DELETE FROM parameter_schemes WHERE id = ?', [id])
})

ipcMain.handle('set-default:scheme', async (_event: any, id: number) => {
  dbManager.execute('UPDATE parameter_schemes SET is_default = 0', [])
  return dbManager.execute('UPDATE parameter_schemes SET is_default = 1 WHERE id = ?', [id])
})

// IPC Handlers for Promotions
ipcMain.handle('get:promotions', async (_event: any) => {
  return dbManager.query('SELECT * FROM promotion_schemes', [])
})

ipcMain.handle('add:promotion', async (_event: any, data: { name: string, factor: number, desc: string }) => {
  return dbManager.execute(
    'INSERT INTO promotion_schemes (scheme_name, factor, description) VALUES (?, ?, ?)',
    [data.name, data.factor, data.desc]
  )
})

ipcMain.handle('delete:promotion', async (_event: any, id: number) => {
  return dbManager.execute('DELETE FROM promotion_schemes WHERE id = ?', [id])
})

ipcMain.handle('update:promotion', async (_event: any, data: { id: number, name: string, factor: number, desc: string }) => {
  return dbManager.execute(
    'UPDATE promotion_schemes SET scheme_name = ?, factor = ?, description = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
    [data.name, data.factor, data.desc, data.id]
  )
})

// IPC Handlers for Shifts
ipcMain.handle('get:shifts', async (_event: any) => {
  return dbManager.query('SELECT * FROM shifts WHERE status = 1', [])
})

ipcMain.handle('add:shift', async (_event: any, data: { name: string, type: string, start: string, end: string, hours: number, rest: number }) => {
  return dbManager.execute(
    'INSERT INTO shifts (shift_name, shift_type, start_time, end_time, work_hours, rest_hours) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.type, data.start, data.end, data.hours, data.rest]
  )
})

ipcMain.handle('delete:shift', async (_event: any, id: number) => {
  return dbManager.execute('DELETE FROM shifts WHERE id = ?', [id])
})

ipcMain.handle('update:shift', async (_event: any, data: { id: number, name: string, type: string, start: string, end: string, hours: number, rest: number }) => {
  return dbManager.execute(
    'UPDATE shifts SET shift_name = ?, shift_type = ?, start_time = ?, end_time = ?, work_hours = ?, rest_hours = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
    [data.name, data.type, data.start, data.end, data.hours, data.rest, data.id]
  )
})

// IPC Handlers for Departments
ipcMain.handle('get:departments', async (_event: any) => {
  return dbManager.query('SELECT * FROM departments WHERE status = 1', [])
})

ipcMain.handle('add:department', async (_event: any, data: { name: string, description: string, parentId?: number }) => {
  return dbManager.execute(
    'INSERT INTO departments (dept_name, description, parent_id) VALUES (?, ?, ?)',
    [data.name, data.description, data.parentId || null]
  )
})

ipcMain.handle('update:department', async (_event: any, data: { id: number, name: string, description: string, parentId?: number }) => {
  return dbManager.execute(
    'UPDATE departments SET dept_name = ?, description = ?, parent_id = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
    [data.name, data.description, data.parentId || null, data.id]
  )
})

ipcMain.handle('delete:department', async (_event: any, id: number) => {
  return dbManager.execute('UPDATE departments SET status = 0 WHERE id = ?', [id])
})

// IPC Handlers for Personnel
ipcMain.handle('get:personnel', async (_event: any, deptId?: number) => {
  if (deptId) {
    return dbManager.query(
      'SELECT p.*, d.dept_name FROM personnel p LEFT JOIN departments d ON p.dept_id = d.id WHERE p.status = 1 AND p.dept_id = ?',
      [deptId]
    )
  }
  return dbManager.query(
    'SELECT p.*, d.dept_name FROM personnel p LEFT JOIN departments d ON p.dept_id = d.id WHERE p.status = 1',
    []
  )
})

ipcMain.handle('add:personnel', async (_event: any, data: { name: string, staffId: string, deptId: number, position: string, phone: string }) => {
  return dbManager.execute(
    'INSERT INTO personnel (name, staff_id, dept_id, position, phone) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.staffId, data.deptId, data.position, data.phone]
  )
})

ipcMain.handle('update:personnel', async (_event: any, data: { id: number, name: string, staffId: string, deptId: number, position: string, phone: string }) => {
  return dbManager.execute(
    'UPDATE personnel SET name = ?, staff_id = ?, dept_id = ?, position = ?, phone = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
    [data.name, data.staffId, data.deptId, data.position, data.phone, data.id]
  )
})

ipcMain.handle('delete:personnel', async (_event: any, id: number) => {
  return dbManager.execute('UPDATE personnel SET status = 0 WHERE id = ?', [id])
})

ipcMain.handle('batch:personnel', async (_event: any, personnelList: Array<{ name: string, staffId: string, deptId: number, position: string, phone: string }>) => {
  const stmt = dbManager.db.prepare('INSERT OR IGNORE INTO personnel (name, staff_id, dept_id, position, phone) VALUES (?, ?, ?, ?, ?)')
  const transaction = dbManager.db.transaction((data: any[]) => {
    for (const p of data) {
      stmt.run(p.name, p.staffId, p.deptId, p.position, p.phone)
    }
  })
  transaction(personnelList)
  return { success: true, count: personnelList.length }
})

// IPC Handlers for Shift Assignments
ipcMain.handle('get:assignments', async (_event: any, startDate: string, endDate: string) => {
  return dbManager.query(
    `SELECT a.*, p.name as personnel_name, s.shift_name, s.start_time, s.end_time
     FROM shift_assignments a
     JOIN personnel p ON a.personnel_id = p.id
     JOIN shifts s ON a.shift_id = s.id
     WHERE a.assignment_date BETWEEN ? AND ?`,
    [startDate, endDate]
  )
})

ipcMain.handle('add:assignment', async (_event: any, data: { personnelId: number, shiftId: number, date: string, remark: string }) => {
  return dbManager.execute(
    'INSERT INTO shift_assignments (personnel_id, shift_id, assignment_date, remark) VALUES (?, ?, ?, ?)',
    [data.personnelId, data.shiftId, data.date, data.remark]
  )
})

ipcMain.handle('delete:assignment', async (_event: any, id: number) => {
  return dbManager.execute('DELETE FROM shift_assignments WHERE id = ?', [id])
})

ipcMain.handle('batch:assignments', async (_event: any, assignments: Array<{personnelId: number, shiftId: number, date: string, remark: string}>) => {
  const deleteStmt = dbManager.db.prepare('DELETE FROM shift_assignments WHERE personnel_id = ? AND assignment_date = ?')
  const insertStmt = dbManager.db.prepare('INSERT INTO shift_assignments (personnel_id, shift_id, assignment_date, remark) VALUES (?, ?, ?, ?)')

  const transaction = dbManager.db.transaction((data: any[]) => {
    for (const item of data) {
      deleteStmt.run(item.personnelId, item.date)
      if (item.shiftId) {
        insertStmt.run(item.personnelId, item.shiftId, item.date, item.remark || '')
      }
    }
  })

  transaction(assignments)
  return { success: true, count: assignments.length }
})

// IPC Handlers for History Projects (新增 - 项目管理)
ipcMain.handle('get:historyProjects', async (_event: any) => {
  return dbManager.query('SELECT * FROM history_projects WHERE is_active = 1 ORDER BY update_time DESC', [])
})

ipcMain.handle('add:historyProject', async (_event: any, data: { name: string, description: string }) => {
  return dbManager.execute(
    'INSERT INTO history_projects (project_name, description) VALUES (?, ?)',
    [data.name, data.description]
  )
})

ipcMain.handle('update:historyProject', async (_event: any, data: { id: number, name: string, description: string }) => {
  return dbManager.execute(
    'UPDATE history_projects SET project_name = ?, description = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
    [data.name, data.description, data.id]
  )
})

ipcMain.handle('delete:historyProject', async (_event: any, id: number) => {
  // 软删除
  return dbManager.execute('UPDATE history_projects SET is_active = 0 WHERE id = ?', [id])
})

// IPC Handlers for History Business Data (更新 - 支持 project_id)
ipcMain.handle('get:historyData', async (_event: any, projectId?: number, limit: number = 50) => {
  if (projectId) {
    return dbManager.query(
      'SELECT * FROM history_biz_data WHERE project_id = ? ORDER BY data_date DESC LIMIT ?',
      [projectId, limit]
    )
  }
  return dbManager.query('SELECT * FROM history_biz_data ORDER BY data_date DESC LIMIT ?', [limit])
})

ipcMain.handle('add:historyData', async (_event: any, data: { projectId: number, date: string, sales: number, staff: number, consults: number, conversionRate: number, remark: string }) => {
  return dbManager.execute(
    'INSERT INTO history_biz_data (project_id, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.projectId, data.date, data.sales, data.staff, data.consults, data.conversionRate, data.remark]
  )
})

ipcMain.handle('delete:historyData', async (_event: any, ids: number[]) => {
  const placeholders = ids.map(() => '?').join(',')
  return dbManager.execute(`DELETE FROM history_biz_data WHERE id IN (${placeholders})`, ids)
})

ipcMain.handle('batch:historyData', async (_event: any, projectId: number, records: Array<{date: string, sales: number, staff: number, consults: number, conversionRate: number, remark: string}>) => {
  const stmt = dbManager.db.prepare('INSERT INTO history_biz_data (project_id, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark) VALUES (?, ?, ?, ?, ?, ?, ?)')

  const transaction = dbManager.db.transaction((data: any[]) => {
    for (const record of data) {
      stmt.run(projectId, record.date, record.sales, record.staff, record.consults, record.conversionRate, record.remark)
    }
  })

  transaction(records)
  return { success: true, count: records.length }
})

// 接入 TypeScript 版的 ManpowerCalculator
ipcMain.handle('calc:manpower', async (_event: any, data: any) => {
  try {
    const { targetSales, days, eventType, eventDates, peakDates, calcStartDate, params, promotionFactor, historyProjectId, targetVisitors, minStaff } = data

    // 转换日期字符串为 dayjs 对象
    const parsedEventDates = (eventDates || []).map((d: string) => dayjs(d))
    const parsedPeakDates = (peakDates || []).map((d: string) => dayjs(d))
    const parsedCalcStartDate = calcStartDate ? dayjs(calcStartDate) : null

    let historyData = undefined;
    if (historyProjectId) {
      // 按照日期正序获取历史数据，提取其顺序趋势
      historyData = await dbManager.query(
        'SELECT * FROM history_biz_data WHERE project_id = ? ORDER BY data_date ASC',
        [historyProjectId]
      );
    }

    return ManpowerCalculator.calculateWithShifts(
      targetSales || 0,
      days || 7,
      eventType || null,
      parsedEventDates,
      parsedCalcStartDate,
      params || {},
      promotionFactor,    // 活动精确系数
      targetVisitors,     // 访客数驱动模式下的目标日均访客数
      minStaff || 1,      // 班次最低保底人数
      historyData,        // 历史数据
      parsedPeakDates     // 高峰日期
    )
  } catch (error) {
    console.error('calc:manpower error:', error)
    throw error
  }
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details: any) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_event: any, window: any) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
