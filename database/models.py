from .db_manager import DatabaseManager
from datetime import datetime

class BaseModel:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

class ShiftModel(BaseModel):
    def get_all_active(self):
        return self.db.execute_query("SELECT * FROM sys_shift WHERE status = 1")

    def add_shift(self, name, shift_type, start_time, end_time, work_hours, remark=""):
        sql = """INSERT INTO sys_shift (shift_name, shift_type, start_time, end_time, work_hours, remark)
                 VALUES (?, ?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (name, shift_type, start_time, end_time, work_hours, remark))

class ParamModel(BaseModel):
    def get_all(self):
        return self.db.execute_query("SELECT * FROM sys_params")

    def get_by_key(self, key):
        result = self.db.execute_query("SELECT param_value FROM sys_params WHERE param_key = ?", (key,))
        return result[0][0] if result else None

    def update_param(self, key, value):
        sql = "UPDATE sys_params SET param_value = ?, update_time = CURRENT_TIMESTAMP WHERE param_key = ?"
        return self.db.execute_non_query(sql, (value, key))

    def init_default_params(self):
        defaults = [
            # 基础经营 (核心变量)
            ('平均客单价', 'avg_order_value', 120.0, '核心变量', '平均每个订单的成交金额 (元)'),
            ('咨询转化率', 'consult_rate', 0.18, '核心变量', '访客咨询比例 (0-1)'),
            ('容错冗余系数', 'fault_tolerance', 0.15, '核心变量', '为业务高峰或突发状况预留的百分比'),
            
            # 客服能力 (能力建模)
            ('打字速度', 'typing_speed', 60.0, '能力建模', '客服平均每分钟打字数'),
            ('业务熟练度', 'skill_level', 0.90, '能力建模', '1为完全熟练，低值增加处理时长'),
            ('单条咨询基准时长', 'base_handle_time', 4.0, '能力建模', '标准咨询平均处理分钟数'),
            
            # 容错与损耗 (精细化控制)
            ('系统故障损耗', 'system_loss', 0.05, '容错损耗', '技术/网络导致的效率降低'),
            ('人员流动预警', 'churn_buffer', 0.10, '容错损耗', '应对离职、请假的额外人力储备'),
            ('非生产性时长占比', 'non_prod_ratio', 0.20, '容错损耗', '休息、会议、培训等非接待时间'),
            ('响应时长严苛度', 'response_strictness', 1.0, '容错损耗', '1为标准，提高该值会增加人力以缩短等待'),
            
            # 专项大促
            ('S级大促系数', 'event_s', 2.8, '专项大促', '顶级大促爆发系数'),
            ('A级活动系数', 'event_a', 1.9, '专项大促', '常规平台级活动系数')
        ]
        for name, key, val, cat, desc in defaults:
            try:
                sql = "INSERT OR IGNORE INTO sys_params (param_name, param_key, param_value, category, param_desc) VALUES (?, ?, ?, ?, ?)"
                self.db.execute_non_query(sql, (name, key, val, cat, desc))
            except Exception as e:
                print(f"Error init param {key}: {e}")

        # 清理旧的月度参数
        self.db.execute_non_query("DELETE FROM sys_params WHERE category = '月度波动'")

class StaffModel(BaseModel):
    def get_all_active(self):
        return self.db.execute_query("SELECT * FROM staff_info WHERE status = 1")

    def add_staff(self, staff_no, name, staff_type, phone="", entry_date="", remark=""):
        sql = """INSERT INTO staff_info (staff_no, staff_name, staff_type, phone, entry_date, remark)
                 VALUES (?, ?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (staff_no, name, staff_type, phone, entry_date, remark))

class BudgetRecordModel(BaseModel):
    def add_record(self, calc_type, target_sales, consult_num, work_hours, shift_num, staff_num, total_cost, remark=""):
        sql = """INSERT INTO budget_calc_record (calc_type, target_sales, consult_num, total_work_hours, 
                 need_shift_num, need_staff_num, total_cost, calc_remark)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (calc_type, target_sales, consult_num, work_hours, shift_num, staff_num, total_cost, remark))

class HistoryDataModel(BaseModel):
    def add_data(self, date, sales, actual_staff, actual_consult=0, remark=""):
        sql = """INSERT OR REPLACE INTO history_biz_data (data_date, sales_volume, actual_staff, actual_consult, remark)
                 VALUES (?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (date, sales, actual_staff, actual_consult, remark))

    def get_recent(self, limit=12):
        return self.db.execute_query("SELECT * FROM history_biz_data ORDER BY data_date DESC LIMIT ?", (limit,))

class CostConfigModel(BaseModel):
    def get_all(self):
        return self.db.execute_query("SELECT * FROM cost_config")

    def update_cost(self, staff_type, base, social, performance, commission):
        total = base + social + performance + commission
        sql = """INSERT OR REPLACE INTO cost_config (staff_type, base_salary, social_security, performance_avg, commission_avg, total_cost)
                 VALUES (?, ?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (staff_type, base, social, performance, commission, total))
