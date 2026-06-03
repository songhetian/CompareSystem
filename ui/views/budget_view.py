import customtkinter as ctk
from logic.calculator import ManpowerCalculator
from database.models import BudgetRecordModel, ShiftModel, PromotionSchemeModel, HistoricalSchemeModel, ParamModel, ParameterSchemeModel
from ui.components.styled_widgets import (StyledCard, MetricCard, SectionHeader, StyledButton,
                                          StyledEntry, StyledComboBox, StyledOptionMenu)
from ui.components.datetime_pickers import DateRangePicker, DatePicker
from ui.design_system import (Spacing, Colors, Typography, create_font, get_color, 
                              BorderRadius, create_styled_optionmenu)
import pandas as pd
from tkinter import filedialog
import os
from datetime import datetime, timedelta
import json
import math

class BudgetView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.calculator = ManpowerCalculator(db_manager)
        self.param_model = ParamModel(db_manager)
        self.scheme_model = ParameterSchemeModel(db_manager)
        self.record_model = BudgetRecordModel(db_manager)
        self.shift_model = ShiftModel(db_manager)
        self.promotion_model = PromotionSchemeModel(db_manager)
        self.historical_model = HistoricalSchemeModel(db_manager)
        self.current_params_dict = None

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # --- Header ---
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=Spacing.HUGE, pady=(Spacing.HUGE, Spacing.XL), sticky="ew")

        SectionHeader(self.header_frame, text="人力预算仿真工作台").pack(anchor="w")
        ctk.CTkLabel(self.header_frame, text="基于动态过程模拟与岗位错峰算法的专业级决策工具",
                     text_color=Colors.TEXT_SECONDARY, font=create_font(Typography.SIZE_BODY)).pack(anchor="w")

        self.export_btn = StyledButton(self.header_frame, text="📄 导出预算报表", height=40,
                                        fg_color=Colors.ACCENT, hover_color=Colors.SUCCESS,
                                        command=self.export_to_excel)
        self.export_btn.place(relx=1.0, rely=0.5, anchor="e")

        # --- Main Content ---
        self.main_container = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.main_container.grid(row=1, column=0, sticky="nsew", padx=Spacing.XXXL, pady=10)
        self.main_container.grid_columnconfigure((0, 1), weight=1)

        # LEFT COLUMN
        self.left_col = ctk.CTkFrame(self.main_container, fg_color="transparent")
        self.left_col.grid(row=0, column=0, sticky="nsew", padx=(0, 15))

        # 1.1 Business Context
        self.context_card = StyledCard(self.left_col, title="1. 填入核心目标", subtitle="告诉系统你要卖多少钱或者来多少人")
        self.context_card.pack(fill="x", pady=(0, 20))
        ctx_inner = ctk.CTkFrame(self.context_card, fg_color="transparent")
        ctx_inner.pack(padx=Spacing.XL, pady=Spacing.XL, fill="x")

        # Parameter Scheme Selector
        ctk.CTkLabel(ctx_inner, text="使用哪套测算模板？", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        self.scheme_selector = create_styled_optionmenu(ctx_inner, values=["默认模板"], command=self.on_scheme_selected)
        self.scheme_selector.pack(fill="x", pady=(0, 15))
        self.refresh_parameter_schemes()

        # Drive Mode Toggle
        ctk.CTkLabel(ctx_inner, text="你想按什么来算人？", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        self.drive_mode = ctk.StringVar(value="sales")
        mode_f = ctk.CTkFrame(ctx_inner, fg_color=Colors.BG_TERTIARY, corner_radius=BorderRadius.MD)
        mode_f.pack(fill="x", pady=(0, 15))
        
        self.sales_mode_btn = ctk.CTkRadioButton(mode_f, text="按销售额算", variable=self.drive_mode, value="sales", 
                                                command=self.update_input_label, font=create_font(Typography.SIZE_SMALL))
        self.sales_mode_btn.pack(side="left", padx=20, pady=10)
        self.traffic_mode_btn = ctk.CTkRadioButton(mode_f, text="按访客数算", variable=self.drive_mode, value="traffic", 
                                                  command=self.update_input_label, font=create_font(Typography.SIZE_SMALL))
        self.traffic_mode_btn.pack(side="left", padx=20, pady=10)

        # Main Input (Label changes based on mode)
        self.input_label = ctk.CTkLabel(ctx_inner, text="这场活动想卖多少钱？(万元):", font=create_font(Typography.SIZE_BODY, weight="bold"))
        self.input_label.pack(anchor="w", pady=(0, 5))
        self.main_input = StyledEntry(ctx_inner, placeholder_text="填入数字，如: 2000")
        self.main_input.pack(fill="x", pady=(0, 15))

        # Event Level Selector
        ctk.CTkLabel(ctx_inner, text="活动力度有多大？", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        self.promotion_schemes = self.promotion_model.get_all()
        scheme_names = [f"{s[1]} (x{s[2]})" for s in self.promotion_schemes]
        if not scheme_names: scheme_names = ["日常运营"]
        self.event_menu = create_styled_optionmenu(ctx_inner, values=scheme_names)
        self.event_menu.set(scheme_names[0])
        self.event_menu.pack(fill="x", pady=(0, 15))

        # 1.2 Timeline & Peaks
        self.timeline_card = StyledCard(self.left_col, title="2. 设定活动时间", subtitle="活动持续多久？哪几天人最多？")
        self.timeline_card.pack(fill="x", pady=(0, 20))
        time_inner = ctk.CTkFrame(self.timeline_card, fg_color="transparent")
        time_inner.pack(padx=Spacing.XL, pady=Spacing.XL, fill="x")

        # Date Range
        ctk.CTkLabel(time_inner, text="活动从哪天开始到哪天？", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        self.date_range_picker = DateRangePicker(time_inner)
        self.date_range_picker.pack(fill="x", pady=(0, 15))

        # Multiple Peaks
        ctk.CTkLabel(time_inner, text="🔥 哪几天是流量高峰？(可多选):", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        self.peaks_container = ctk.CTkFrame(time_inner, fg_color="transparent")
        self.peaks_container.pack(fill="x")
        self.peak_pickers = []
        self.add_peak_node()

        StyledButton(time_inner, text="➕ 增加一个高峰日", width=120, height=28, 
                      fg_color=Colors.BG_TERTIARY, text_color=Colors.TEXT_PRIMARY,
                      command=self.add_peak_node).pack(pady=10)

        # 1.3 Shift Selection
        self.shift_card = StyledCard(self.left_col, title="3. 安排哪些班次？", subtitle="勾选这场活动你要用到的排班")
        self.shift_card.pack(fill="x", pady=(0, 20))
        
        self.refresh_btn = ctk.CTkButton(self.shift_card, text="🔄 刷新列表", width=80, height=20, 
                                        fg_color="transparent", text_color=Colors.TEXT_SECONDARY,
                                        hover_color=Colors.BG_TERTIARY,
                                        font=create_font(Typography.SIZE_SMALL),
                                        command=self.load_shift_checkboxes)
        self.refresh_btn.place(relx=1.0, rely=0.1, anchor="e", x=-20)

        self.shift_container = ctk.CTkFrame(self.shift_card, fg_color="transparent")
        self.shift_container.pack(padx=Spacing.XL, pady=Spacing.XL, fill="x")
        self.load_shift_checkboxes()

        # RIGHT COLUMN
        self.right_col = ctk.CTkFrame(self.main_container, fg_color="transparent")
        self.right_col.grid(row=0, column=1, sticky="nsew", padx=(15, 0))

        # 2.1 Result Dashboard
        self.result_card = StyledCard(self.right_col, title="3. 测算结论", subtitle="系统根据你的目标算出来的结果")
        self.result_card.pack(fill="x", pady=(0, 20))
        res_inner = ctk.CTkFrame(self.result_card, fg_color="transparent")
        res_inner.pack(padx=Spacing.XL, pady=Spacing.XL, fill="x")

        self.card_staff = MetricCard(res_inner, "一共需要多少人？", "0", unit=" 人", icon="👥", color=Colors.PRIMARY)
        self.card_staff.pack(fill="x", pady=(0, 10))

        metrics_f = ctk.CTkFrame(res_inner, fg_color="transparent")
        metrics_f.pack(fill="x")
        metrics_f.grid_columnconfigure((0, 1), weight=1)
        self.card_daily_c = MetricCard(metrics_f, "平均每天接多少活？", "0", icon="💬", color=Colors.SECONDARY)
        self.card_daily_c.grid(row=0, column=0, padx=(0, 5), sticky="ew")
        self.card_hours = MetricCard(metrics_f, "高峰那天要干多久？", "0", unit="h", icon="⏰", color=Colors.SECONDARY)
        self.card_hours.grid(row=0, column=1, padx=(5, 0), sticky="ew")

        # 固定高度容器防止更新时抖动
        self.analysis_container = ctk.CTkFrame(res_inner, fg_color="transparent", height=130)
        self.analysis_container.pack(fill="x", pady=(15, 0))
        self.analysis_container.pack_propagate(False)

        self.analysis_text = ctk.CTkLabel(self.analysis_container, text="请先在左边填好数据，然后点下面的测算按钮...", 
                                         font=create_font(Typography.SIZE_SMALL),
                                         text_color=Colors.TEXT_SECONDARY, justify="left", 
                                         wraplength=380, anchor="nw")
        self.analysis_text.pack(fill="both", expand=True)

        self.calc_btn = StyledButton(self.right_col, text="⚡ 马上帮我算一下", height=50,
                                       font=create_font(Typography.SIZE_H3, weight=Typography.WEIGHT_BOLD),
                                       command=self.run_calculation)
        self.calc_btn.pack(fill="x", pady=10)

        btns_f = ctk.CTkFrame(self.right_col, fg_color="transparent")
        btns_f.pack(fill="x", pady=(0, 10))
        btns_f.grid_columnconfigure((0, 1), weight=1)

        self.hourly_btn = StyledButton(btns_f, text="📈 高峰那天几点人多？", height=40,
                                        fg_color=Colors.SECONDARY, hover_color=Colors.ACCENT,
                                        command=self.show_hourly_curve)
        self.hourly_btn.grid(row=0, column=0, padx=(0, 5), sticky="ew")

        self.timeline_btn = StyledButton(btns_f, text="🌊 看看这几天的人力变化", height=40,
                                          fg_color=Colors.INFO, hover_color=Colors.PRIMARY,
                                          command=self.show_timeline_curve)
        self.timeline_btn.grid(row=0, column=1, padx=(5, 0), sticky="ew")

    def update_input_label(self):
        if self.drive_mode.get() == "sales":
            self.input_label.configure(text="预估销售总额 (万元):")
            self.main_input.configure(placeholder_text="输入数字，如: 2000")
        else:
            self.input_label.configure(text="预计日均访客数 (人):")
            self.main_input.configure(placeholder_text="输入数字，如: 5000")

    def refresh_parameter_schemes(self):
        schemes = self.scheme_model.get_all()
        self.scheme_options = schemes
        self.scheme_selector.configure(values=[s[1] for s in schemes])
        default_s = self.scheme_model.get_default()
        if default_s:
            self.scheme_selector.set(default_s[1])
            self.current_params_dict = json.loads(default_s[2])

    def on_scheme_selected(self, name):
        s = next((x for x in self.scheme_options if x[1] == name), None)
        if s:
            self.current_params_dict = json.loads(s[2])

    def add_peak_node(self):
        row = ctk.CTkFrame(self.peaks_container, fg_color="transparent")
        row.pack(fill="x", pady=2)
        picker = DatePicker(row)
        picker.pack(side="left", fill="x", expand=True)
        picker.set_date(datetime.now().date() + timedelta(days=10 + len(self.peak_pickers)*5))
        if len(self.peak_pickers) > 0:
            del_btn = StyledButton(row, text="×", width=30, height=28, fg_color=Colors.ERROR,
                                    command=lambda r=row, p=picker: self.remove_peak_node(r, p))
            del_btn.pack(side="right", padx=(5, 0))
        self.peak_pickers.append(picker)

    def remove_peak_node(self, row, picker):
        row.destroy()
        self.peak_pickers.remove(picker)

    def load_shift_checkboxes(self):
        for widget in self.shift_container.winfo_children(): widget.destroy()
        self.shift_vars = {}
        try:
            shifts = self.shift_model.get_all_active()
        except: return
        container = ctk.CTkFrame(self.shift_container, fg_color="transparent")
        container.pack(fill="x", expand=True)
        for i, s in enumerate(shifts):
            col, row = i % 3, i // 3
            container.grid_columnconfigure((0, 1, 2), weight=1)
            shift_id, shift_name, shift_time = s[0], s[1], f"{s[3]}-{s[4]}"
            var = ctk.BooleanVar(value=True)
            btn = ctk.CTkButton(container, text=f"{shift_name}\n{shift_time}",
                                font=create_font(Typography.SIZE_SMALL, weight="bold"),
                                height=50, corner_radius=BorderRadius.MD, border_width=1,
                                border_color=get_color(Colors.PRIMARY), fg_color=get_color(Colors.PRIMARY), 
                                text_color="white", command=lambda sid=shift_id: self.toggle_shift_card(sid))
            btn.grid(row=row, column=col, padx=5, pady=5, sticky="ew")
            self.shift_vars[shift_id] = (var, s, btn)

    def toggle_shift_card(self, shift_id):
        var, data, btn = self.shift_vars[shift_id]
        new_state = not var.get()
        var.set(new_state)
        if new_state:
            btn.configure(fg_color=get_color(Colors.PRIMARY), text_color="white", border_color=get_color(Colors.PRIMARY))
        else:
            btn.configure(fg_color=get_color(Colors.BG_TERTIARY), text_color=get_color(Colors.TEXT_SECONDARY), border_color=get_color(Colors.BORDER_DEFAULT))

    def run_calculation(self):
        self.calc_btn.configure(text="⚡ 仿真计算中...", state="disabled")
        self.analysis_text.configure(text="正在分析全周期负载与规模效应...", text_color=get_color(Colors.TEXT_SECONDARY))
        self.update_idletasks()

        try:
            input_val = self.main_input.get().strip().replace(",", "")
            if not input_val: raise ValueError("请输入核心指标数值")
            raw_val = float(input_val)
            
            mode = self.drive_mode.get()
            if mode == "sales":
                if raw_val > 1000000000:
                    self.analysis_text.configure(text="⚠️ 检测到异常庞大的销售额：\n请确认单位是“万元”还是“元”？", text_color=Colors.ERROR)
                    self.calc_btn.configure(text="⚡ 开始全过程仿真测算", state="normal")
                    return
                sales_val = raw_val * 10000
                calc_params = self.current_params_dict.copy() if self.current_params_dict else self.param_model.get_all_dict()
            else:
                # 流量驱动：直接将输入值作为方案中的 daily_visitors
                sales_val = 0 
                calc_params = self.current_params_dict.copy() if self.current_params_dict else self.param_model.get_all_dict()
                calc_params['daily_visitors'] = raw_val
                # 流量驱动下，推算等效销售额
                avg_ov = calc_params.get('avg_order_value', 160.0)
                c_to_o = calc_params.get('consult_to_order', 0.6)
                o_to_p = calc_params.get('order_to_payment', 0.9)
                sales_val = raw_val * avg_ov * c_to_o * o_to_p

            start_str, end_str = self.date_range_picker.get_date_range()
            start, end = datetime.strptime(start_str, "%Y-%m-%d"), datetime.strptime(end_str, "%Y-%m-%d")
            days = (end - start).days + 1
            peaks = [datetime.strptime(p.get_formatted_date(), "%Y-%m-%d") for p in self.peak_pickers]
            if days <= 0: raise ValueError("日期跨度无效")
        except Exception as e:
            self.analysis_text.configure(text=f"❌ 输入有误: {str(e)}", text_color=get_color(Colors.ERROR))
            self.calc_btn.configure(text="⚡ 开始全过程仿真测算", state="normal")
            return

        event = self.event_menu.get().split(" ")[0]
        if "无活动" in event: event = None
        sel_shifts = [d[1] for sid, d in self.shift_vars.items() if d[0].get()]
        
        res = self.calculator.calculate_with_shifts(sales_val, days, event, sel_shifts, peaks, start, custom_params=calc_params)

        self.card_staff.update_value(res['needed_staff'])
        self.card_daily_c.update_value(f"{res['daily_consult']:.0f}")
        self.card_hours.update_value(f"{res['daily_hours']:.1f}")

        # 获取路径占比分析
        p_sales = res.get('presale_from_sales', 0)
        p_visitors = res.get('visitor_presale_baseline', 0)
        
        if mode == "traffic":
            basis_msg = "基于您输入的日均访客数直接推演。"
        else:
            dominant_path = "销售额反推路径" if p_sales > p_visitors else "访客数底线路径"
            basis_msg = f"编制依据: {dominant_path}。若需更直观，可切换至“流量驱动”模式。"

        analysis = (
            f"💡 仿真洞察报告：\n"
            f" • 测算节奏: {days} 天跨度 | {len(peaks)} 个爆发波次\n"
            f" • 建议配置总人数: {res['needed_staff']} 人\n"
            f" • 岗位分布(峰值日): 咨询接待{res['presale_staff']}人 | 订单处理{res['midsale_staff']}人 | 售后处理{res['aftersale_staff']}人\n"
            f" • {basis_msg}"
        )
        self.analysis_text.configure(text=analysis, text_color=get_color(Colors.TEXT_PRIMARY))
        self.calc_btn.configure(text="⚡ 开始全过程仿真测算", state="normal")
        self.last_res, self.last_params = res, {'sales': sales_val, 'visitors': raw_val if mode=="traffic" else p_visitors/days, 'days': days, 'event': event, 'peaks': peaks, 'start': start}

    def center_dialog(self, d, w, h):
        self.update_idletasks()
        x = self.winfo_rootx() + (self.winfo_width()//2) - (w//2)
        y = self.winfo_rooty() + (self.winfo_height()//2) - (h//2)
        d.geometry(f"{w}x{h}+{x}+{y}")

    def show_hourly_curve(self):
        if hasattr(self, 'last_res'):
            p = self.last_params
            d = self.calculator.calculate_hourly_staffing(p['sales'], p['days'], p['event'], p['peaks'], p['start'])
            self.center_dialog(HourlyCurveWindow(self, d), 1000, 650)

    def show_timeline_curve(self):
        if hasattr(self, 'last_res'):
            self.center_dialog(TimelineCurveWindow(self, self.last_res['daily_results']), 1000, 600)

    def export_to_excel(self):
        if not hasattr(self, 'last_res'): self.run_calculation()
        res, p = self.last_res, self.last_params
        path = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel files", "*.xlsx")])
        if path:
            try:
                # 1. 摘要 Sheet
                summ_data = {
                    "维度": ["总指标(销售/访客)", "测算天数", "建议总编制", "售前峰值", "售中峰值", "售后峰值"],
                    "数值": [
                        p['sales']/10000 if self.drive_mode.get()=="sales" else p['visitors'],
                        p['days'],
                        res['needed_staff'],
                        res['presale_staff'],
                        res['midsale_staff'],
                        res['aftersale_staff']
                    ]
                }
                df_summ = pd.DataFrame(summ_data)

                # 2. 每日明细 Sheet
                daily_rows = []
                for r in res['daily_results']:
                    daily_rows.append({
                        "日期": r['date'],
                        "总人数": r['staff'],
                        "售前(人)": round(r['presale'], 1),
                        "售中(人)": round(r['midsale'], 1),
                        "售后(人)": round(r['aftersale'], 1),
                        "售前咨询量": round(r['vol_pre'], 0),
                        "售中请求量": round(r['vol_mid'], 0),
                        "售后工单量": round(r['vol_after'], 0)
                    })
                df_daily = pd.DataFrame(daily_rows)

                with pd.ExcelWriter(path, engine='xlsxwriter') as writer:
                    df_summ.to_excel(writer, sheet_name="测算摘要", index=False)
                    df_daily.to_excel(writer, sheet_name="每日明细", index=False)
                    
                    # 美化表格
                    workbook = writer.book
                    header_fmt = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC', 'border': 1})
                    for sheet in [writer.sheets['测算摘要'], writer.sheets['每日明细']]:
                        sheet.set_column('A:H', 15)

                os.startfile(path)
            except Exception as e:
                self.analysis_text.configure(text=f"❌ 导出失败: {str(e)}", text_color=Colors.ERROR)

class TimelineCurveWindow(ctk.CTkToplevel):
    def __init__(self, parent, data):
        super().__init__(parent); self.title("趋势模拟"); self.geometry("1000x600")
        self.transient(parent); self.grab_set()
        main = ctk.CTkFrame(self, fg_color="transparent"); main.pack(fill="both", expand=True, padx=20, pady=20)
        SectionHeader(main, text="🌊 业务全生命周期人力演变仿真曲线").pack(anchor="w", pady=(0, 20))
        card = StyledCard(main, title="每日分布 (蓝:售前 紫:售中 绿:售后 粗线:总人数)"); card.pack(fill="both", expand=True)
        import tkinter as tk
        canvas = tk.Canvas(card, bg="#1e1e1e", highlightthickness=0); canvas.pack(fill="both", expand=True, padx=20, pady=20)
        
        def draw():
            canvas.delete("all"); w, h = canvas.winfo_width(), canvas.winfo_height()
            if w<100: return
            ml, mr, mt, mb = 80, 40, 40, 80; cw, ch = w-ml-mr, h-mt-mb
            max_val = max([d['staff'] for d in data]) if data else 1
            if max_val == 0: max_val = 1
            
            # 画坐标轴
            canvas.create_line(ml, mt, ml, mt+ch, fill="#555", width=2) # Y
            canvas.create_line(ml, mt+ch, ml+cw, mt+ch, fill="#555", width=2) # X
            
            # Y轴刻度
            for i in range(6):
                y = mt + ch - (i/5)*ch
                val = int(max_val * (i/5))
                canvas.create_text(ml-10, y, text=str(val), fill="#888", anchor="e")
                canvas.create_line(ml-5, y, ml, y, fill="#555")

            dx = cw/(len(data)-1) if len(data)>1 else cw
            colors = {'staff': get_color(Colors.PRIMARY), 'presale': '#3b82f6', 'midsale': '#8b5cf6', 'aftersale': '#10b981'}
            
            # 画线
            for k in ['presale', 'midsale', 'aftersale', 'staff']:
                pts = []
                for i, d in enumerate(data):
                    px, py = ml+i*dx, mt+ch-(d[k]/max_val)*ch
                    pts.extend([px, py])
                canvas.create_line(pts, fill=colors[k], width=3 if k=='staff' else 1.5, smooth=True)

            # X轴日期 (抽样显示)
            step = max(1, len(data) // 10)
            for i, d in enumerate(data):
                if i % step == 0:
                    px = ml + i*dx
                    canvas.create_text(px, mt+ch+20, text=d['date'], fill="#888", angle=45, anchor="ne")

        canvas.after(100, draw); canvas.bind("<Configure>", lambda e: draw())

class HourlyCurveWindow(ctk.CTkToplevel):
    def __init__(self, parent, res):
        super().__init__(parent); self.title("24h负荷"); self.geometry("1000x650")
        self.transient(parent); self.grab_set()
        main = ctk.CTkFrame(self, fg_color="transparent"); main.pack(fill="both", expand=True, padx=20, pady=20)
        SectionHeader(main, text="📊 峰值日 24小时负荷分布").pack(anchor="w", pady=(0, 20))
        card = StyledCard(main, title="分时人力结构 (堆叠显示)"); card.pack(fill="both", expand=True)
        import tkinter as tk
        canvas = tk.Canvas(card, bg="#1e1e1e", highlightthickness=0); canvas.pack(fill="both", expand=True, padx=20, pady=20)
        
        def draw():
            canvas.delete("all"); w, h = canvas.winfo_width(), canvas.winfo_height()
            if w<100: return
            ml, mr, mt, mb = 80, 40, 40, 60; cw, ch = w-ml-mr, h-mt-mb
            max_s = max(res['hourly_total']) if res['hourly_total'] else 1
            if max_s == 0: max_s = 1
            bw = cw/24

            # 坐标轴
            canvas.create_line(ml, mt, ml, mt+ch, fill="#555", width=2)
            canvas.create_line(ml, mt+ch, ml+cw, mt+ch, fill="#555", width=2)

            # Y轴刻度
            for i in range(6):
                y = mt + ch - (i/5)*ch
                val = round(max_s * (i/5), 1)
                canvas.create_text(ml-10, y, text=str(val), fill="#888", anchor="e")

            for i in range(24):
                x, tot, pre, mid, aft = ml+i*bw, res['hourly_total'][i], res['hourly_presale'][i], res['hourly_midsale'][i], res['hourly_aftersale'][i]
                base_y = mt+ch
                for v, c in [(pre, '#3b82f6'), (mid, '#8b5cf6'), (aft, '#10b981')]:
                    h_bar = (v/max_s)*ch
                    canvas.create_rectangle(x+4, base_y-h_bar, x+bw-4, base_y, fill=c, outline="")
                    base_y -= h_bar
                # X轴刻度
                canvas.create_text(x+bw/2, mt+ch+15, text=f"{i}h", fill="#888", font=("Arial", 8))

        canvas.after(100, draw); canvas.bind("<Configure>", lambda e: draw())
