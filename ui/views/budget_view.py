import customtkinter as ctk
from logic.calculator import ManpowerCalculator
from database.models import BudgetRecordModel, ShiftModel
from ui.components.styled_widgets import StyledCard, MetricCard, SectionHeader, PrecisionSlider
import pandas as pd
from tkinter import filedialog
import os
from datetime import datetime, timedelta

class BudgetView(ctk.CTkFrame):
import customtkinter as ctk
from logic.calculator import ManpowerCalculator
from database.models import BudgetRecordModel, ShiftModel
from ui.components.styled_widgets import StyledCard, MetricCard, SectionHeader, PrecisionSlider
import pandas as pd
from tkinter import filedialog
import os
from datetime import datetime, timedelta

class BudgetView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.calculator = ManpowerCalculator(db_manager)
        self.record_model = BudgetRecordModel(db_manager)
        self.shift_model = ShiftModel(db_manager)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # ---------------- Header ----------------
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=40, pady=(40, 20), sticky="ew")
        
        SectionHeader(self.header_frame, text="人力预算智能工作台").pack(anchor="w")
        ctk.CTkLabel(self.header_frame, text="基于业务容量建模与班次负荷匹配的专业测算引擎", 
                     text_color="gray", font=ctk.CTkFont(size=14)).pack(anchor="w")
        
        self.export_btn = ctk.CTkButton(self.header_frame, text="📄 导出方案", height=40,
                                        fg_color="#107c10", hover_color="#0b590b",
                                        font=ctk.CTkFont(weight="bold"), command=self.export_to_excel)
        self.export_btn.place(relx=1.0, rely=0.5, anchor="e")

        # ---------------- Main Content ----------------
        self.main_container = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.main_container.grid(row=1, column=0, sticky="nsew", padx=30, pady=10)
        self.main_container.grid_columnconfigure((0, 1), weight=1)

        # LEFT COLUMN
        self.left_col = ctk.CTkFrame(self.main_container, fg_color="transparent")
        self.left_col.grid(row=0, column=0, sticky="nsew", padx=(0, 15))

        # 1.1 Time & Sales
        self.context_card = StyledCard(self.left_col, title="1. 业务目标设定", subtitle="指定日期范围与该期间的销售目标")
        self.context_card.pack(fill="x", pady=(0, 20))
        
        ctx_inner = ctk.CTkFrame(self.context_card, fg_color="transparent")
        ctx_inner.pack(fill="x", padx=20, pady=20)

        # Sales Input
        ctk.CTkLabel(ctx_inner, text="期间销售总额(万元):", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=5)
        self.sales_entry = ctk.CTkEntry(ctx_inner, placeholder_text="200", width=120)
        self.sales_entry.insert(0, "200")
        self.sales_entry.pack(side="left", padx=5)

        # 1.2 Shift Selection
        self.shift_card = StyledCard(self.left_col, title="2. 参与班次选择", subtitle="勾选此期间执行的固定班次")
        self.shift_card.pack(fill="x", pady=(0, 20))
        
        self.shift_container = ctk.CTkFrame(self.shift_card, fg_color="transparent")
        self.shift_container.pack(fill="x", padx=20, pady=20)
        self.load_shift_checkboxes()

        # RIGHT COLUMN
        self.right_col = ctk.CTkFrame(self.main_container, fg_color="transparent")
        self.right_col.grid(row=0, column=1, sticky="nsew", padx=(15, 0))

        # 2.1 Result Dashboard
        self.result_card = StyledCard(self.right_col, title="3. 测算分析透视", subtitle="匹配班次负载后的核心结论")
        self.result_card.pack(fill="x", pady=(0, 20))
        
        res_inner = ctk.CTkFrame(self.result_card, fg_color="transparent")
        res_inner.pack(fill="x", padx=20, pady=20)

        self.card_staff = MetricCard(res_inner, "建议总人力", "0", unit=" 人", icon="👥", color=("#1f538d", "#235ba0"))
        self.card_staff.pack(fill="x", pady=5)
        
        row_f = ctk.CTkFrame(res_inner, fg_color="transparent")
        row_f.pack(fill="x", pady=5)
        self.card_daily_c = MetricCard(row_f, "预估日均咨询", "0", icon="💬", color=("#3B8ED0", "#1F6AA5"))
        self.card_daily_c.pack(side="left", expand=True, fill="x", padx=(0, 5))
        self.card_hours = MetricCard(row_f, "日均需求工时", "0", unit="h", icon="⏰", color=("#3B8ED0", "#1F6AA5"))
        self.card_hours.pack(side="right", expand=True, fill="x", padx=(5, 0))

        self.calc_btn = ctk.CTkButton(self.right_col, text="⚡ 执行全量测算", height=50,
                                       font=ctk.CTkFont(size=16, weight="bold"),
                                       command=self.run_calculation)
        self.calc_btn.pack(fill="x", pady=10)

    def load_shift_checkboxes(self):
        for widget in self.shift_container.winfo_children(): widget.destroy()
        self.shift_vars = {}
        shifts = self.shift_model.get_all_active()
        for s in shifts:
            var = ctk.BooleanVar(value=True)
            ctk.CTkCheckBox(self.shift_container, text=f"{s[1]} ({s[3]}-{s[4]}, {s[5]}h)", variable=var).pack(anchor="w", pady=5)
            self.shift_vars[s[0]] = (var, s)

    def run_calculation(self):
        try:
            sales = float(self.sales_entry.get()) * 10000
            start = datetime.strptime(self.start_date.get(), "%Y-%m-%d")
            end = datetime.strptime(self.end_date.get(), "%Y-%m-%d")
            days = (end - start).days + 1
            if days <= 0: raise ValueError
        except ValueError:
            self.analysis_text.configure(text="❌ 请检查金额与日期格式(YYYY-MM-DD)", text_color="red")
            return

        event = self.event_menu.get()
        if event == "无活动": event = None
        selected_shifts = [data[1] for sid, data in self.shift_vars.items() if data[0].get()]
        
        res = self.calculator.calculate_with_shifts(sales, days=days, event_type=event, selected_shifts=selected_shifts)
        
        self.card_staff.update_value(res['needed_staff'])
        self.card_daily_c.update_value(f"{res['daily_consult']:.0f}")
        self.card_hours.update_value(f"{res['daily_hours']:.1f}")
        
        s = res['sensitivity']
        analysis = (
            f"💡 关键洞察：\n"
            f" • 时间跨度: {days} 天\n"
            f" • 选定班次平均工时: {res['avg_shift_hours']:.1f} 小时\n"
            f" • 优化打字速度 10% 可节省 {abs(s['打字速度']):.1f} 人\n"
            f" • 降低 10% 容错率可节省 {s['容错率']:.1f} 人"
        )
        self.analysis_text.configure(text=analysis, text_color=("#1f538d", "#d1d1d1"))
        self.last_res = res
        self.last_selected_shifts = selected_shifts

    def export_to_excel(self):
        if not hasattr(self, 'last_res'): self.run_calculation()
        file_path = filedialog.asksaveasfilename(defaultextension=".xlsx")
        if file_path:
            needed = self.last_res['needed_staff']
            shifts = self.last_selected_shifts
            data = [{"序号": i+1, "姓名": f"客服_{i+1}", "班次": shifts[i % len(shifts)][1], "时段": f"{shifts[i % len(shifts)][3]}-{shifts[i % len(shifts)][4]}"} for i in range(needed)]
            pd.DataFrame(data).to_excel(file_path, index=False)
            os.startfile(file_path)
