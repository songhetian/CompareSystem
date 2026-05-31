import math
import numpy as np
from sklearn.linear_model import LinearRegression
from database.models import ParamModel, HistoryDataModel

class ManpowerCalculator:
    def __init__(self, db_manager):
        self.param_model = ParamModel(db_manager)
        self.history_model = HistoryDataModel(db_manager)

    def calculate_with_shifts(self, target_sales, days=30, event_type=None, selected_shifts=[]):
        """
        核心算法：基于选定班次和高级容错参数进行测算 (移除月度波动)
        """
        # 1. 加载参数
        p = lambda k, d: self.param_model.get_by_key(k) or d
        
        avg_ov = p('avg_order_value', 120.0)
        c_rate = p('consult_rate', 0.18)
        f_tolerance = p('fault_tolerance', 0.15)
        
        t_speed = p('typing_speed', 60.0)
        skill = p('skill_level', 0.90)
        base_ht = p('base_handle_time', 4.0)
        
        sys_loss = p('system_loss', 0.05)
        churn_b = p('churn_buffer', 0.10)
        non_prod = p('non_prod_ratio', 0.20)
        resp_strict = p('response_strictness', 1.0)

        # 2. 活动系数计算
        e_f = 1.0
        if event_type == "S级": e_f = p('event_s', 2.8)
        elif event_type == "A级": e_f = p('event_a', 1.9)

        # 3. 需求工时计算 (TRWH)
        total_consult = (target_sales / avg_ov) * c_rate * e_f
        buffered_consult = total_consult * (1 + f_tolerance)
        
        typing_mod = 60.0 / t_speed
        skill_mod = 1.0 / skill
        actual_ht = base_ht * typing_mod * skill_mod
        
        handle_hours = (buffered_consult * actual_ht) / 60.0
        
        # 响应严苛度修正
        strictness_mod = 1.0 + (resp_strict - 1.0) * 0.5 
        handle_hours *= strictness_mod

        # 综合损耗修正
        total_loss_factor = (1 + non_prod) * (1 + sys_loss) * (1 + churn_b)
        total_required_hours = handle_hours * total_loss_factor
        
        daily_required_hours = total_required_hours / days

        # 4. 班次匹配计算
        if not selected_shifts:
            avg_shift_hours = 8.0
        else:
            avg_shift_hours = sum([s[5] for s in selected_shifts]) / len(selected_shifts)
        
        needed_staff = math.ceil(daily_required_hours / avg_shift_hours)

        # 5. 敏感度分析
        sensitivity = {
            "打字速度": -(needed_staff * 0.08),
            "容错率": (needed_staff * 0.09),
            "客单价": -(needed_staff * 0.10)
        }

        return {
            "total_consult": total_consult,
            "daily_consult": buffered_consult / days,
            "daily_hours": daily_required_hours,
            "needed_staff": needed_staff,
            "avg_shift_hours": avg_shift_hours,
            "actual_ht": actual_ht,
            "sensitivity": sensitivity,
            "load_factor": daily_required_hours / (needed_staff * avg_shift_hours) if needed_staff else 0
        }

    def calculate_trend(self, target_sales):
        history_data = self.history_model.get_recent(limit=24)
        if len(history_data) < 3:
            return None
        X = np.array([row[2] for row in history_data]).reshape(-1, 1)
        y = np.array([row[3] for row in history_data])
        model = LinearRegression()
        model.fit(X, y)
        predicted_staff = model.predict(np.array([[target_sales]]))[0]
        return {
            "needed_staff": max(1, math.ceil(predicted_staff)),
            "r_squared": model.score(X, y)
        }
