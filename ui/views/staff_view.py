import customtkinter as ctk
from database.models import StaffModel
from ui.components.styled_widgets import StyledCard, SectionHeader

class StaffView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.staff_model = StaffModel(db_manager)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=40, pady=(40, 20), sticky="ew")
        
        SectionHeader(self.header_frame, text="人员档案管理").pack(anchor="w")
        
        self.add_btn = ctk.CTkButton(self.header_frame, text="➕ 新增人员", command=self.show_add_dialog)
        self.add_btn.place(relx=1.0, rely=0.5, anchor="e")

        # Table Section
        self.table_card = StyledCard(self, title="人员列表")
        self.table_card.grid(row=1, column=0, sticky="nsew", padx=30, pady=(0, 30))
        
        self.content_frame = ctk.CTkScrollableFrame(self.table_card, fg_color="transparent")
        self.content_frame.pack(fill="both", expand=True, padx=20, pady=20)
        self.content_frame.grid_columnconfigure(0, weight=1)

        self.load_staff()

    def load_staff(self):
        for widget in self.content_frame.winfo_children():
            widget.destroy()

        staff_list = self.staff_model.get_all_active()
        
        # Table Header
        header_f = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        header_f.grid(row=0, column=0, sticky="ew", padx=10, pady=(0, 5))
        header_f.grid_columnconfigure((0,1,2,3), weight=1)

        cols = ["工号", "姓名", "人员类型", "入职日期"]
        for i, col in enumerate(cols):
            ctk.CTkLabel(header_f, text=col, font=ctk.CTkFont(weight="bold")).grid(row=0, column=i, padx=5, pady=5)

        for idx, s in enumerate(staff_list):
            s_id, s_no, s_name, s_type, s_phone, s_status, s_entry, s_remark, _ = s
            
            bg_color = "transparent" if idx % 2 == 0 else ("gray90", "gray20")
            row_f = ctk.CTkFrame(self.content_frame, fg_color=bg_color, corner_radius=5)
            row_f.grid(row=idx+1, column=0, sticky="ew", padx=10, pady=1)
            row_f.grid_columnconfigure((0,1,2,3), weight=1)

            ctk.CTkLabel(row_f, text=s_no).grid(row=0, column=0, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=s_name).grid(row=0, column=1, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=s_type).grid(row=0, column=2, padx=5, pady=5)
            ctk.CTkLabel(row_f, text=s_entry if s_entry else "-").grid(row=0, column=3, padx=5, pady=5)

    def show_add_dialog(self):
        dialog = ctk.CTkToplevel(self)
        dialog.title("新增人员")
        dialog.geometry("400x500")
        dialog.attributes("-topmost", True)

        ctk.CTkLabel(dialog, text="工号:").pack(padx=20, pady=(20, 5))
        no_entry = ctk.CTkEntry(dialog)
        no_entry.pack(padx=20, pady=5, fill="x")

        ctk.CTkLabel(dialog, text="姓名:").pack(padx=20, pady=5)
        name_entry = ctk.CTkEntry(dialog)
        name_entry.pack(padx=20, pady=5, fill="x")

        ctk.CTkLabel(dialog, text="人员类型 (正式/临时/外包):").pack(padx=20, pady=5)
        type_entry = ctk.CTkEntry(dialog)
        type_entry.pack(padx=20, pady=5, fill="x")
        type_entry.insert(0, "正式")

        ctk.CTkLabel(dialog, text="联系电话:").pack(padx=20, pady=5)
        phone_entry = ctk.CTkEntry(dialog)
        phone_entry.pack(padx=20, pady=5, fill="x")

        ctk.CTkLabel(dialog, text="入职日期 (yyyy-MM-dd):").pack(padx=20, pady=5)
        entry_date_entry = ctk.CTkEntry(dialog)
        entry_date_entry.pack(padx=20, pady=5, fill="x")

        def save():
            no = no_entry.get()
            name = name_entry.get()
            s_type = type_entry.get()
            phone = phone_entry.get()
            entry_date = entry_date_entry.get()
            
            if no and name:
                self.staff_model.add_staff(no, name, s_type, phone, entry_date)
                self.load_staff()
                dialog.destroy()
            else:
                print("Missing info")

        ctk.CTkButton(dialog, text="保存", command=save).pack(padx=20, pady=20)
