import customtkinter as ctk
from database.models import ParamModel
from ui.components.styled_widgets import StyledCard, SectionHeader, PrecisionSlider

class ParamView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.param_model = ParamModel(db_manager)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header Area
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=40, pady=(40, 10), sticky="ew")
        SectionHeader(self.header_frame, text="参数仿真实验中心").grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(self.header_frame, text="支持滑动微调与精确数值输入，实时保存测算基准", 
                     text_color="gray", font=ctk.CTkFont(size=14)).grid(row=1, column=0, sticky="w")

        # Scrollable Content
        self.scroll_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.scroll_frame.grid(row=1, column=0, sticky="nsew", padx=30, pady=10)
        self.scroll_frame.grid_columnconfigure(0, weight=1)

        self.controls = {}
        self.load_params()

        # Bottom Action Bar
        self.bottom_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.bottom_frame.grid(row=2, column=0, padx=40, pady=20, sticky="ew")
        self.bottom_frame.grid_columnconfigure(0, weight=1)

        self.save_btn = ctk.CTkButton(self.bottom_frame, text="🚀 同步并应用新基准", height=50, width=220,
                                       font=ctk.CTkFont(size=15, weight="bold"), command=self.save_params)
        self.save_btn.grid(row=0, column=1, sticky="e")

    def load_params(self):
        for widget in self.scroll_frame.winfo_children():
            widget.destroy()
        self.controls = {}

        params = self.param_model.get_all()
        categories = {}
        icons = {"核心变量": "🎯", "能力建模": "🧠", "容错损耗": "🛡️", "专项大促": "🔥"}
        
        for p in params:
            cat = p[5]
            if cat not in categories: categories[cat] = []
            categories[cat].append(p)

        for cat, p_list in categories.items():
            icon = icons.get(cat, "📂")
            cat_card = StyledCard(self.scroll_frame, title=f"{icon} {cat}")
            cat_card.grid(row=len(self.scroll_frame.winfo_children()), column=0, sticky="ew", padx=10, pady=10)
            
            for i, p in enumerate(p_list):
                p_id, p_name, p_key, p_val, p_desc, p_cat, p_time = p
                
                p_min, p_max, p_steps, p_unit = 0.0, 5.0, 50, ""
                if "打字速度" in p_name: p_min, p_max, p_steps, p_unit = 10, 200, 19, " 字/分"
                elif "时长" in p_name: p_min, p_max, p_steps, p_unit = 0.1, 20.0, 199, " 分"
                elif "客单价" in p_name: p_min, p_max, p_steps, p_unit = 10, 5000, 499, " 元"
                elif "熟练度" in p_name or "系数" in p_name or "率" in p_name or "占比" in p_name or "损耗" in p_name or "预警" in p_name or "严苛度" in p_name:
                    p_min, p_max, p_steps, p_unit = 0.0, 3.0, 60, ""
                
                control = PrecisionSlider(cat_card, p_name, p_min, p_max, p_val, unit=p_unit, steps=p_steps)
                control.grid(row=i+1, column=0, sticky="ew", padx=20, pady=12)
                
                # Description Tooltip (Static label for now)
                ctk.CTkLabel(cat_card, text=f"ⓘ {p_desc}", font=ctk.CTkFont(size=11), text_color="gray").grid(row=i+1, column=0, sticky="e", padx=160)
                
                self.controls[p_key] = control

    def save_params(self):
        for key, control in self.controls.items():
            self.param_model.update_param(key, control.get())
        
        self.save_btn.configure(text="✨ 全局基准已固化", fg_color="#28a745")
        self.after(2000, lambda: self.save_btn.configure(text="🚀 同步并应用新基准", fg_color=["#3B8ED0", "#1F6AA5"]))
