import customtkinter as ctk
from database.models import ShiftModel
from ui.components.styled_widgets import StyledCard, SectionHeader

class ShiftView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.shift_model = ShiftModel(db_manager)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=40, pady=(40, 20), sticky="ew")
        
        SectionHeader(self.header_frame, text="班次配置管理").pack(anchor="w")
        
        self.add_btn = ctk.CTkButton(self.header_frame, text="➕ 新增班次", command=self.show_add_dialog)
        self.add_btn.place(relx=1.0, rely=0.5, anchor="e")

        # Table Section
        self.table_card = StyledCard(self, title="班次列表")
        self.table_card.grid(row=1, column=0, sticky="nsew", padx=30, pady=(0, 30))
        
        self.content_frame = ctk.CTkScrollableFrame(self.table_card, fg_color="transparent")
        self.content_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)
        self.content_frame.grid_columnconfigure(0, weight=1)

        self.load_shifts()

    def load_shifts(self):
        for widget in self.content_frame.winfo_children():
            widget.destroy()

        shifts = self.shift_model.get_all_active()
        
        # Table Header
        header_f = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        header_f.grid(row=0, column=0, sticky="ew", padx=10, pady=(0, 5))
        header_f.grid_columnconfigure((0,1,2,3,4), weight=1)

        cols = ["班次名称", "类型", "开始时间", "结束时间", "工作时长"]
        for i, col in enumerate(cols):
            ctk.CTkLabel(header_f, text=col, font=ctk.CTkFont(weight="bold")).grid(row=0, column=i, padx=5, pady=5)

        for idx, s in enumerate(shifts):
            s_id, s_name, s_type, s_start, s_end, s_hours, s_status, s_remark, _, _ = s
            
            bg_color = "transparent" if idx % 2 == 0 else ("gray90", "gray20")
            row_f = ctk.CTkFrame(self.content_frame, fg_color=bg_color, corner_radius=5)
            row_f.grid(row=idx+1, column=0, sticky="ew", padx=10, pady=1)
            row_f.grid_columnconfigure((0,1,2,3,4), weight=1)

            ctk.CTkLabel(row_f, text=s_name).grid(row=0, column=0, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=s_type).grid(row=0, column=1, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=s_start).grid(row=0, column=2, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=s_end).grid(row=0, column=3, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=f"{s_hours}h").grid(row=0, column=4, padx=5, pady=5)

    def show_add_dialog(self):
        dialog = ctk.CTkToplevel(self)
        dialog.title("新增班次")
        dialog.geometry("400x500")
        dialog.attributes("-topmost", True)

        ctk.CTkLabel(dialog, text="班次名称:").pack(padx=20, pady=(20, 5))
        name_entry = ctk.CTkEntry(dialog)
        name_entry.pack(padx=20, pady=5, fill="x")

        ctk.CTkLabel(dialog, text="类型 (日常/周末/大促):").pack(padx=20, pady=5)
        type_entry = ctk.CTkEntry(dialog)
        type_entry.pack(padx=20, pady=5, fill="x")
        type_entry.insert(0, "日常")

        ctk.CTkLabel(dialog, text="开始时间 (HH:mm):").pack(padx=20, pady=5)
        start_entry = ctk.CTkEntry(dialog)
        start_entry.pack(padx=20, pady=5, fill="x")
        start_entry.insert(0, "09:00")

        ctk.CTkLabel(dialog, text="结束时间 (HH:mm):").pack(padx=20, pady=5)
        end_entry = ctk.CTkEntry(dialog)
        end_entry.pack(padx=20, pady=5, fill="x")
        end_entry.insert(0, "18:00")

        ctk.CTkLabel(dialog, text="有效工时 (h):").pack(padx=20, pady=5)
        hours_entry = ctk.CTkEntry(dialog)
        hours_entry.pack(padx=20, pady=5, fill="x")
        hours_entry.insert(0, "8.0")

        def save():
            name = name_entry.get()
            s_type = type_entry.get()
            start = start_entry.get()
            end = end_entry.get()
            try:
                hours = float(hours_entry.get())
                self.shift_model.add_shift(name, s_type, start, end, hours)
                self.load_shifts()
                dialog.destroy()
            except ValueError:
                print("Invalid hours")

        ctk.CTkButton(dialog, text="保存", command=save).pack(padx=20, pady=20)
