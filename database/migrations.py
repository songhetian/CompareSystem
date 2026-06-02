"""
数据库迁移脚本 - 添加新功能所需的表
"""
import sqlite3
from pathlib import Path

def run_migrations():
    """执行数据库迁移"""
    db_path = Path("data/service_budget.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("开始数据库迁移...")

    # 1. 创建大促方案表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS promotion_schemes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scheme_name TEXT NOT NULL,
            traffic_factor REAL NOT NULL DEFAULT 1.0,
            description TEXT,
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✓ 创建 promotion_schemes 表")

    # 插入默认大促方案
    cursor.execute("SELECT COUNT(*) FROM promotion_schemes")
    if cursor.fetchone()[0] == 0:
        default_schemes = [
            ("S级大促(双11/618)", 2.8, "顶级大促，流量爆发最高"),
            ("A级活动(会员日)", 1.9, "常规平台级活动"),
            ("B级活动(品类日)", 1.5, "品类促销活动"),
            ("日常运营", 1.0, "无活动的日常流量")
        ]
        cursor.executemany(
            "INSERT INTO promotion_schemes (scheme_name, traffic_factor, description) VALUES (?, ?, ?)",
            default_schemes
        )
        print("✓ 插入默认大促方案")

    # 2. 创建时间段配置表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS time_slot_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phase TEXT NOT NULL,
            start_hour INTEGER NOT NULL,
            end_hour INTEGER NOT NULL,
            burst_factor REAL NOT NULL DEFAULT 1.0,
            staff_ratio REAL NOT NULL DEFAULT 1.0,
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_phase CHECK (phase IN ('presale', 'midsale', 'aftersale')),
            CONSTRAINT check_hours CHECK (start_hour >= 0 AND start_hour < 24 AND end_hour > 0 AND end_hour <= 24)
        )
    """)
    print("✓ 创建 time_slot_configs 表")

    # 插入默认时间段配置
    cursor.execute("SELECT COUNT(*) FROM time_slot_configs")
    if cursor.fetchone()[0] == 0:
        default_slots = [
            # 售前：上午咨询高峰
            ('presale', 10, 12, 1.9, 1.0),
            # 售中：下午改单催单高峰
            ('midsale', 15, 17, 2.3, 1.0),
            # 售后：晚间退货投诉高峰
            ('aftersale', 20, 22, 2.6, 1.0)
        ]
        cursor.executemany(
            "INSERT INTO time_slot_configs (phase, start_hour, end_hour, burst_factor, staff_ratio) VALUES (?, ?, ?, ?, ?)",
            default_slots
        )
        print("✓ 插入默认时间段配置")

    # 3. 创建历史方案表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historical_schemes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scheme_name TEXT NOT NULL,
            params_json TEXT NOT NULL,
            result_json TEXT NOT NULL,
            description TEXT,
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✓ 创建 historical_schemes 表")

    # 4. 创建参数方案表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS parameter_schemes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scheme_name TEXT NOT NULL,
            params_json TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            description TEXT,
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✓ 创建 parameter_schemes 表")

    # 插入默认方案 (如果表为空)
    cursor.execute("SELECT COUNT(*) FROM parameter_schemes")
    if cursor.fetchone()[0] == 0:
        try:
            cursor.execute("SELECT param_key, param_value FROM sys_params")
            rows = cursor.fetchall()
            if rows:
                import json
                params_dict = {row[0]: row[1] for row in rows}
                cursor.execute(
                    "INSERT INTO parameter_schemes (scheme_name, params_json, is_default, description) VALUES (?, ?, ?, ?)",
                    ("通用基准方案", json.dumps(params_dict), 1, "系统初始默认方案")
                )
                print("✓ 已将当前参数导出为默认方案")
        except: pass

    conn.commit()
    conn.close()
    print("\n✅ 数据库迁移完成！")

if __name__ == "__main__":
    run_migrations()
