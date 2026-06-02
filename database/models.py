from .db_manager import DatabaseManager
from datetime import datetime

class BaseModel:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

class ShiftModel(BaseModel):
    def get_all_active(self):
        return self.db.execute_query("SELECT * FROM sys_shift WHERE status = 1")

    def add_shift(self, name, shift_type, start_time, end_time, work_hours, rest_hours=0.0, remark=""):
        sql = """INSERT INTO sys_shift (shift_name, shift_type, start_time, end_time, work_hours, rest_hours, remark)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (name, shift_type, start_time, end_time, work_hours, rest_hours, remark))

    def update_shift(self, shift_id, name, shift_type, start_time, end_time, work_hours, rest_hours=0.0, remark=""):
        sql = """UPDATE sys_shift 
                 SET shift_name=?, shift_type=?, start_time=?, end_time=?, work_hours=?, rest_hours=?, remark=?, update_time=CURRENT_TIMESTAMP
                 WHERE id=?"""
        return self.db.execute_non_query(sql, (name, shift_type, start_time, end_time, work_hours, rest_hours, remark, shift_id))

    def delete_shift(self, shift_id):
        """逻辑删除：将状态设为0"""
        return self.db.execute_non_query("UPDATE sys_shift SET status = 0 WHERE id = ?", (shift_id,))

class ParamModel(BaseModel):
    def get_all(self):
        return self.db.execute_query("SELECT * FROM sys_params")

    def get_by_key(self, key):
        result = self.db.execute_query("SELECT param_value FROM sys_params WHERE param_key = ?", (key,))
        return result[0][0] if result else None

    def get_all_dict(self):
        """一次性获取所有参数并返回字典，减少数据库查询次数"""
        results = self.db.execute_query("SELECT param_key, param_value FROM sys_params")
        return {r[0]: r[1] for r in results}

    def update_param(self, key, value):
        sql = "UPDATE sys_params SET param_value = ?, update_time = CURRENT_TIMESTAMP WHERE param_key = ?"
        return self.db.execute_non_query(sql, (value, key))

    def update_params_batch(self, params_dict):
        """批量更新参数，使用单一事务提高性能"""
        sql = "UPDATE sys_params SET param_value = ?, update_time = CURRENT_TIMESTAMP WHERE param_key = ?"
        with self.db.get_connection() as conn:
            cur = conn.cursor()
            for key, value in params_dict.items():
                cur.execute(sql, (value, key))
            conn.commit()
            return True

    def init_default_params(self):
        defaults = [
            # 基础业务参数
            ('平均客单价', 'avg_order_value', 160.0, '基础业务', '平均每个订单的成交金额 (元)'),
            ('日访客数', 'daily_visitors', 3800, '基础业务', '进店/进线独立访客数'),
            ('全日高峰系数', 'peak_factor', 1.2, '基础业务', '全天通用波动上浮'),
            ('安全冗余系数', 'safety_buffer', 1.15, '基础业务', '预留备用人力，防止崩盘'),

            # 多层漏斗转化参数
            ('访客转售前咨询率', 'visitor_to_presale', 0.25, '漏斗转化', '访客主动发起咨询比例'),
            ('咨询转下单率', 'consult_to_order', 0.6, '漏斗转化', '咨询后产生下单'),
            ('下单转付款率', 'order_to_payment', 0.9, '漏斗转化', '下单后实际付款'),
            ('付款转售后率', 'payment_to_aftersale', 0.15, '漏斗转化', '成交后产生售后工单'),
            ('售中请求占比', 'midsale_ratio', 0.35, '漏斗转化', '改地址、改规格、催单'),

            # 岗位独立效能参数 - 通用
            ('每日工作时长', 'daily_work_hours', 8.0, '岗位效能', '每日工作小时数'),
            ('每小时休息分钟', 'rest_per_hour', 10.0, '岗位效能', '喝水、走动、放空'),

            # 岗位独立效能参数 - 售前
            ('售前单次处理时长', 'presale_handle_time', 4.5, '岗位效能', '售前咨询平均处理分钟数'),
            ('售前工作饱和度', 'presale_saturation', 0.78, '岗位效能', '售前有效工作率'),

            # 岗位独立效能参数 - 售中
            ('售中单次处理时长', 'midsale_handle_time', 3.0, '岗位效能', '售中请求平均处理分钟数'),
            ('售中工作饱和度', 'midsale_saturation', 0.82, '岗位效能', '售中有效工作率'),

            # 岗位独立效能参数 - 售后
            ('售后单次处理时长', 'aftersale_handle_time', 6.5, '岗位效能', '售后工单平均处理分钟数'),
            ('售后工作饱和度', 'aftersale_saturation', 0.72, '岗位效能', '售后有效工作率'),

            # 分时爆发参数 - 售前
            ('售前爆发开始', 'presale_burst_start', 10, '分时爆发', '售前爆发开始小时'),
            ('售前爆发结束', 'presale_burst_end', 12, '分时爆发', '售前爆发结束小时'),
            ('售前爆发倍数', 'presale_burst_factor', 1.9, '分时爆发', '售前流量爆发倍数'),

            # 分时爆发参数 - 售中
            ('售中爆发开始', 'midsale_burst_start', 15, '分时爆发', '售中爆发开始小时'),
            ('售中爆发结束', 'midsale_burst_end', 17, '分时爆发', '售中爆发结束小时'),
            ('售中爆发倍数', 'midsale_burst_factor', 2.3, '分时爆发', '售中流量爆发倍数'),

            # 分时爆发参数 - 售后
            ('售后爆发开始', 'aftersale_burst_start', 20, '分时爆发', '售后爆发开始小时'),
            ('售后爆发结束', 'aftersale_burst_end', 22, '分时爆发', '售后爆发结束小时'),
            ('售后爆发倍数', 'aftersale_burst_factor', 2.6, '分时爆发', '售后流量爆发倍数'),

            # 专项大促
            ('S级大促系数', 'event_s', 2.8, '专项大促', '618/双11等顶级大促流量爆发系数'),
            ('A级活动系数', 'event_a', 1.9, '专项大促', '会员日/品类日等常规活动系数'),

            # 时间偏移
            ('售前时间偏移', 'presale_time_offset', -2.0, '时间偏移', '售前工作量高峰提前天数(负数=提前,正数=延后)'),
            ('售中时间偏移', 'midsale_time_offset', 0.0, '时间偏移', '售中工作量高峰偏移天数'),
            ('售后时间偏移', 'aftersale_time_offset', 3.0, '时间偏移', '售后工作量高峰延后天数')
        ]
        for name, key, val, cat, desc in defaults:
            try:
                sql = "INSERT OR IGNORE INTO sys_params (param_name, param_key, param_value, category, param_desc) VALUES (?, ?, ?, ?, ?)"
                self.db.execute_non_query(sql, (name, key, val, cat, desc))
            except Exception as e:
                print(f"Error init param {key}: {e}")

        # 清理旧的和重复的参数
        old_params = [
            # 旧版本参数
            'consult_rate', 'fault_tolerance', 'typing_speed', 'skill_level',
            'base_handle_time', 'system_loss', 'churn_buffer', 'non_prod_ratio', 'response_strictness',
            # 重复的大促参数（保留带"系数"后缀的版本）
            'event_s_level', 'event_a_level', 'S级大促', 'A级活动',
            # 过时的成本参数
            'base_salary', 'outsource_hourly', 'social_security_ratio', 'performance_bonus',
            # 过时的业务参数
            'max_concurrent', 'single_consult_time', 'system_loss_ratio', 'non_service_ratio',
            'weekend_factor', 'peak_season_factor', 'low_season_factor', 'season_factor',
            'presale_consult_ratio', 'aftersale_consult_ratio', 'refund_rate'
        ]
        for old_key in old_params:
            try:
                self.db.execute_non_query("DELETE FROM sys_params WHERE param_key = ?", (old_key,))
            except:
                pass

        # 修正客单价（如果被错误修改为5000）
        try:
            self.db.execute_non_query(
                "UPDATE sys_params SET param_value = 160.0 WHERE param_key = 'avg_order_value' AND param_value > 1000",
                ()
            )
        except:
            pass

        # 修正日访客数（仅针对特定的损坏值 98598.2 进行静默修正）
        try:
            self.db.execute_non_query(
                "UPDATE sys_params SET param_value = 3800.0 WHERE param_key = 'daily_visitors' AND ABS(param_value - 98598.2) < 0.1",
                ()
            )
        except:
            pass

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
    def add_data(self, date, sales, staff, consults, conversion_rate, remark=""):
        sql = """INSERT OR REPLACE INTO history_biz_data 
                 (data_date, sales_volume, actual_staff, actual_consult, conversion_rate, remark)
                 VALUES (?, ?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (date, sales, staff, consults, conversion_rate, remark))

    def get_recent(self, limit=30):
        return self.db.execute_query("SELECT * FROM history_biz_data ORDER BY data_date DESC LIMIT ?", (limit,))

