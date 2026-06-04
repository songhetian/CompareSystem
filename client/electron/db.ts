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
        start_date TEXT,
        end_date TEXT,
        description TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 检查 historical_schemes 是否缺少 start_date 和 end_date
    const tableInfoHistorical = this._db.prepare("PRAGMA table_info(historical_schemes)").all() as any[];
    const hasStartDate = tableInfoHistorical.some((col: any) => col.name === 'start_date');
    if (!hasStartDate) {
      this._db.exec('ALTER TABLE historical_schemes ADD COLUMN start_date TEXT');
      this._db.exec('ALTER TABLE historical_schemes ADD COLUMN end_date TEXT');
    }

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

    // 8. 部门表
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

    // 9. 人员表
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

    // 10. 排班记录表 (关联人员和班次)
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

    // 创建索引
    this._db.exec(`
      CREATE INDEX IF NOT EXISTS idx_project_id ON history_biz_data(project_id);
      CREATE INDEX IF NOT EXISTS idx_data_date ON history_biz_data(data_date);
      CREATE INDEX IF NOT EXISTS idx_project_active ON history_projects(is_active);
      CREATE INDEX IF NOT EXISTS idx_dept_parent ON departments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_personnel_dept ON personnel(dept_id);
      CREATE INDEX IF NOT EXISTS idx_assignment_date ON shift_assignments(assignment_date);
      CREATE INDEX IF NOT EXISTS idx_assignment_personnel ON shift_assignments(personnel_id);
    `);

    // 数据迁移：如果旧表存在且新表project_id列不存在，进行迁移
    try {
      // 检查是否需要迁移
      const tableInfo = this._db.prepare("PRAGMA table_info(history_biz_data)").all() as any[];
      const hasProjectId = tableInfo.some((col: any) => col.name === 'project_id');

      if (!hasProjectId) {

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
        this._db.exec(`DROP TABLE IF EXISTS history_biz_data_backup;`);
      }
    } catch (e) {
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

    // 插入默认参数方案（检查并修复）
    const schemeCount = this._db.prepare('SELECT COUNT(*) as count FROM parameter_schemes').get() as { count: number };
    if (schemeCount.count === 0) {
      // 完全没有方案，创建新的
      this._seedParameterSchemes();
    } else {
      // 已有方案，检查是否有空参数的方案并修复
      const schemes = this._db.prepare('SELECT id, params_json FROM parameter_schemes').all() as any[];
      for (const scheme of schemes) {
        try {
          const params = JSON.parse(scheme.params_json);
          // 检查是否为空对象或没有关键参数
          const hasParams = params && Object.keys(params).length > 1; // >1 是因为可能只有 _config
          if (!hasParams) {
            // 更新为默认参数
            this._db.prepare('UPDATE parameter_schemes SET params_json = ? WHERE id = ?')
              .run(JSON.stringify(this._getDefaultParams()), scheme.id);
          }
        } catch (e) {
          this._db.prepare('UPDATE parameter_schemes SET params_json = ? WHERE id = ?')
            .run(JSON.stringify(this._getDefaultParams()), scheme.id);
        }
      }
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

  private _getDefaultParams() {
    // 默认参数配置（完整的参数结构）
    return {
      // 基础业务参数
      avg_order_value: 160,
      daily_visitors: 3800,
      peak_factor: 1.2,
      safety_buffer: 1.15,
      
      // 转化漏斗
      visitor_to_presale: 0.25,
      consult_to_order: 0.6,
      order_to_payment: 0.9,
      payment_to_aftersale: 0.15,
      midsale_ratio: 0.35,
      
      // 岗位效能
      presale_handle_time: 4.5,
      presale_saturation: 0.78,
      midsale_handle_time: 3.0,
      midsale_saturation: 0.82,
      aftersale_handle_time: 6.5,
      aftersale_saturation: 0.72,
      
      // 并发处理能力
      max_concurrent_sessions: 3,
      concurrent_efficiency_loss: 0.15,
      
      // 员工能力分布
      novice_ratio: 0.2,
      novice_efficiency: 0.6,
      expert_ratio: 0.15,
      expert_efficiency: 1.4,
      
      // 工作状态
      actual_availability_rate: 0.85,
      response_rate: 0.92,
      
      // 业务复杂度
      simple_problem_ratio: 0.5,
      simple_time_factor: 0.6,
      complex_problem_ratio: 0.15,
      complex_time_factor: 2.0,
      
      // 阶段时间偏移
      presale_time_offset: 2,
      midsale_time_offset: 0,
      aftersale_time_offset: 3,

      // 参数分类配置
      _config: [
        {
          title: '基础业务参数',
          icon: '💼',
          color: '#3b82f6',
          params: [
            { key: 'avg_order_value', label: '平均客单价', min: 1, max: 100000, step: 10, unit: '元', default: 160 },
            { key: 'daily_visitors', label: '日均访客数', min: 100, max: 100000, step: 100, unit: '人', default: 3800 },
            { key: 'peak_factor', label: '高峰系数', min: 1.0, max: 2.0, step: 0.1, unit: '', default: 1.2 },
            { key: 'safety_buffer', label: '安全冗余', min: 1.0, max: 2.0, step: 0.05, unit: '', default: 1.15 }
          ]
        },
        {
          title: '转化漏斗',
          icon: '🎯',
          color: '#8b5cf6',
          params: [
            { key: 'visitor_to_presale', label: '访客→咨询率', min: 0, max: 1, step: 0.01, unit: '%', default: 0.25 },
            { key: 'consult_to_order', label: '咨询→下单率', min: 0, max: 1, step: 0.01, unit: '%', default: 0.6 },
            { key: 'order_to_payment', label: '下单→付款率', min: 0, max: 1, step: 0.01, unit: '%', default: 0.9 },
            { key: 'payment_to_aftersale', label: '付款→售后率', min: 0, max: 1, step: 0.01, unit: '%', default: 0.15 },
            { key: 'midsale_ratio', label: '售中占比', min: 0, max: 1, step: 0.01, unit: '%', default: 0.35 }
          ]
        },
        {
          title: '岗位效能',
          icon: '⚡',
          color: '#10b981',
          params: [
            { key: 'presale_handle_time', label: '售前处理时长', min: 1, max: 15, step: 0.5, unit: '分钟', default: 4.5 },
            { key: 'presale_saturation', label: '售前饱和度', min: 0.5, max: 1, step: 0.01, unit: '%', default: 0.78, description: '客服实际工作时间占排班时间的比例，50%~100%' },
            { key: 'midsale_handle_time', label: '售中处理时长', min: 1, max: 15, step: 0.5, unit: '分钟', default: 3.0 },
            { key: 'midsale_saturation', label: '售中饱和度', min: 0.5, max: 1, step: 0.01, unit: '%', default: 0.82, description: '客服实际工作时间占排班时间的比例，50%~100%' },
            { key: 'aftersale_handle_time', label: '售后处理时长', min: 1, max: 15, step: 0.5, unit: '分钟', default: 6.5 },
            { key: 'aftersale_saturation', label: '售后饱和度', min: 0.5, max: 1, step: 0.01, unit: '%', default: 0.72, description: '客服实际工作时间占排班时间的比例，50%~100%' }
          ]
        },
        {
          title: '并发处理能力',
          icon: '🔄',
          color: '#f59e0b',
          params: [
            { key: 'max_concurrent_sessions', label: '单人最大并发数', min: 1, max: 8, step: 1, unit: '个', default: 3, description: '客服同时处理的会话数。在线客服通常2-4个，电话客服为1个' },
            { key: 'concurrent_efficiency_loss', label: '并发效率衰减', min: 0, max: 0.5, step: 0.05, unit: '%', default: 0.15, description: '并发数增加时的效率损失。如并发3个时效率为85%' }
          ]
        },
        {
          title: '员工能力分布',
          icon: '👥',
          color: '#8b5cf6',
          params: [
            { key: 'novice_ratio', label: '新手员工占比', min: 0, max: 0.6, step: 0.05, unit: '%', default: 0.2, description: '入职3个月内的新员工比例' },
            { key: 'novice_efficiency', label: '新手效率系数', min: 0.4, max: 1.0, step: 0.05, unit: '', default: 0.6, description: '新手处理速度是标准的60%' },
            { key: 'expert_ratio', label: '专家员工占比', min: 0, max: 0.4, step: 0.05, unit: '%', default: 0.15, description: '工作1年以上的资深员工比例' },
            { key: 'expert_efficiency', label: '专家效率系数', min: 1.0, max: 2.0, step: 0.1, unit: '', default: 1.4, description: '专家处理速度是标准的1.4倍' }
          ]
        },
        {
          title: '工作状态',
          icon: '📊',
          color: '#06b6d4',
          params: [
            { key: 'actual_availability_rate', label: '实际在岗率', min: 0.6, max: 0.95, step: 0.05, unit: '%', default: 0.85, description: '扣除休息、培训、会议后的实际工作时间占比' },
            { key: 'response_rate', label: '即时响应率', min: 0.7, max: 1.0, step: 0.05, unit: '%', default: 0.92, description: '有咨询时能立即响应的概率' }
          ]
        },
        {
          title: '业务复杂度',
          icon: '🎯',
          color: '#ec4899',
          params: [
            { key: 'simple_problem_ratio', label: '简单问题占比', min: 0.2, max: 0.8, step: 0.05, unit: '%', default: 0.5, description: '物流查询、尺码咨询等简单问题的比例' },
            { key: 'simple_time_factor', label: '简单问题时长系数', min: 0.3, max: 0.8, step: 0.05, unit: '', default: 0.6, description: '简单问题处理时长是标准的60%' },
            { key: 'complex_problem_ratio', label: '复杂问题占比', min: 0.05, max: 0.3, step: 0.05, unit: '%', default: 0.15, description: '投诉、疑难问题等复杂问题的比例' },
            { key: 'complex_time_factor', label: '复杂问题时长系数', min: 1.5, max: 3.0, step: 0.1, unit: '', default: 2.0, description: '复杂问题处理时长是标准的2倍' }
          ]
        },
        {
          title: '阶段时间偏移',
          icon: '⏰',
          color: '#6366f1',
          params: [
            { key: 'presale_time_offset', label: '售前提前天数', min: 0, max: 15, step: 1, unit: '天', default: 2, description: '售前咖询高峰早于活动日的天数，0 表示当天' },
            { key: 'midsale_time_offset', label: '售中延迟天数', min: 0, max: 5, step: 1, unit: '天', default: 0, description: '售中流量相对活动日的延迟，0 表示当天' },
            { key: 'aftersale_time_offset', label: '售后延迟天数', min: 0, max: 15, step: 1, unit: '天', default: 3, description: '售后咨询高峰晚于活动日的天数' }
          ]
        }
      ]
    };
  }

  private _seedParameterSchemes() {
    // 插入默认参数方案
    const insert = this._db.prepare(
      'INSERT INTO parameter_schemes (scheme_name, params_json, is_default, description) VALUES (?, ?, ?, ?)'
    );
    
    insert.run(
      '标准参数方案',
      JSON.stringify(this._getDefaultParams()),
      1,
      '系统预设的标准参数配置，适用于大多数电商客服场景'
    );
  }

  public query(sql: string, params: any[] = []) {
    return this._db.prepare(sql).all(...params);
  }

  public execute(sql: string, params: any[] = []) {
    return this._db.prepare(sql).run(...params);
  }
}
