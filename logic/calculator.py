import math
import numpy as np
from dataclasses import dataclass
from datetime import datetime, timedelta
from database.models import ParamModel, HistoryDataModel, TimeSlotConfigModel

class ManpowerCalculator:
    def __init__(self, db_manager):
        self.param_model = ParamModel(db_manager)
        self.history_model = HistoryDataModel(db_manager)
        self.timeslot_model = TimeSlotConfigModel(db_manager)

    def _get_daily_weights(self, days, event_date, calc_start_date, phase_offset, spread=3, is_uniform=False):
        # Even for uniform/daily, use a wider spread to ensure natural fluctuations instead of a flat line
        effective_spread = spread * (5 if is_uniform else 1)
        weights = []
        peak_day = event_date + timedelta(days=phase_offset)
        for i in range(days):
            current_day = calc_start_date + timedelta(days=i)
            delta = (current_day - peak_day).days
            weight = math.exp(-(delta**2) / (2 * (effective_spread**2)))
            weights.append(weight)
        total_w = sum(weights)
        if total_w == 0: return [1.0/days] * days
        return [w / total_w for w in weights]

    def calculate_with_shifts(self, target_sales, days=30, event_type=None, selected_shifts=[], event_dates=[], calc_start_date=None, custom_params=None):
        """
        全过程仿真算法：引入双径流量推演与柔性人力模型
        """
        is_daily = event_type is None or "日常" in event_type
        if not event_dates: event_dates = [datetime.now()]
        if calc_start_date is None: calc_start_date = min(event_dates) - timedelta(days=5)

        # 1. 加载参数 (支持从方案加载或从数据库加载)
        params_dict = custom_params if custom_params else self.param_model.get_all_dict()
        p = lambda k, d: params_dict.get(k, d)
        
        avg_ov = p('avg_order_value', 160.0)
        peak_factor = p('peak_factor', 1.2)
        safety_buffer = p('safety_buffer', 1.15)
        
        # 访客相关 (从参数中获取基准)
        base_daily_visitors = p('daily_visitors', 1000.0)
        v_to_p_rate = p('visitor_to_presale', 0.25)
        
        offsets = {'presale': p('presale_time_offset', -2.0), 'midsale': p('midsale_time_offset', 0.0), 'aftersale': p('aftersale_time_offset', 3.0)}
        conversion = {'c_to_o': p('consult_to_order', 0.6), 'o_to_p': p('order_to_payment', 0.9), 'm_ratio': p('midsale_ratio', 0.35), 'p_to_a': p('payment_to_aftersale', 0.15)}

        cap = {
            'presale': (60.0 / p('presale_handle_time', 4.5)) * p('presale_saturation', 0.78),
            'midsale': (60.0 / p('midsale_handle_time', 3.0)) * p('midsale_saturation', 0.82),
            'aftersale': (60.0 / p('aftersale_handle_time', 6.5)) * p('aftersale_saturation', 0.72)
        }

        # 2. 流量推演 (双径对比)
        event_f = 1.0
        if event_type == "S1级大促": event_f = p('event_s', 2.8)
        elif event_type == "S2级活动": event_f = p('event_a', 1.9)
        
        # 路径 A: 从销售额反推
        orders_from_sales = (target_sales / avg_ov) * event_f
        presale_from_sales = orders_from_sales / (conversion['c_to_o'] * conversion['o_to_p'])
        
        # 路径 B: 从访客量正推 (确保大促期间不漏流量)
        # 如果销售额较低，系统仍会通过访客数底线来维持人力
        visitor_presale_baseline = base_daily_visitors * days * v_to_p_rate
        total_presale = max(presale_from_sales, visitor_presale_baseline)
        
        total_midsale = total_presale * conversion['m_ratio']
        total_aftersale = (total_presale * conversion['c_to_o'] * conversion['o_to_p']) * conversion['p_to_a']

        # 3. 每日分布 (多峰叠加)
        num_peaks = len(event_dates)
        w_pre, w_mid, w_aft = [0.0]*days, [0.0]*days, [0.0]*days
        for ed in event_dates:
            wp = self._get_daily_weights(days, ed, calc_start_date, offsets['presale'], is_uniform=is_daily)
            wm = self._get_daily_weights(days, ed, calc_start_date, offsets['midsale'], is_uniform=is_daily)
            wa = self._get_daily_weights(days, ed, calc_start_date, offsets['aftersale'], is_uniform=is_daily)
            for i in range(days):
                w_pre[i]+=wp[i]/num_peaks; w_mid[i]+=wm[i]/num_peaks; w_aft[i]+=wa[i]/num_peaks

        daily_results = []
        for i in range(days):
            v_p, v_m, v_a = total_presale*w_pre[i], total_midsale*w_mid[i], total_aftersale*w_aft[i]
            
            def get_raw_demand(vol, phase):
                # 每小时基础话务量
                h_v = (vol / 24.0) * peak_factor * safety_buffer
                # 后台隐藏的分时爆发补正 (如 0点压力)
                if phase == 'presale': h_v *= 1.5 
                return h_v / cap[phase] if cap[phase]>0 else 0

            # 核心：先求和再取整，实现全能客服逻辑，解决 1+1+1=3 的保底过高问题
            raw_p, raw_m, raw_a = get_raw_demand(v_p, 'presale'), get_raw_demand(v_m, 'midsale'), get_raw_demand(v_a, 'aftersale')
            
            daily_results.append({
                'date': (calc_start_date + timedelta(days=i)).strftime('%m-%d'),
                'staff': math.ceil(raw_p + raw_m + raw_a),
                'presale': math.ceil(raw_p), 
                'midsale': math.ceil(raw_m), 
                'aftersale': math.ceil(raw_a),
                'vol_pre': v_p, 'vol_mid': v_m, 'vol_after': v_a
            })

        # 4. 汇总结论
        theoretical_peak = max([r['staff'] for r in daily_results])
        min_staff = len(selected_shifts) if selected_shifts else 1
        needed_staff = max(theoretical_peak, min_staff)
        peak_day = max(daily_results, key=lambda x: x['staff'])

        return {
            "total_consult": (total_presale + total_midsale + total_aftersale),
            "daily_consult": (total_presale + total_midsale + total_aftersale) / days,
            "daily_hours": (peak_day['vol_pre']*p('presale_handle_time',4.5) + peak_day['vol_mid']*p('midsale_handle_time',3.0) + peak_day['vol_after']*p('aftersale_handle_time',6.5))/60.0 * peak_factor * safety_buffer,
            "needed_staff": needed_staff,
            "presale_staff": peak_day['presale'],
            "midsale_staff": peak_day['midsale'],
            "aftersale_staff": peak_day['aftersale'],
            "theoretical_staff": theoretical_peak,
            "min_staff": min_staff,
            "daily_results": daily_results,
            "peak_day_index": daily_results.index(peak_day),
            "sensitivity": {"客单价": -(needed_staff * 0.1), "转化率": (needed_staff * 0.1)},
            "presale_from_sales": presale_from_sales,
            "visitor_presale_baseline": visitor_presale_baseline
        }

    def calculate_hourly_staffing(self, target_sales, days=30, event_type=None, event_dates=[], calc_start_date=None):
        res = self.calculate_with_shifts(target_sales, days, event_type, [], event_dates, calc_start_date)
        peak_day = res['daily_results'][res['peak_day_index']]
        p = lambda k, d: self.param_model.get_by_key(k) or d
        peak_f, safe_b = p('peak_factor', 1.2), p('safety_buffer', 1.15)
        cap = {
            'presale': (60.0 / p('presale_handle_time', 4.5)) * p('presale_saturation', 0.78),
            'midsale': (60.0 / p('midsale_handle_time', 3.0)) * p('midsale_saturation', 0.82),
            'aftersale': (60.0 / p('aftersale_handle_time', 6.5)) * p('aftersale_saturation', 0.72)
        }
        h_p, h_m, h_a, h_t = [], [], [], []
        for h in range(24):
            def get_h_s(vol, phase):
                h_v = (vol / 24.0) * peak_f * safe_b
                if phase == 'presale' and (h < 2 or h > 20): h_v *= 1.8 # 模拟夜间/晚间爆发
                return h_v / cap[phase] if cap[phase]>0 else 0
            s_p, s_m, s_a = get_h_s(peak_day['vol_pre'], 'presale'), get_h_s(peak_day['vol_mid'], 'midsale'), get_h_s(peak_day['vol_after'], 'aftersale')
            h_p.append(s_p); h_m.append(s_m); h_a.append(s_a); h_t.append(math.ceil(s_p + s_m + s_a))
        return {'hourly_presale': h_p, 'hourly_midsale': h_m, 'hourly_aftersale': h_a, 'hourly_total': h_t, 'peak_hour': h_t.index(max(h_t)), 'peak_staff': max(h_t)}

    def calculate_trend(self, target_sales):
        import numpy as np
        from sklearn.linear_model import LinearRegression
        history_data = self.history_model.get_recent(limit=24)
        if len(history_data) < 3: return None
        X = np.array([row[2] for row in history_data]).reshape(-1, 1)
        y = np.array([row[3] for row in history_data])
        model = LinearRegression().fit(X, y)
        return {"needed_staff": max(1, math.ceil(model.predict(np.array([[target_sales]]))[0])), "r_squared": model.score(X, y)}