class CostConfigModel(BaseModel):
    def get_all(self):
        return self.db.execute_query("SELECT * FROM cost_config")

    def update_cost(self, staff_type, base, social, performance, commission):
        total = base + social + performance + commission
        sql = """INSERT OR REPLACE INTO cost_config (staff_type, base_salary, social_security, performance_avg, commission_avg, total_cost)
                 VALUES (?, ?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (staff_type, base, social, performance, commission, total))


class PromotionSchemeModel(BaseModel):
    """大促方案管理模型"""

    def get_all(self):
        """获取所有大促方案"""
        return self.db.execute_query("SELECT * FROM promotion_schemes ORDER BY create_time DESC")

    def get_by_id(self, scheme_id):
        """根据ID获取方案"""
        result = self.db.execute_query("SELECT * FROM promotion_schemes WHERE id = ?", (scheme_id,))
        return result[0] if result else None

    def add_scheme(self, name, factor, description=""):
        """添加新方案"""
        sql = """INSERT INTO promotion_schemes (scheme_name, traffic_factor, description)
                 VALUES (?, ?, ?)"""
        return self.db.execute_non_query(sql, (name, factor, description))

    def update_scheme(self, scheme_id, name, factor, description=""):
        """更新方案"""
        sql = """UPDATE promotion_schemes
                 SET scheme_name = ?, traffic_factor = ?, description = ?, update_time = CURRENT_TIMESTAMP
                 WHERE id = ?"""
        return self.db.execute_non_query(sql, (name, factor, description, scheme_id))

    def delete_scheme(self, scheme_id):
        """删除方案"""
        return self.db.execute_non_query("DELETE FROM promotion_schemes WHERE id = ?", (scheme_id,))


class TimeSlotConfigModel(BaseModel):
    """时间段配置模型 - 用于配置售前/售中/售后的爆发时间段"""

    def get_by_phase(self, phase):
        """获取指定阶段的时间段配置
        Args:
            phase: 'presale', 'midsale', 'aftersale'
        """
        return self.db.execute_query(
            "SELECT * FROM time_slot_configs WHERE phase = ? ORDER BY start_hour",
            (phase,)
        )

    def add_slot(self, phase, start_hour, end_hour, burst_factor, staff_ratio=1.0):
        """添加时间段配置"""
        sql = """INSERT INTO time_slot_configs (phase, start_hour, end_hour, burst_factor, staff_ratio)
                 VALUES (?, ?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (phase, start_hour, end_hour, burst_factor, staff_ratio))

    def update_slot(self, slot_id, start_hour, end_hour, burst_factor, staff_ratio=1.0):
        """更新时间段配置"""
        sql = """UPDATE time_slot_configs
                 SET start_hour = ?, end_hour = ?, burst_factor = ?, staff_ratio = ?
                 WHERE id = ?"""
        return self.db.execute_non_query(sql, (start_hour, end_hour, burst_factor, staff_ratio, slot_id))

    def delete_slot(self, slot_id):
        """删除时间段配置"""
        return self.db.execute_non_query("DELETE FROM time_slot_configs WHERE id = ?", (slot_id,))

    def clear_phase(self, phase):
        """清空指定阶段的所有时间段"""
        return self.db.execute_non_query("DELETE FROM time_slot_configs WHERE phase = ?", (phase,))


