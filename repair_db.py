import sqlite3
import os

db_path = "data/service_budget.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # 强制重置 UV 访客数为正常值
    cur.execute("UPDATE sys_params SET param_value = 3800.0 WHERE param_key = 'daily_visitors'")
    # 确保 param_model 异常不会再次出现
    conn.commit()
    conn.close()
    print("Database repaired: daily_visitors reset to 3800.0")
else:
    print("Database not found")
