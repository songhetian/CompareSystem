import sqlite3
import os
from datetime import datetime

class DatabaseManager:
    def __init__(self, db_path="data/service_budget.db"):
        self.db_path = db_path
        self._init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = self.get_connection()
        cur = conn.cursor()

        sql_list = [
            """CREATE TABLE IF NOT EXISTS sys_shift (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shift_name TEXT NOT NULL,
                shift_type TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                work_hours REAL NOT NULL,
                status INTEGER DEFAULT 1,
                remark TEXT,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS sys_shift_template (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_name TEXT NOT NULL,
                template_type TEXT NOT NULL,
                shift_ids TEXT NOT NULL,
                status INTEGER DEFAULT 1,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS sys_params (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                param_name TEXT NOT NULL,
                param_key TEXT UNIQUE NOT NULL,
                param_value REAL NOT NULL,
                param_desc TEXT,
                category TEXT NOT NULL,
                update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS staff_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_no TEXT UNIQUE NOT NULL,
                staff_name TEXT NOT NULL,
                staff_type TEXT NOT NULL,
                phone TEXT,
                status INTEGER DEFAULT 1,
                entry_date TEXT,
                remark TEXT,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS staff_shift_rel (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rel_date TEXT NOT NULL,
                shift_id INTEGER NOT NULL,
                staff_id INTEGER NOT NULL,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(rel_date, shift_id),
                UNIQUE(rel_date, staff_id),
                FOREIGN KEY (shift_id) REFERENCES sys_shift(id),
                FOREIGN KEY (staff_id) REFERENCES staff_info(id)
            )""",
            """CREATE TABLE IF NOT EXISTS cost_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_type TEXT UNIQUE NOT NULL,
                base_salary REAL NOT NULL,
                social_security REAL NOT NULL,
                performance_avg REAL NOT NULL,
                commission_avg REAL NOT NULL,
                total_cost REAL NOT NULL,
                update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS budget_calc_record (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                calc_type TEXT NOT NULL,
                target_sales REAL NOT NULL,
                consult_num REAL,
                total_work_hours REAL,
                need_shift_num INTEGER,
                need_staff_num INTEGER,
                total_cost REAL,
                calc_remark TEXT,
                calc_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS history_biz_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_date TEXT NOT NULL,
                sales_volume REAL NOT NULL,
                actual_staff INTEGER NOT NULL,
                actual_consult REAL,
                remark TEXT,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(data_date)
            )""",
            """CREATE TABLE IF NOT EXISTS time_slot_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phase TEXT NOT NULL,
                start_hour INTEGER NOT NULL,
                end_hour INTEGER NOT NULL,
                burst_factor REAL DEFAULT 1.0,
                staff_ratio REAL DEFAULT 1.0,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS promotion_schemes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scheme_name TEXT NOT NULL,
                traffic_factor REAL NOT NULL,
                description TEXT,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS historical_schemes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scheme_name TEXT NOT NULL,
                params_json TEXT NOT NULL,
                result_json TEXT NOT NULL,
                description TEXT,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        ]

        for sql in sql_list:
            cur.execute(sql)
        
        # Add indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_shift_status ON sys_shift(status)",
            "CREATE INDEX IF NOT EXISTS idx_staff_status ON staff_info(status)",
            "CREATE INDEX IF NOT EXISTS idx_staff_no ON staff_info(staff_no)",
            "CREATE INDEX IF NOT EXISTS idx_rel_date ON staff_shift_rel(rel_date)",
            "CREATE INDEX IF NOT EXISTS idx_calc_time ON budget_calc_record(calc_time)",
            "CREATE INDEX IF NOT EXISTS idx_data_date ON history_biz_data(data_date)"
        ]
        for idx_sql in indexes:
            cur.execute(idx_sql)

        # Ensure all columns exist (for schema evolution)
        try:
            cur.execute("ALTER TABLE sys_shift ADD COLUMN rest_hours REAL DEFAULT 0.0")
        except: pass
        
        try:
            cur.execute("ALTER TABLE history_biz_data ADD COLUMN conversion_rate REAL DEFAULT 0.0")
        except: pass

        conn.commit()
        conn.close()

    def execute_query(self, query, params=()):
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(query, params)
            return cur.fetchall()

    def execute_non_query(self, query, params=()):
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(query, params)
            conn.commit()
            return cur.rowcount