class HistoricalSchemeModel(BaseModel):
    """历史方案管理模型 - 保存完整的计算方案用于趋势分析"""

    def get_all(self):
        """获取所有历史方案"""
        return self.db.execute_query("SELECT * FROM historical_schemes ORDER BY create_time DESC")

    def get_by_id(self, scheme_id):
        """根据ID获取方案"""
        result = self.db.execute_query("SELECT * FROM historical_schemes WHERE id = ?", (scheme_id,))
        return result[0] if result else None

    def add_scheme(self, name, params_json, result_json, description=""):
        """保存新的历史方案
        Args:
            name: 方案名称
            params_json: 参数JSON字符串
            result_json: 计算结果JSON字符串
            description: 方案描述
        """
        sql = """INSERT INTO historical_schemes (scheme_name, params_json, result_json, description)
                 VALUES (?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (name, params_json, result_json, description))

    def delete_scheme(self, scheme_id):
        """删除历史方案"""
        return self.db.execute_non_query("DELETE FROM historical_schemes WHERE id = ?", (scheme_id,))


class ParameterSchemeModel(BaseModel):
    """全局参数方案模型 - 支持多项目、多套参数管理"""

    def get_all(self):
        return self.db.execute_query("SELECT * FROM parameter_schemes ORDER BY is_default DESC, update_time DESC")

    def get_by_id(self, scheme_id):
        result = self.db.execute_query("SELECT * FROM parameter_schemes WHERE id = ?", (scheme_id,))
        return result[0] if result else None

    def get_default(self):
        result = self.db.execute_query("SELECT * FROM parameter_schemes WHERE is_default = 1")
        if not result:
            result = self.db.execute_query("SELECT * FROM parameter_schemes LIMIT 1")
        return result[0] if result else None

    def add_scheme(self, name, params_dict, description="", is_default=0):
        import json
        if is_default == 1:
            self.db.execute_non_query("UPDATE parameter_schemes SET is_default = 0")
        sql = """INSERT INTO parameter_schemes (scheme_name, params_json, description, is_default)
                 VALUES (?, ?, ?, ?)"""
        return self.db.execute_non_query(sql, (name, json.dumps(params_dict), description, is_default))

    def update_scheme(self, scheme_id, name, params_dict, description=""):
        import json
        sql = """UPDATE parameter_schemes 
                 SET scheme_name = ?, params_json = ?, description = ?, update_time = CURRENT_TIMESTAMP
                 WHERE id = ?"""
        return self.db.execute_non_query(sql, (name, json.dumps(params_dict), description, scheme_id))

    def delete_scheme(self, scheme_id):
        return self.db.execute_non_query("DELETE FROM parameter_schemes WHERE id = ?", (scheme_id,))

    def set_default(self, scheme_id):
        self.db.execute_non_query("UPDATE parameter_schemes SET is_default = 0")
        return self.db.execute_non_query("UPDATE parameter_schemes SET is_default = 1 WHERE id = ?", (scheme_id,))
