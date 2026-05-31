import customtkinter as ctk
from database.models import HistoryDataModel, BudgetRecordModel
import pandas as pd
from tkinter import filedialog
import os

class ReportView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.history_model = HistoryDataModel(db_manager)
        self.record_model = BudgetRecordModel(db_manager)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")
        self.header_frame.grid_columnconfigure(0, weight=1)

        self.header = ctk.CTkLabel(self.header_frame, text="数据报表与复盘", font=ctk.CTkFont(size=24, weight="bold"))
        self.header.grid(row=0, column=0, sticky="w")

        self.export_history_btn = ctk.CTkButton(self.header_frame, text="📊 导出报表", 
                                                fg_color="#1f538d", command=self.export_history)
        self.export_history_btn.grid(row=0, column=1, sticky="e", padx=10)

        self.add_btn = ctk.CTkButton(self.header_frame, text="导入历史数据", command=self.show_import_dialog)
        self.add_btn.grid(row=0, column=2, sticky="e")

        # Tabs for different reports
        self.tabview = ctk.CTkTabview(self)
        self.tabview.grid(row=1, column=0, sticky="nsew", padx=20, pady=10)
        self.tab_history = self.tabview.add("历史业务数据")
        self.tab_records = self.tabview.add("预算测算记录")

        self.setup_history_tab()
        self.setup_records_tab()

    def export_history(self):
        data = self.history_model.get_recent(limit=1000)
        if not data: return
        
        file_path = filedialog.asksaveasfilename(defaultextension=".xlsx", 
                                                 filetypes=[("Excel files", "*.xlsx")])
        if file_path:
            # history_biz_data rows usually: id, data_date, sales_volume, actual_staff, actual_consult, remark, create_time
            df = pd.DataFrame(data, columns=["ID", "日期", "销售额", "实际在岗人数", "咨询量", "备注", "创建时间"])
            try:
                df.to_excel(file_path, index=False)
                os.startfile(file_path)
            except Exception as e:
                print(f"Export history error: {e}")

    def setup_history_tab(self):
        self.tab_history.grid_columnconfigure(0, weight=1)
        self.tab_history.grid_rowconfigure(1, weight=1)
        
        # Controls frame
        self.history_controls = ctk.CTkFrame(self.tab_history, fg_color="transparent")
        self.history_controls.grid(row=0, column=0, sticky="ew", padx=10, pady=5)
        
        self.delete_btn = ctk.CTkButton(self.history_controls, text="🗑️ 删除选中", fg_color="#c0392b", command=self.delete_selected_history)
        self.delete_btn.pack(side="right", padx=5)

        self.history_scroll = ctk.CTkScrollableFrame(self.tab_history, fg_color="transparent")
        self.history_scroll.grid(row=1, column=0, sticky="nsew")
        self.load_history()

    def load_history(self):
        for widget in self.history_scroll.winfo_children():
            widget.destroy()
        
        data = self.history_model.get_recent(limit=50)
        self.selected_history = {} # ID -> BooleanVar

        header_f = ctk.CTkFrame(self.history_scroll, fg_color="transparent")
        header_f.grid(row=0, column=0, sticky="ew", padx=10, pady=(0, 5))
        header_f.grid_columnconfigure((1,2,3,4), weight=1)

        ctk.CTkLabel(header_f, text="选择", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, padx=5, pady=5)
        for i, col in enumerate(["日期", "销售额", "实际在岗人数", "备注"]):
            ctk.CTkLabel(header_f, text=col, font=ctk.CTkFont(weight="bold")).grid(row=0, column=i+1, padx=5, pady=5)

        for idx, row in enumerate(data):
            row_id = row[0]
            bg_color = "transparent" if idx % 2 == 0 else ("gray90", "gray20")
            row_f = ctk.CTkFrame(self.history_scroll, fg_color=bg_color, corner_radius=5)
            row_f.grid(row=idx+1, column=0, sticky="ew", padx=10, pady=1)
            row_f.grid_columnconfigure((1,2,3,4), weight=1)
            
            var = ctk.BooleanVar(value=False)
            self.selected_history[row_id] = var
            ctk.CTkCheckBox(row_f, text="", variable=var, width=20).grid(row=0, column=0, padx=5, pady=5)
            
            ctk.CTkLabel(row_f, text=row[1]).grid(row=0, column=1, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=f"{row[2]:,.2f}").grid(row=0, column=2, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=str(row[3])).grid(row=0, column=3, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=row[5] if row[5] else "-").grid(row=0, column=4, padx=5, pady=5)

    def delete_selected_history(self):
        ids_to_delete = [row_id for row_id, var in self.selected_history.items() if var.get()]
        for row_id in ids_to_delete:
            self.db_manager.execute_query("DELETE FROM history_biz_data WHERE id=?", (row_id,))
        self.load_history()

    def setup_records_tab(self):
        self.tab_records.grid_columnconfigure(0, weight=1)
        self.tab_records.grid_rowconfigure(0, weight=1)
        self.records_scroll = ctk.CTkScrollableFrame(self.tab_records, fg_color="transparent")
        self.records_scroll.grid(row=0, column=0, sticky="nsew")
        self.load_records()

    def load_records(self):
        for widget in self.records_scroll.winfo_children():
            widget.destroy()
        
        records = self.db_manager.execute_query("SELECT * FROM budget_calc_record ORDER BY calc_time DESC LIMIT 50")
        
        header_f = ctk.CTkFrame(self.records_scroll, fg_color="transparent")
        header_f.grid(row=0, column=0, sticky="ew", padx=10, pady=(0, 5))
        header_f.grid_columnconfigure((0,1,2,3,4,5), weight=1)

        cols = ["测算时间", "测算类型", "目标销售额", "咨询量", "所需人数", "总工时"]
        for i, col in enumerate(cols):
            ctk.CTkLabel(header_f, text=col, font=ctk.CTkFont(weight="bold")).grid(row=0, column=i, padx=5, pady=5)

        for idx, row in enumerate(records):
            bg_color = "transparent" if idx % 2 == 0 else ("gray90", "gray20")
            row_f = ctk.CTkFrame(self.records_scroll, fg_color=bg_color, corner_radius=5)
            row_f.grid(row=idx+1, column=0, sticky="ew", padx=10, pady=1)
            row_f.grid_columnconfigure((0,1,2,3,4,5), weight=1)
            
            ctk.CTkLabel(row_f, text=row[9][:16]).grid(row=0, column=0, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=row[1]).grid(row=0, column=1, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=f"{row[2]:,.0f}").grid(row=0, column=2, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=f"{row[3]:.0f}").grid(row=0, column=3, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=str(row[6])).grid(row=0, column=4, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=f"{row[4]:.1f}h").grid(row=0, column=5, padx=5, pady=5)

    def show_import_dialog(self):
        dialog = ctk.CTkToplevel(self)
        dialog.title("导入历史业务数据")
        dialog.geometry("400x400")
        dialog.attributes("-topmost", True)

        ctk.CTkLabel(dialog, text="日期 (yyyy-MM):").pack(padx=20, pady=(20, 5))
        date_entry = ctk.CTkEntry(dialog)
        date_entry.pack(padx=20, pady=5, fill="x")

        ctk.CTkLabel(dialog, text="月度总销售额:").pack(padx=20, pady=5)
        sales_entry = ctk.CTkEntry(dialog)
        sales_entry.pack(padx=20, pady=5, fill="x")

        ctk.CTkLabel(dialog, text="实际在岗人数:").pack(padx=20, pady=5)
        staff_entry = ctk.CTkEntry(dialog)
        staff_entry.pack(padx=20, pady=5, fill="x")

        def save():
            date = date_entry.get()
            try:
                sales = float(sales_entry.get())
                staff = int(staff_entry.get())
                self.history_model.add_data(date, sales, staff)
                self.load_history()
                dialog.destroy()
            except ValueError:
                print("Invalid data")

        ctk.CTkButton(dialog, text="保存", command=save).pack(padx=20, pady=20)
