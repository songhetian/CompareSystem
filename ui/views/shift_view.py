import customtkinter as ctk
from database.models import ShiftModel
from ui.components.styled_widgets import StyledCard, SectionHeader, StyledButton, StyledEntry
from ui.components.datetime_pickers import TimePicker
from ui.design_system import Spacing, Colors, create_font, Typography, BorderRadius
from datetime import datetime

class ShiftView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.shift_model = ShiftModel(db_manager)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=Spacing.HUGE, pady=(Spacing.HUGE, Spacing.XL), sticky="ew")
        
        SectionHeader(self.header_frame, text="排班室(班次设置)").pack(anchor="w")
        ctk.CTkLabel(self.header_frame, text="在这里配置你平时在用的上班时间，测算时直接勾选即可",
                     text_color=Colors.TEXT_SECONDARY, font=create_font(Typography.SIZE_BODY)).pack(anchor="w")
        
        self.add_btn = StyledButton(self.header_frame, text="➕ 新增上班时间", command=self.show_add_dialog)
        self.add_btn.place(relx=1.0, rely=0.5, anchor="e")

        # Table Section
        self.table_card = StyledCard(self, title="班次列表")
        self.table_card.grid(row=1, column=0, sticky="nsew", padx=Spacing.XXXL, pady=(0, Spacing.XXXL))
        
        self.content_frame = ctk.CTkScrollableFrame(self.table_card, fg_color="transparent")
        self.content_frame.pack(fill="both", expand=True, padx=Spacing.LG, pady=Spacing.LG)
        self.content_frame.grid_columnconfigure(0, weight=1)

        self.load_shifts()

    def load_shifts(self):
        for widget in self.content_frame.winfo_children():
            widget.destroy()

        shifts = self.shift_model.get_all_active()
        
        # Table Header
        header_f = ctk.CTkFrame(self.content_frame, fg_color=Colors.BG_SECONDARY, corner_radius=5)
        header_f.grid(row=0, column=0, sticky="ew", padx=10, pady=(0, 5))
        header_f.grid_columnconfigure((0,1,2,3,4,5,6), weight=1)

        cols = ["班次名称", "类型", "开始时间", "结束时间", "休息时长", "有效工时", "操作"]
        weights = [2, 2, 2, 2, 2, 2, 2]
        for i, col in enumerate(cols):
            header_f.grid_columnconfigure(i, weight=weights[i])
            ctk.CTkLabel(header_f, text=col, font=create_font(Typography.SIZE_BODY, weight=Typography.WEIGHT_BOLD)).grid(row=0, column=i, pady=10)

        for idx, s in enumerate(shifts):
            # s: id(0), name(1), type(2), start(3), end(4), hours(5), status(6), remark(7), create(8), update(9), rest_hours(10)
            s_id, s_name, s_type, s_start, s_end, s_hours, _, _, _, _, s_rest = s
            
            bg_color = Colors.BG_PRIMARY if idx % 2 == 0 else Colors.BG_TERTIARY
            row_f = ctk.CTkFrame(self.content_frame, fg_color=bg_color, corner_radius=BorderRadius.SM)
            row_f.grid(row=idx+1, column=0, sticky="ew", pady=1)
            
            for i in range(len(cols)): row_f.grid_columnconfigure(i, weight=weights[i])

            # 居中对齐所有文字内容
            ctk.CTkLabel(row_f, text=s_name, font=create_font(Typography.SIZE_BODY)).grid(row=0, column=0, pady=8)
            ctk.CTkLabel(row_f, text=s_type, font=create_font(Typography.SIZE_BODY)).grid(row=0, column=1, pady=8)
            ctk.CTkLabel(row_f, text=s_start, font=create_font(Typography.SIZE_BODY)).grid(row=0, column=2, pady=8)
            ctk.CTkLabel(row_f, text=s_end, font=create_font(Typography.SIZE_BODY)).grid(row=0, column=3, pady=8)
            ctk.CTkLabel(row_f, text=f"{s_rest}h", font=create_font(Typography.SIZE_BODY)).grid(row=0, column=4, pady=8)
            ctk.CTkLabel(row_f, text=f"{s_hours}h", font=create_font(Typography.SIZE_BODY)).grid(row=0, column=5, pady=8)
            
            # 操作按钮组
            btn_f = ctk.CTkFrame(row_f, fg_color="transparent")
            btn_f.grid(row=0, column=6, pady=5)
            
            StyledButton(btn_f, text="✎", width=30, height=24, fg_color=Colors.INFO, 
                          command=lambda data=s: self.show_edit_dialog(data)).pack(side="left", padx=2)
            StyledButton(btn_f, text="🗑", width=30, height=24, fg_color=Colors.ERROR, 
                          command=lambda sid=s_id: self.confirm_delete(sid)).pack(side="left", padx=2)

    def confirm_delete(self, shift_id):
        from tkinter import messagebox
        if messagebox.askyesno("确认删除", "确定要删除该班次配置吗？\n删除后将不再出现在测算列表中。"):
            self.shift_model.delete_shift(shift_id)
            self.load_shifts()

    def show_add_dialog(self):
        self.show_shift_dialog()

    def show_edit_dialog(self, data):
        self.show_shift_dialog(edit_data=data)

    def center_dialog(self, dialog, width, height):
        """将弹窗居中显示在父窗口"""
        self.update_idletasks()
        parent_x = self.winfo_rootx()
        parent_y = self.winfo_rooty()
        parent_w = self.winfo_width()
        parent_h = self.winfo_height()
        
        x = parent_x + (parent_w // 2) - (width // 2)
        y = parent_y + (parent_h // 2) - (height // 2)
        dialog.geometry(f"{width}x{height}+{x}+{y}")

    def show_shift_dialog(self, edit_data=None):
        dialog = ctk.CTkToplevel(self)
        dialog.title("编辑班次" if edit_data else "新增班次")
        win_w, win_h = 500, 750
        dialog.attributes("-topmost", True)
        dialog.configure(fg_color=Colors.BG_PRIMARY)
        dialog.transient(self); dialog.grab_set()
        
        self.center_dialog(dialog, win_w, win_h)

        container = ctk.CTkFrame(dialog, fg_color="transparent")
        container.pack(padx=40, pady=30, fill="both", expand=True)

        # 1. 班次名称
        ctk.CTkLabel(container, text="班次名称:", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        name_entry = StyledEntry(container, placeholder_text="如: 早班 / 晚班")
        name_entry.pack(fill="x", pady=(0, 15))

        # 2. 班次类型
        ctk.CTkLabel(container, text="类型 (日常/周末/大促):", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        type_entry = StyledEntry(container)
        type_entry.pack(fill="x", pady=(0, 15))

        # 3. 开始时间
        ctk.CTkLabel(container, text="🕘 开始上班时间:", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        start_picker = TimePicker(container)
        start_picker.pack(fill="x", pady=(0, 15))

        # 4. 结束时间
        ctk.CTkLabel(container, text="🕘 结束下班时间:", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        end_picker = TimePicker(container)
        end_picker.pack(fill="x", pady=(0, 15))

        # 5. 休息时长
        ctk.CTkLabel(container, text="☕ 中途休息总时长 (小时):", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        rest_entry = StyledEntry(container)
        rest_entry.pack(fill="x", pady=(0, 15))

        # 6. 有效工时
        ctk.CTkLabel(container, text="📝 系统计算有效工时 (h):", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w", pady=(0, 5))
        hours_entry = StyledEntry(container)
        hours_entry.pack(fill="x", pady=(0, 30))

        # --- 设置初始值 ---
        if edit_data:
            name_entry.insert(0, edit_data[1])
            type_entry.insert(0, edit_data[2])
            start_picker.set_time(edit_data[3])
            end_picker.set_time(edit_data[4])
            rest_val = str(edit_data[10]) if len(edit_data) > 10 else "1.0"
            rest_entry.insert(0, rest_val)
        else:
            type_entry.insert(0, "日常")
            start_picker.set_time("09:00")
            end_picker.set_time("18:00")
            rest_entry.insert(0, "1.0")

        # --- 延迟绑定回调，防止初始化时崩溃 ---
        update_func = lambda _: self._update_hours(start_picker, end_picker, rest_entry, hours_entry)
        start_picker.callback = update_func
        end_picker.callback = update_func
        rest_entry.bind("<KeyRelease>", update_func)

        # 初始计算一次
        self._update_hours(start_picker, end_picker, rest_entry, hours_entry)

        def save():
            name = name_entry.get().strip()
            s_type = type_entry.get().strip()
            start = start_picker.get_time()
            end = end_picker.get_time()
            try:
                hours = float(hours_entry.get())
                rest = float(rest_entry.get())
                if name:
                    if edit_data:
                        self.shift_model.update_shift(edit_data[0], name, s_type, start, end, hours, rest_hours=rest)
                    else:
                        self.shift_model.add_shift(name, s_type, start, end, hours, rest_hours=rest)
                    self.load_shifts()
                    dialog.destroy()
                else: print("Error: Name required")
            except ValueError: print("Error: Invalid values")

        StyledButton(container, text="💾 确认并保存配置", height=50, command=save).pack(fill="x", pady=10)

    def _update_hours(self, start_p, end_p, rest_e, hours_e):
        try:
            fmt = "%H:%M"
            t1 = datetime.strptime(start_p.get_time(), fmt)
            t2 = datetime.strptime(end_p.get_time(), fmt)
            
            delta = t2 - t1
            total_h = delta.total_seconds() / 3600.0
            if total_h < 0: total_h += 24 # Handle cross-day
            
            try:
                rest_h = float(rest_e.get())
            except:
                rest_h = 0.0
                
            effective_h = max(0, total_h - rest_h)
            hours_e.delete(0, "end")
            hours_e.insert(0, f"{effective_h:.1f}")
        except Exception as e:
            print(f"Update hours error: {e}")
