const { app } = require('electron');
import Database from 'better-sqlite3';
import { join } from 'path';
import { ensureDirSync } from 'fs-extra';

export class DBManager {
  private _db: Database.Database;

  // 暴露 db 实例用于事务操作
  public get db(): Database.Database {
    return this._db;
  }

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = join(userDataPath, 'service_budget_v2.db');

    // 确保目录存在
    ensureDirSync(userDataPath);

    this._db = new Database(dbPath);
    this._initDB();
  }

  private _initDB() {
    // 1. 系统参数表
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

    // 2. 班次表
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

    // 3. 参数方案表 (核心迁移功能)
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

    // 4. 大促方案表
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

    // 5. 历史记录表
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

    // 6. 历史项目表 (多项目/多店铺支持)
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

    // 7. 历史业务数据表 (关联项目)
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

    // 创建索引
    this._db.exec(`
      CREATE INDEX IF NOT EXISTS idx_project_id ON history_biz_data(project_id);
      CREATE INDEX IF NOT EXISTS idx_data_date ON history_biz_data(data_date);
      CREATE INDEX IF NOT EXISTS idx_project_active ON history_projects(is_active);
    `);

    // 数据迁移：如果旧表存在且新表project_id列不存在，进行迁移
    try {
      // 检查是否需要迁移
      const tableInfo = this._db.prepare("PRAGMA table_info(history_biz_data)").all() as any[];
      const hasProjectId = tableInfo.some((col: any) => col.name === 'project_id');

      if (!hasProjectId) {
        console.log('🔄 检测到旧数据结构，开始迁移...');

        // 创建默认项目
        const defaultProject = this._db.prepare(
          'INSERT INTO history_projects (project_name, description) VALUES (?, ?)'
        ).run('默认项目', '从旧版本迁移的历史数据');

        const defaultProjectId = defaultProject.lastInsertRowid;

        // 备份旧数据
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS history_biz_data_backup AS SELECT * FROM history_biz_data;
        `);

        // 删除旧表
        this._db.exec(`DROP TABLE IF EXISTS history_biz_data;`);

        // 重建新表
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

        // 迁移数据
        this._db.exec(`
          INSERT INTO history_biz_data (project_id, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark, create_time)
          SELECT ${defaultProjectId}, data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark, create_time
          FROM history_biz_data_backup
        `);

        // 删除备份表
        this._db.exec(`DROP TABLE IF NOT EXISTS history_biz_data_backup;`);

        console.log('✅ 数据迁移完成');
      }
    } catch (e) {
      console.log('⚠️  数据迁移跳过或失败:', e);
    }

    // 插入默认数据（如果为空）
    const count = this._db.prepare('SELECT COUNT(*) as count FROM sys_params').get() as { count: number };
    if (count.count === 0) {
      this._seedData();
    }

    // 插入默认大促方案
    const promoCount = this._db.prepare('SELECT COUNT(*) as count FROM promotion_schemes').get() as { count: number };
    if (promoCount.count === 0) {
      this._seedPromotions();
    }
  }

  private _seedData() {
    // 预置一些基础参数
    const insert = this._db.prepare('INSERT INTO sys_params (param_name, param_key, param_value, category) VALUES (?, ?, ?, ?)');
    insert.run('平均客单价', 'avg_order_value', 160.0, '基础业务');
    insert.run('日均访客数', 'daily_visitors', 3800.0, '基础业务');
    insert.run('咨询转下单率', 'consult_to_order', 0.6, '漏斗转化');
    // ... 更多初始化数据
  }

  private _seedPromotions() {
    const insert = this._db.prepare('INSERT INTO promotion_schemes (scheme_name, factor, description) VALUES (?, ?, ?)');
    insert.run('S级大促(双11/618)', 2.8, '顶级大促，流量爆发最高');
    insert.run('A级活动(会员日)', 1.9, '常规平台级活动');
    insert.run('B级活动(品类日)', 1.5, '品类促销活动');
    insert.run('日常运营', 1.0, '无活动的日常流量');
  }

  public query(sql: string, params: any[] = []) {
    return this._db.prepare(sql).all(...params);
  }

  public execute(sql: string, params: any[] = []) {
    return this._db.prepare(sql).run(...params);
  }
}
