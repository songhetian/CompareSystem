import customtkinter as ctk
from database.models import HistoryDataModel, BudgetRecordModel
from tkinter import filedialog
import os
from ui.components.styled_widgets import StyledCard, SectionHeader, StyledButton, StyledEntry
from ui.design_system import Spacing, Colors, create_font, Typography, get_color, BorderRadius

class ReportView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.history_model = HistoryDataModel(db_manager)
        self.record_model = BudgetRecordModel(db_manager)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # --- Header & Toolbar ---
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=Spacing.HUGE, pady=(Spacing.HUGE, Spacing.LG), sticky="ew")
        self.header_frame.grid_columnconfigure(0, weight=1)

        SectionHeader(self.header_frame, text="历史记录与复盘").grid(row=0, column=0, sticky="w")

        # 统一工具栏
        self.toolbar = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        self.toolbar.grid(row=0, column=1, sticky="e")
        
        StyledButton(self.toolbar, text="📈 看看趋势", width=120, fg_color=Colors.INFO, 
                      command=self.show_trend_chart).pack(side="left", padx=5)
        StyledButton(self.toolbar, text="📥 导入以前的数据", width=120, fg_color=Colors.SUCCESS, 
                      command=self.show_import_dialog).pack(side="left", padx=5)
        StyledButton(self.toolbar, text="📤 导出成表格", width=120, fg_color=Colors.PRIMARY, 
                      command=self.export_history).pack(side="left", padx=5)

        # --- Tabs ---
        self.tabview = ctk.CTkTabview(self, fg_color=Colors.BG_PRIMARY,
                                     segmented_button_selected_color=Colors.PRIMARY,
                                     segmented_button_selected_hover_color=Colors.PRIMARY_HOVER)
        self.tabview.grid(row=1, column=0, sticky="nsew", padx=Spacing.XXXL, pady=(0, Spacing.XL))
        self.tab_history = self.tabview.add("以前的业务明细")
        self.tab_records = self.tabview.add("以前的测算方案")

        self.setup_history_tab()
        self.setup_records_tab()

    def setup_history_tab(self):
        self.tab_history.grid_columnconfigure(0, weight=1)
        self.tab_history.grid_rowconfigure(1, weight=1)
        
        # 表头下方删除按钮
        self.history_ctrl = ctk.CTkFrame(self.tab_history, fg_color="transparent")
        self.history_ctrl.grid(row=0, column=0, sticky="ew", padx=Spacing.LG, pady=Spacing.SM)
        self.delete_btn = StyledButton(self.history_ctrl, text="🗑️ 删除选中项", width=100, 
                                        fg_color=Colors.ERROR, command=self.delete_selected_history)
        self.delete_btn.pack(side="left")

        self.history_scroll = ctk.CTkScrollableFrame(self.tab_history, fg_color="transparent")
        self.history_scroll.grid(row=1, column=0, sticky="nsew", padx=Spacing.LG, pady=Spacing.SM)
        self.history_scroll.grid_columnconfigure(0, weight=1)
        self.load_history()

    def load_history(self):
        for widget in self.history_scroll.winfo_children(): widget.destroy()
        data = self.history_model.get_recent(limit=50)
        self.selected_history = {}

        # 现代居中表头
        header_f = ctk.CTkFrame(self.history_scroll, fg_color=Colors.BG_SECONDARY, corner_radius=BorderRadius.MD)
        header_f.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        
        cols = ["选择", "日期", "销售额(万)", "在岗人数", "咨询量", "转化率", "备注"]
        weights = [1, 2, 2, 2, 2, 2, 3]
        for i, col in enumerate(cols):
            header_f.grid_columnconfigure(i, weight=weights[i])
            ctk.CTkLabel(header_f, text=col, font=create_font(Typography.SIZE_BODY, weight="bold")).grid(row=0, column=i, pady=10)

        # 数据行
        for idx, row in enumerate(data):
            bg = Colors.BG_PRIMARY if idx % 2 == 0 else Colors.BG_TERTIARY
            row_f = ctk.CTkFrame(self.history_scroll, fg_color=bg, corner_radius=BorderRadius.SM)
            row_f.grid(row=idx+1, column=0, sticky="ew", pady=1)
            
            for i in range(len(cols)): row_f.grid_columnconfigure(i, weight=weights[i])
            
            var = ctk.BooleanVar(value=False); self.selected_history[row[0]] = var
            ctk.CTkCheckBox(row_f, text="", variable=var, width=20).grid(row=0, column=0, padx=10, sticky="ns")
            
            # 安全解析数值，防止 ValueError: Unknown format code 'f'
            try:
                sale_val = float(row[2]) if row[2] is not None else 0.0
                staff_val = int(row[3]) if row[3] is not None else 0
                consult_val = float(row[4]) if row[4] is not None else 0.0
                rate_val = float(row[5]) if row[5] is not None else 0.0
                
                vals = [
                    str(row[1]),                # 日期
                    f"{sale_val:,.1f}",        # 销售额
                    str(staff_val),             # 人员
                    f"{consult_val:,.0f}",      # 咨询
                    f"{rate_val*100:.1f}%",    # 转化率
                    str(row[6]) if row[6] else "-" # 备注
                ]
            except (ValueError, TypeError):
                vals = [str(row[1]), str(row[2]), str(row[3]), str(row[4]), str(row[5]), str(row[6]) or "-"]

            for i, val in enumerate(vals):
                ctk.CTkLabel(row_f, text=val, font=create_font(Typography.SIZE_BODY), anchor="center").grid(row=0, column=i+1, pady=8, sticky="ew")

    def center_dialog(self, dialog, width, height):
        self.update_idletasks()
        px, py, pw, ph = self.winfo_rootx(), self.winfo_rooty(), self.winfo_width(), self.winfo_height()
        x = px + (pw // 2) - (width // 2)
        y = py + (ph // 2) - (height // 2)
        dialog.geometry(f"{width}x{height}+{x}+{y}")

    def show_trend_chart(self):
        data = self.history_model.get_recent(limit=30)
        if data:
            win_w, win_h = 1000, 600
            win = TrendChartWindow(self, data)
            self.center_dialog(win, win_w, win_h)

    def show_import_dialog(self):
        win_w, win_h = 500, 500
        win = ImportDialog(self, self.history_model, self.load_history)
        self.center_dialog(win, win_w, win_h)

    def delete_selected_history(self):
        ids = [rid for rid, var in self.selected_history.items() if var.get()]
        for rid in ids: self.db_manager.execute_query("DELETE FROM history_biz_data WHERE id=?", (rid,))
        self.load_history()

    def export_history(self):
        import pandas as pd
        data = self.history_model.get_recent(limit=1000)
        if not data: return
        file_path = filedialog.asksaveasfilename(defaultextension=".xlsx")
        if file_path:
            df = pd.DataFrame(data, columns=["ID", "日期", "销售额", "人员", "咨询", "转化率", "备注", "记录时间"])
            df.to_excel(file_path, index=False)
            os.startfile(file_path)

    def setup_records_tab(self):
        self.records_scroll = ctk.CTkScrollableFrame(self.tab_records, fg_color="transparent")
        self.records_scroll.pack(fill="both", expand=True, padx=Spacing.LG, pady=Spacing.LG)
        self.records_scroll.grid_columnconfigure(0, weight=1)
        self.load_records()

    def load_records(self):
        for widget in self.records_scroll.winfo_children(): widget.destroy()
        records = self.db_manager.execute_query("SELECT * FROM budget_calc_record ORDER BY calc_time DESC LIMIT 50")
        
        header_f = ctk.CTkFrame(self.records_scroll, fg_color=Colors.BG_SECONDARY, corner_radius=BorderRadius.MD)
        header_f.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        cols = ["测算时间", "测算类型", "目标销售额", "咨询量", "所需人数", "总工时"]
        for i, col in enumerate(cols):
            header_f.grid_columnconfigure(i, weight=1)
            ctk.CTkLabel(header_f, text=col, font=create_font(Typography.SIZE_BODY, weight="bold")).grid(row=0, column=i, pady=10)

        for idx, row in enumerate(records):
            bg = Colors.BG_PRIMARY if idx % 2 == 0 else Colors.BG_TERTIARY
            row_f = ctk.CTkFrame(self.records_scroll, fg_color=bg, corner_radius=BorderRadius.SM)
            row_f.grid(row=idx+1, column=0, sticky="ew", pady=1)
            for i in range(len(cols)): row_f.grid_columnconfigure(i, weight=1)
            
            try:
                sale = float(row[2]) if row[2] is not None else 0.0
                consult = float(row[3]) if row[3] is not None else 0.0
                hours = float(row[4]) if row[4] is not None else 0.0
                vals = [row[9][:16], str(row[1]), f"{sale:,.0f}", f"{consult:,.0f}", str(row[6]), f"{hours:.1f}h"]
            except:
                vals = [str(row[9]), str(row[1]), str(row[2]), str(row[3]), str(row[6]), str(row[4])]

            for i, v in enumerate(vals):
                ctk.CTkLabel(row_f, text=v, font=create_font(Typography.SIZE_BODY), anchor="center").grid(row=0, column=i, pady=8, sticky="ew")

class ImportDialog(ctk.CTkToplevel):
    def __init__(self, parent, model, callback):
        super().__init__(parent)
        self.title("专业数据导入中心")
        self.geometry("500x450")
        self.attributes("-topmost", True)
        self.transient(parent); self.grab_set()
        self.configure(fg_color=Colors.BG_PRIMARY)

        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=30, pady=30)
        
        SectionHeader(main, text="📥 批量业务数据导入").pack(anchor="w", pady=(0, 20))
        
        card = StyledCard(main, title="操作指南", subtitle="请先下载标准模板，填写完成后上传")
        card.pack(fill="x", pady=(0, 20))
        
        btn_f = ctk.CTkFrame(card, fg_color="transparent")
        btn_f.pack(padx=20, pady=20, fill="x")
        
        StyledButton(btn_f, text="⬇️ 第一步：下载 Excel 模板", fg_color=Colors.SECONDARY, 
                      command=self.download).pack(fill="x", pady=5)
        StyledButton(btn_f, text="📂 第二步：选择并上传文件", fg_color=Colors.PRIMARY, 
                      command=lambda: self.upload(model, callback)).pack(fill="x", pady=5)

    def download(self):
        import pandas as pd
        file_path = filedialog.asksaveasfilename(defaultextension=".xlsx")
        if file_path:
            pd.DataFrame(columns=["日期(YYYY-MM-DD)", "销售额(万)", "实际在岗人数", "咨询量", "转化率(0-1)", "备注"]).to_excel(file_path, index=False)
            os.startfile(file_path)

    def upload(self, model, callback):
        import pandas as pd
        path = filedialog.askopenfilename(filetypes=[("Excel", "*.xlsx")])
        if path:
            try:
                df = pd.read_excel(path)
                if df.empty: return
                for _, r in df.iterrows():
                    try:
                        date = str(r.iloc[0]) if pd.notnull(r.iloc[0]) else ""
                        sale = float(r.iloc[1]) if pd.notnull(r.iloc[1]) else 0.0
                        staff = int(r.iloc[2]) if pd.notnull(r.iloc[2]) else 0
                        consult = float(r.iloc[3]) if pd.notnull(r.iloc[3]) else 0.0
                        rate = float(r.iloc[4]) if pd.notnull(r.iloc[4]) else 0.0
                        rem = str(r.iloc[5]) if pd.notnull(r.iloc[5]) else ""
                        if date and date != "nan":
                            model.add_data(date, sale, staff, consult, rate, rem)
                    except: continue
                callback()
                self.destroy()
            except Exception as e: print(f"Upload error: {e}")

class TrendChartWindow(ctk.CTkToplevel):
    def __init__(self, parent, data):
        super().__init__(parent)
        self.title("多维业务趋势仿真")
        self.geometry("1000x600")
        self.attributes("-topmost", True)
        self.transient(parent); self.grab_set()
        
        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=20, pady=20)
        SectionHeader(main, text="📈 业务规模与人力效率趋势分析").pack(anchor="w", pady=(0, 20))
        
        card = StyledCard(main, title="双轴趋势图", subtitle="蓝色: 销售额(万) | 绿色: 在岗人数")
        card.pack(fill="both", expand=True)
        
        import tkinter as tk
        canvas = tk.Canvas(card, bg="#1e1e1e", highlightthickness=0)
        canvas.pack(fill="both", expand=True, padx=20, pady=20)
        
        def draw():
            canvas.delete("all")
            w, h = canvas.winfo_width(), canvas.winfo_height()
            if w < 100 or h < 100: return
            ml, mr, mt, mb = 60, 60, 40, 60
            cw, ch = w - ml - mr, h - mt - mb
            
            d_rev = list(reversed(data))
            dates = [d[1] for d in d_rev]
            sales = [float(d[2]) if d[2] is not None else 0.0 for d in d_rev]
            staff = [float(d[3]) if d[3] is not None else 0.0 for d in d_rev]
            
            max_sale = max(sales) if sales else 1
            max_staff = max(staff) if staff else 1
            dx = cw / (len(sales)-1) if len(sales)>1 else cw
            
            for i in range(5):
                y = mt + ch - (ch/4)*i
                canvas.create_line(ml, y, w-mr, y, fill="#333", dash=(2,2))

            def plot(vals, color, mx, width=3):
                pts = []
                for i, v in enumerate(vals):
                    px = ml + i*dx
                    py = mt + ch - (v/mx)*ch if mx>0 else mt+ch
                    pts.extend([px, py])
                    canvas.create_oval(px-3, py-3, px+3, py+3, fill=color, outline="")
                canvas.create_line(pts, fill=color, width=width, smooth=True)

            plot(sales, get_color(Colors.PRIMARY), max_sale)
            plot(staff, "#10b981", max_staff, width=2)
            
            for i, d in enumerate(dates):
                if i % max(1, len(dates)//10) == 0:
                    px = ml + i*dx
                    canvas.create_text(px, h-mb+20, text=d, fill="#888", font=("Arial", 8), angle=45)

        canvas.after(100, draw); canvas.bind("<Configure>", lambda e: draw())
