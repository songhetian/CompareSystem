import { join } from "path";
import { app as app$2, session, ipcMain as ipcMain$1, BrowserWindow as BrowserWindow$1 } from "electron";
import dayjs from "dayjs";
import Database from "better-sqlite3";
import { ensureDirSync } from "fs-extra";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const is = {
  dev: !app$2.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      app$2.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return app$2.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      app$2.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    ipcMain$1.on("win:invoke", (event, action) => {
      const win = BrowserWindow$1.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
class ManpowerCalculator {
  /**
   * 获取每日权重分布（高斯分布模型）
   * @param days 总天数
   * @param eventDate 活动日期
   * @param calcStartDate 计算开始日期
   * @param phaseOffset 阶段偏移（天）
   * @param spread 分布宽度
   * @param isUniform 是否均匀分布（日常模式）
   */
  static getDailyWeights(days, eventDate, calcStartDate, phaseOffset, spread = 3, isUniform = false) {
    if (isUniform) return new Array(days).fill(1 / days);
    const weights = [];
    const peakDay = eventDate.add(phaseOffset, "day");
    for (let i = 0; i < days; i++) {
      const currentDay = calcStartDate.add(i, "day");
      const delta = currentDay.diff(peakDay, "day");
      const weight = Math.exp(-Math.pow(delta, 2) / (2 * Math.pow(spread, 2)));
      weights.push(weight);
    }
    const totalW = weights.reduce((a, b) => a + b, 0);
    return totalW === 0 ? new Array(days).fill(1 / days) : weights.map((w) => w / totalW);
  }
  /**
   * 核心计算方法：全过程人力仿真算法
   * 采用双径流量推演与柔性人力模型
   */
  /**
   * 从历史数据中提取顺序趋势权重（忽略真实日期，按记录顺序排列）
   */
  static getHistoryTrendWeights(historyData, days) {
    if (!historyData || historyData.length === 0) return null;
    const values = historyData.map((d) => Math.max(Number(d.sales_volume) || 0, 0));
    const totalValue = values.reduce((a, b) => a + b, 0);
    if (totalValue === 0) return null;
    const normalized = values.map((v) => v / totalValue);
    if (normalized.length >= days) {
      const sliced = normalized.slice(0, days);
      const slicedTotal = sliced.reduce((a, b) => a + b, 0);
      return slicedTotal === 0 ? null : sliced.map((w) => w / slicedTotal);
    } else {
      const histLen = normalized.length;
      const remaining = days - histLen;
      const histTotal = normalized.reduce((a, b) => a + b, 0);
      const histShare = 0.7;
      const evenShare = 0.3 / remaining;
      const weights = [
        ...normalized.map((w) => w / histTotal * histShare),
        ...new Array(remaining).fill(evenShare)
      ];
      return weights;
    }
  }
  static calculateWithShifts(targetSales, days = 30, eventType = null, eventDates = [dayjs()], calcStartDate = null, params, promotionFactor, targetVisitors, minStaff = 1, historyData, peakDates) {
    const isDaily = (eventType === null || eventType.includes("日常")) && eventDates.length === 0;
    const startDate = calcStartDate || dayjs(Math.min(...eventDates.map((d) => d.valueOf()))).subtract(5, "day");
    const p = (k, d) => params[k] ?? d;
    const avgOv = p("avg_order_value", 160);
    const peakFactor = p("peak_factor", 1.2);
    const safetyBuffer = p("safety_buffer", 1.15);
    p("peak_day_factor", 1.5);
    const baseDailyVisitors = targetVisitors ?? p("daily_visitors", 1e3);
    const vToPRate = p("visitor_to_presale", 0.25);
    const offsets = {
      presale: -p("presale_time_offset", 2),
      // 正数 → 活动日前几天
      midsale: p("midsale_time_offset", 0),
      // 正数 → 活动日后几天
      aftersale: p("aftersale_time_offset", 3)
      // 正数 → 活动日后几天
    };
    const conversion = {
      c_to_o: p("consult_to_order", 0.6),
      o_to_p: p("order_to_payment", 0.9),
      m_ratio: p("midsale_ratio", 0.35),
      p_to_a: p("payment_to_aftersale", 0.15)
    };
    const cap = {
      presale: 60 / p("presale_handle_time", 4.5) * p("presale_saturation", 0.78),
      midsale: 60 / p("midsale_handle_time", 3) * p("midsale_saturation", 0.82),
      aftersale: 60 / p("aftersale_handle_time", 6.5) * p("aftersale_saturation", 0.72)
    };
    let eventF = 1;
    if (promotionFactor !== void 0 && promotionFactor > 0) {
      eventF = promotionFactor;
    } else if (eventType) {
      if (eventType.includes("S级大促") || eventType.includes("S级")) {
        eventF = p("event_s", 2.8);
      } else if (eventType.includes("A级") || eventType.includes("会员日")) {
        eventF = p("event_a", 1.9);
      }
    }
    const ordersFromSales = targetSales / avgOv * eventF;
    const presaleFromSales = ordersFromSales / (conversion.c_to_o * conversion.o_to_p);
    const visitorPresaleBaseline = baseDailyVisitors * days * vToPRate;
    const totalPresale = Math.max(presaleFromSales, visitorPresaleBaseline);
    const totalMidsale = totalPresale * conversion.m_ratio;
    const totalAftersale = totalPresale * conversion.c_to_o * conversion.o_to_p * conversion.p_to_a;
    let wPre;
    let wMid;
    let wAft;
    const histWeights = this.getHistoryTrendWeights(historyData || [], days);
    if (histWeights) {
      wPre = histWeights;
      wMid = histWeights;
      wAft = histWeights;
    } else {
      const numPeaks = eventDates.length;
      wPre = new Array(days).fill(0);
      wMid = new Array(days).fill(0);
      wAft = new Array(days).fill(0);
      for (const ed of eventDates) {
        const wp = this.getDailyWeights(days, ed, startDate, offsets.presale, 3, isDaily);
        const wm = this.getDailyWeights(days, ed, startDate, offsets.midsale, 3, isDaily);
        const wa = this.getDailyWeights(days, ed, startDate, offsets.aftersale, 3, isDaily);
        for (let i = 0; i < days; i++) {
          wPre[i] += wp[i] / numPeaks;
          wMid[i] += wm[i] / numPeaks;
          wAft[i] += wa[i] / numPeaks;
        }
      }
    }
    const dailyResults = [];
    for (let i = 0; i < days; i++) {
      const vP = totalPresale * wPre[i];
      const vM = totalMidsale * wMid[i];
      const vA = totalAftersale * wAft[i];
      const getRawDemand = (vol, phase) => {
        let hV = vol / 24 * peakFactor * safetyBuffer;
        if (phase === "presale") hV *= 1.5;
        return cap[phase] > 0 ? hV / cap[phase] : 0;
      };
      const rawP = getRawDemand(vP, "presale");
      const rawM = getRawDemand(vM, "midsale");
      const rawA = getRawDemand(vA, "aftersale");
      const currentDateStr = startDate.add(i, "day").format("YYYY-MM-DD");
      const isPeakDay = eventDates.some((ed) => ed.format("YYYY-MM-DD") === currentDateStr);
      dailyResults.push({
        date: startDate.add(i, "day").format("MM-DD"),
        fullDate: currentDateStr,
        isPeakDay,
        staff: Math.ceil(rawP + rawM + rawA),
        presale: Math.ceil(rawP),
        midsale: Math.ceil(rawM),
        aftersale: Math.ceil(rawA),
        vol_pre: vP,
        vol_mid: vM,
        vol_after: vA
      });
    }
    const theoreticalPeak = Math.max(...dailyResults.map((r) => r.staff));
    const neededStaff = Math.max(theoreticalPeak, minStaff);
    const peakDay = dailyResults.reduce((prev, curr) => curr.staff > prev.staff ? curr : prev);
    const hourlyPresale = [];
    const hourlyMidsale = [];
    const hourlyAftersale = [];
    const hourlyTotal = [];
    const presaleBurstStart = p("presale_burst_start", 10);
    const presaleBurstEnd = p("presale_burst_end", 12);
    const presaleBurstFactor = p("presale_burst_factor", 1.9);
    const midsaleBurstStart = p("midsale_burst_start", 15);
    const midsaleBurstEnd = p("midsale_burst_end", 17);
    const midsaleBurstFactor = p("midsale_burst_factor", 2.3);
    const aftersaleBurstStart = p("aftersale_burst_start", 20);
    const aftersaleBurstEnd = p("aftersale_burst_end", 22);
    const aftersaleBurstFactor = p("aftersale_burst_factor", 2.6);
    for (let hour = 0; hour < 24; hour++) {
      const basePresale = peakDay.presale / 24;
      const baseMidsale = peakDay.midsale / 24;
      const baseAftersale = peakDay.aftersale / 24;
      const presaleHour = hour >= presaleBurstStart && hour < presaleBurstEnd ? basePresale * presaleBurstFactor : basePresale;
      const midsaleHour = hour >= midsaleBurstStart && hour < midsaleBurstEnd ? baseMidsale * midsaleBurstFactor : baseMidsale;
      const aftersaleHour = hour >= aftersaleBurstStart && hour < aftersaleBurstEnd ? baseAftersale * aftersaleBurstFactor : baseAftersale;
      let nightBoost = 1;
      if (hour < 2 || hour >= 20) nightBoost = 1.3;
      hourlyPresale.push(presaleHour * nightBoost);
      hourlyMidsale.push(midsaleHour);
      hourlyAftersale.push(aftersaleHour);
      hourlyTotal.push(presaleHour * nightBoost + midsaleHour + aftersaleHour);
    }
    const calcStaff = (ovDelta, crDelta) => {
      const newOv = avgOv * (1 + ovDelta);
      const newCr = conversion.c_to_o * (1 + crDelta);
      const newOrders = targetSales / newOv * eventF;
      const newPresale = newOrders / (newCr * conversion.o_to_p);
      const newTotal = Math.max(newPresale, visitorPresaleBaseline);
      const newMid = newTotal * conversion.m_ratio;
      const newAft = newTotal * newCr * conversion.o_to_p * conversion.p_to_a;
      const peakW = wPre[dailyResults.findIndex((r) => r.staff === theoreticalPeak)] || 1 / days;
      const rP = newTotal * peakW / 24 * peakFactor * safetyBuffer * 1.5 / cap.presale;
      const rM = newMid * peakW / 24 * peakFactor * safetyBuffer / cap.midsale;
      const rA = newAft * peakW / 24 * peakFactor * safetyBuffer / cap.aftersale;
      return Math.ceil(rP + rM + rA);
    };
    const sensitivityOv = calcStaff(-0.1, 0) - neededStaff;
    const sensitivityCr = calcStaff(0, 0.1) - neededStaff;
    return {
      // 核心指标
      needed_staff: neededStaff,
      theoretical_peak: theoreticalPeak,
      presale_staff: peakDay.presale,
      midsale_staff: peakDay.midsale,
      aftersale_staff: peakDay.aftersale,
      // 话务量统计
      total_consult: totalPresale + totalMidsale + totalAftersale,
      daily_consult: (totalPresale + totalMidsale + totalAftersale) / days,
      // 工作时长
      daily_hours: (peakDay.vol_pre * p("presale_handle_time", 4.5) + peakDay.vol_mid * p("midsale_handle_time", 3) + peakDay.vol_after * p("aftersale_handle_time", 6.5)) / 60 * peakFactor * safetyBuffer,
      // 每日明细
      daily_results: dailyResults,
      days,
      // 流量来源分析
      presale_from_sales: presaleFromSales,
      visitor_presale_baseline: visitorPresaleBaseline,
      // 24小时分布
      hourly_presale: hourlyPresale,
      hourly_midsale: hourlyMidsale,
      hourly_aftersale: hourlyAftersale,
      hourly_total: hourlyTotal,
      // 真实敏感度分析
      sensitivity: {
        avg_order_value: sensitivityOv,
        // 客单价降低10%时，人力变化量（负=减少）
        conversion_rate: sensitivityCr
        // 转化率提升10%时，人力变化量（正=增加）
      }
    };
  }
}
const { app: app$1 } = require2("electron");
class DBManager {
  _db;
  // 暴露 db 实例用于事务操作
  get db() {
    return this._db;
  }
  constructor() {
    const userDataPath = app$1.getPath("userData");
    const dbPath = join(userDataPath, "service_budget_v2.db");
    ensureDirSync(userDataPath);
    this._db = new Database(dbPath);
    this._initDB();
  }
  _initDB() {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS sys_params (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        param_name TEXT NOT NULL,
        param_key TEXT UNIQUE NOT NULL,
        param_value REAL NOT NULL,
        description TEXT,
        category TEXT,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_name TEXT NOT NULL,
        shift_type TEXT,
        start_time TEXT,
        end_time TEXT,
        work_hours REAL,
        rest_hours REAL,
        status INTEGER DEFAULT 1,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS parameter_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_name TEXT NOT NULL,
        params_json TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        description TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS promotion_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_name TEXT NOT NULL,
        factor REAL NOT NULL DEFAULT 1.0,
        description TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS historical_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_name TEXT NOT NULL,
        params_json TEXT NOT NULL,
        result_json TEXT,
        description TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS history_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS history_biz_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        data_date TEXT NOT NULL,
        sales_volume REAL NOT NULL DEFAULT 0.0,
        actual_staff INTEGER NOT NULL DEFAULT 0,
        actual_consult REAL NOT NULL DEFAULT 0.0,
        conversion_rate REAL DEFAULT 0.0,
        remark TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES history_projects(id) ON DELETE CASCADE
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dept_name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER,
        status INTEGER DEFAULT 1,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS personnel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        staff_id TEXT UNIQUE,
        dept_id INTEGER,
        position TEXT,
        phone TEXT,
        status INTEGER DEFAULT 1,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS shift_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        personnel_id INTEGER NOT NULL,
        shift_id INTEGER NOT NULL,
        assignment_date TEXT NOT NULL,
        remark TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
      )
    `);
    this._db.exec(`
      CREATE INDEX IF NOT EXISTS idx_project_id ON history_biz_data(project_id);
      CREATE INDEX IF NOT EXISTS idx_data_date ON history_biz_data(data_date);
      CREATE INDEX IF NOT EXISTS idx_project_active ON history_projects(is_active);
      CREATE INDEX IF NOT EXISTS idx_dept_parent ON departments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_personnel_dept ON personnel(dept_id);
      CREATE INDEX IF NOT EXISTS idx_assignment_date ON shift_assignments(assignment_date);
      CREATE INDEX IF NOT EXISTS idx_assignment_personnel ON shift_assignments(personnel_id);
    `);
    try {
      const tableInfo = this._db.prepare("PRAGMA table_info(history_biz_data)").all();
      const hasProjectId = tableInfo.some((col) => col.name === "project_id");
      if (!hasProjectId) {
        console.log("🔄 检测到旧数据结构，开始迁移...");
        const defaultProject = this._db.prepare(
          "INSERT INTO history_projects (project_name, description) VALUES (?, ?)"
        ).run("默认项目", "从旧版本迁移的历史数据");
        const defaultProjectId = defaultProject.lastInsertRowid;
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS history_biz_data_backup AS SELECT * FROM history_biz_data;
        `);
        this._db.exec(`DROP TABLE IF EXISTS history_biz_data;`);
        this._db.exec(`
          CREATE TABLE history_biz_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            data_date TEXT NOT NULL,
            sales_volume REAL NOT NULL DEFAULT 0.0,
            actual_staff INTEGER NOT NULL DEFAULT 0,
            actual_consult REAL NOT NULL DEFAULT 0.0,
            conversion_rate REAL DEFAULT 0.0,
            remark TEXT,
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES history_projects(id) ON DELETE CASCADE
          )
        `);
        this._db.exec(`
          INSERT INTO history_biz_data (project_id, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark, create_time)
          SELECT ${defaultProjectId}, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark, create_time
          FROM history_biz_data_backup
        `);
        this._db.exec(`DROP TABLE IF NOT EXISTS history_biz_data_backup;`);
        console.log("✅ 数据迁移完成");
      }
    } catch (e) {
      console.log("⚠️  数据迁移跳过或失败:", e);
    }
    const count = this._db.prepare("SELECT COUNT(*) as count FROM sys_params").get();
    if (count.count === 0) {
      this._seedData();
    }
    const promoCount = this._db.prepare("SELECT COUNT(*) as count FROM promotion_schemes").get();
    if (promoCount.count === 0) {
      this._seedPromotions();
    }
  }
  _seedData() {
    const insert = this._db.prepare("INSERT INTO sys_params (param_name, param_key, param_value, category) VALUES (?, ?, ?, ?)");
    insert.run("平均客单价", "avg_order_value", 160, "基础业务");
    insert.run("日均访客数", "daily_visitors", 3800, "基础业务");
    insert.run("咨询转下单率", "consult_to_order", 0.6, "漏斗转化");
  }
  _seedPromotions() {
    const insert = this._db.prepare("INSERT INTO promotion_schemes (scheme_name, factor, description) VALUES (?, ?, ?)");
    insert.run("S级大促(双11/618)", 2.8, "顶级大促，流量爆发最高");
    insert.run("A级活动(会员日)", 1.9, "常规平台级活动");
    insert.run("B级活动(品类日)", 1.5, "品类促销活动");
    insert.run("日常运营", 1, "无活动的日常流量");
  }
  query(sql, params = []) {
    return this._db.prepare(sql).all(...params);
  }
  execute(sql, params = []) {
    return this._db.prepare(sql).run(...params);
  }
}
const { app, shell, BrowserWindow, ipcMain } = require2("electron");
const dbManager = new DBManager();
ipcMain.handle("get:history", async (_event) => {
  return dbManager.query("SELECT * FROM historical_schemes ORDER BY create_time DESC", []);
});
ipcMain.handle("delete:history", async (_event, id) => {
  return dbManager.execute("DELETE FROM historical_schemes WHERE id = ?", [id]);
});
ipcMain.handle("get:schemes", async (_event) => {
  return dbManager.query("SELECT * FROM parameter_schemes ORDER BY is_default DESC, update_time DESC", []);
});
ipcMain.handle("add:scheme", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO parameter_schemes (scheme_name, params_json, description) VALUES (?, ?, ?)",
    [data.name, JSON.stringify(data.params), data.desc]
  );
});
ipcMain.handle("update:scheme", async (_event, data) => {
  return dbManager.execute(
    "UPDATE parameter_schemes SET scheme_name = ?, params_json = ?, description = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?",
    [data.name, JSON.stringify(data.params), data.desc, data.id]
  );
});
ipcMain.handle("delete:scheme", async (_event, id) => {
  return dbManager.execute("DELETE FROM parameter_schemes WHERE id = ?", [id]);
});
ipcMain.handle("set-default:scheme", async (_event, id) => {
  dbManager.execute("UPDATE parameter_schemes SET is_default = 0", []);
  return dbManager.execute("UPDATE parameter_schemes SET is_default = 1 WHERE id = ?", [id]);
});
ipcMain.handle("get:promotions", async (_event) => {
  return dbManager.query("SELECT * FROM promotion_schemes", []);
});
ipcMain.handle("add:promotion", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO promotion_schemes (scheme_name, factor, description) VALUES (?, ?, ?)",
    [data.name, data.factor, data.desc]
  );
});
ipcMain.handle("delete:promotion", async (_event, id) => {
  return dbManager.execute("DELETE FROM promotion_schemes WHERE id = ?", [id]);
});
ipcMain.handle("update:promotion", async (_event, data) => {
  return dbManager.execute(
    "UPDATE promotion_schemes SET scheme_name = ?, factor = ?, description = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?",
    [data.name, data.factor, data.desc, data.id]
  );
});
ipcMain.handle("get:shifts", async (_event) => {
  return dbManager.query("SELECT * FROM shifts WHERE status = 1", []);
});
ipcMain.handle("add:shift", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO shifts (shift_name, shift_type, start_time, end_time, work_hours, rest_hours) VALUES (?, ?, ?, ?, ?, ?)",
    [data.name, data.type, data.start, data.end, data.hours, data.rest]
  );
});
ipcMain.handle("delete:shift", async (_event, id) => {
  return dbManager.execute("DELETE FROM shifts WHERE id = ?", [id]);
});
ipcMain.handle("update:shift", async (_event, data) => {
  return dbManager.execute(
    "UPDATE shifts SET shift_name = ?, shift_type = ?, start_time = ?, end_time = ?, work_hours = ?, rest_hours = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?",
    [data.name, data.type, data.start, data.end, data.hours, data.rest, data.id]
  );
});
ipcMain.handle("get:departments", async (_event) => {
  return dbManager.query("SELECT * FROM departments WHERE status = 1", []);
});
ipcMain.handle("add:department", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO departments (dept_name, description, parent_id) VALUES (?, ?, ?)",
    [data.name, data.description, data.parentId || null]
  );
});
ipcMain.handle("update:department", async (_event, data) => {
  return dbManager.execute(
    "UPDATE departments SET dept_name = ?, description = ?, parent_id = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?",
    [data.name, data.description, data.parentId || null, data.id]
  );
});
ipcMain.handle("delete:department", async (_event, id) => {
  return dbManager.execute("UPDATE departments SET status = 0 WHERE id = ?", [id]);
});
ipcMain.handle("get:personnel", async (_event, deptId) => {
  if (deptId) {
    return dbManager.query(
      "SELECT p.*, d.dept_name FROM personnel p LEFT JOIN departments d ON p.dept_id = d.id WHERE p.status = 1 AND p.dept_id = ?",
      [deptId]
    );
  }
  return dbManager.query(
    "SELECT p.*, d.dept_name FROM personnel p LEFT JOIN departments d ON p.dept_id = d.id WHERE p.status = 1",
    []
  );
});
ipcMain.handle("add:personnel", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO personnel (name, staff_id, dept_id, position, phone) VALUES (?, ?, ?, ?, ?)",
    [data.name, data.staffId, data.deptId, data.position, data.phone]
  );
});
ipcMain.handle("update:personnel", async (_event, data) => {
  return dbManager.execute(
    "UPDATE personnel SET name = ?, staff_id = ?, dept_id = ?, position = ?, phone = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?",
    [data.name, data.staffId, data.deptId, data.position, data.phone, data.id]
  );
});
ipcMain.handle("delete:personnel", async (_event, id) => {
  return dbManager.execute("UPDATE personnel SET status = 0 WHERE id = ?", [id]);
});
ipcMain.handle("get:assignments", async (_event, startDate, endDate) => {
  return dbManager.query(
    `SELECT a.*, p.name as personnel_name, s.shift_name, s.start_time, s.end_time
     FROM shift_assignments a
     JOIN personnel p ON a.personnel_id = p.id
     JOIN shifts s ON a.shift_id = s.id
     WHERE a.assignment_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );
});
ipcMain.handle("add:assignment", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO shift_assignments (personnel_id, shift_id, assignment_date, remark) VALUES (?, ?, ?, ?)",
    [data.personnelId, data.shiftId, data.date, data.remark]
  );
});
ipcMain.handle("delete:assignment", async (_event, id) => {
  return dbManager.execute("DELETE FROM shift_assignments WHERE id = ?", [id]);
});
ipcMain.handle("batch:assignments", async (_event, assignments) => {
  const deleteStmt = dbManager.db.prepare("DELETE FROM shift_assignments WHERE personnel_id = ? AND assignment_date = ?");
  const insertStmt = dbManager.db.prepare("INSERT INTO shift_assignments (personnel_id, shift_id, assignment_date, remark) VALUES (?, ?, ?, ?)");
  const transaction = dbManager.db.transaction((data) => {
    for (const item of data) {
      deleteStmt.run(item.personnelId, item.date);
      if (item.shiftId) {
        insertStmt.run(item.personnelId, item.shiftId, item.date, item.remark || "");
      }
    }
  });
  transaction(assignments);
  return { success: true, count: assignments.length };
});
ipcMain.handle("get:historyProjects", async (_event) => {
  return dbManager.query("SELECT * FROM history_projects WHERE is_active = 1 ORDER BY update_time DESC", []);
});
ipcMain.handle("add:historyProject", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO history_projects (project_name, description) VALUES (?, ?)",
    [data.name, data.description]
  );
});
ipcMain.handle("update:historyProject", async (_event, data) => {
  return dbManager.execute(
    "UPDATE history_projects SET project_name = ?, description = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?",
    [data.name, data.description, data.id]
  );
});
ipcMain.handle("delete:historyProject", async (_event, id) => {
  return dbManager.execute("UPDATE history_projects SET is_active = 0 WHERE id = ?", [id]);
});
ipcMain.handle("get:historyData", async (_event, projectId, limit = 50) => {
  if (projectId) {
    return dbManager.query(
      "SELECT * FROM history_biz_data WHERE project_id = ? ORDER BY data_date DESC LIMIT ?",
      [projectId, limit]
    );
  }
  return dbManager.query("SELECT * FROM history_biz_data ORDER BY data_date DESC LIMIT ?", [limit]);
});
ipcMain.handle("add:historyData", async (_event, data) => {
  return dbManager.execute(
    "INSERT INTO history_biz_data (project_id, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [data.projectId, data.date, data.sales, data.staff, data.consults, data.conversionRate, data.remark]
  );
});
ipcMain.handle("delete:historyData", async (_event, ids) => {
  const placeholders = ids.map(() => "?").join(",");
  return dbManager.execute(`DELETE FROM history_biz_data WHERE id IN (${placeholders})`, ids);
});
ipcMain.handle("batch:historyData", async (_event, projectId, records) => {
  const stmt = dbManager.db.prepare("INSERT INTO history_biz_data (project_id, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const transaction = dbManager.db.transaction((data) => {
    for (const record of data) {
      stmt.run(projectId, record.date, record.sales, record.staff, record.consults, record.conversionRate, record.remark);
    }
  });
  transaction(records);
  return { success: true, count: records.length };
});
ipcMain.handle("calc:manpower", async (_event, data) => {
  try {
    const { targetSales, days, eventType, eventDates, peakDates, calcStartDate, params, promotionFactor, historyProjectId, targetVisitors, minStaff } = data;
    const parsedEventDates = (eventDates || []).map((d) => dayjs(d));
    const parsedPeakDates = (peakDates || []).map((d) => dayjs(d));
    const parsedCalcStartDate = calcStartDate ? dayjs(calcStartDate) : null;
    let historyData = void 0;
    if (historyProjectId) {
      historyData = await dbManager.query(
        "SELECT * FROM history_biz_data WHERE project_id = ? ORDER BY data_date ASC",
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
      promotionFactor,
      // 活动精确系数
      targetVisitors,
      // 访客数驱动模式下的目标日均访客数
      minStaff || 1,
      // 班次最低保底人数
      historyData,
      // 历史数据
      parsedPeakDates
      // 高峰日期
    );
  } catch (error) {
    console.error("calc:manpower error:", error);
    throw error;
  }
});
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");
  app.on("browser-window-created", (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  ipcMain.on("ping", () => console.log("pong"));
  createWindow();
  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
