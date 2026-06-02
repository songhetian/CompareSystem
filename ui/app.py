import customtkinter as ctk
from database.db_manager import DatabaseManager
from database.models import ParamModel
from .views.shift_view import ShiftView
from .views.param_view import ParamView
from .views.budget_view import BudgetView
from .views.report_view import ReportView
from .views.promotion_view import PromotionView

from .theme_manager import load_theme, apply_theme
from ui.design_system import Colors, Spacing, Typography, create_font, get_color, BorderRadius

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("电商客服人力预算系统 (固定班次版)")
        self.geometry("1200x800")
        self.minsize(1000, 700)

        # Apply persisted theme
        initial_theme = load_theme()
        ctk.set_appearance_mode(initial_theme)
        ctk.set_default_color_theme("blue")

        # Initialize Database and Defaults
        self.db_manager = DatabaseManager()
        self.param_model = ParamModel(self.db_manager)
        self.param_model.init_default_params()

        # set grid layout 1x2
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # create navigation frame
        self.navigation_frame = ctk.CTkFrame(self, corner_radius=0, fg_color=Colors.BG_SECONDARY)
        self.navigation_frame.grid(row=0, column=0, sticky="nsew")
        self.navigation_frame.grid_rowconfigure(6, weight=1)

        self.navigation_frame_label = ctk.CTkLabel(self.navigation_frame, text="🧠 客服人力精算",
                                                 font=create_font(22, weight="bold"),
                                                 text_color=Colors.PRIMARY)
        self.navigation_frame_label.grid(row=0, column=0, padx=20, pady=30)

        # Navigation Buttons (Removed Staff)
        self.btn_budget = self.create_nav_button("📊 测算工作室", 1, self.btn_budget_event)
        self.btn_shift = self.create_nav_button("📅 排班室(班次)", 2, self.btn_shift_event)
        self.btn_promo = self.create_nav_button("🔥 活动规划", 3, self.btn_promo_event)
        self.btn_param = self.create_nav_button("⚙️ 测算模板(调参)", 4, self.btn_param_event)
        self.btn_report = self.create_nav_button("📉 历史记录(报表)", 5, self.btn_report_event)

        self.appearance_mode_menu = ctk.CTkOptionMenu(self.navigation_frame,
                                                     values=["Light", "Dark", "System"],
                                                     font=create_font(Typography.SIZE_BODY, weight="bold"),
                                                     fg_color=Colors.BG_PRIMARY,
                                                     button_color=Colors.PRIMARY,
                                                     button_hover_color=Colors.PRIMARY_HOVER,
                                                     text_color=Colors.TEXT_PRIMARY,
                                                     command=self.change_appearance_mode_event)
        self.appearance_mode_menu.grid(row=8, column=0, padx=20, pady=20, sticky="s")
        self.appearance_mode_menu.set(initial_theme)

        # create frames (Lazy Loading - 启动时仅加载首页)
        self.home_frame = BudgetView(self, self.db_manager)
        self.shift_frame = None
        self.promo_frame = None
        self.param_frame = None
        self.report_frame = None

        # select default frame
        self.select_frame_by_name("budget")

    def create_nav_button(self, text, row, command):
        btn = ctk.CTkButton(self.navigation_frame, corner_radius=BorderRadius.MD, height=45, border_spacing=15, text=text,
                            fg_color="transparent", text_color=Colors.TEXT_PRIMARY,
                            hover_color=Colors.BG_TERTIARY,
                            anchor="w", font=create_font(14, weight="bold"), command=command)
        btn.grid(row=row, column=0, sticky="ew", padx=10, pady=2)
        return btn

    def select_frame_by_name(self, name):
        # 1. 动态初始化视图 (Lazy Instantiation)
        if name == "shift" and self.shift_frame is None:
            self.shift_frame = ShiftView(self, self.db_manager)
        elif name == "promo" and self.promo_frame is None:
            self.promo_frame = PromotionView(self, self.db_manager)
        elif name == "param" and self.param_frame is None:
            self.param_frame = ParamView(self, self.db_manager)
        elif name == "report" and self.report_frame is None:
            self.report_frame = ReportView(self, self.db_manager)

        # 2. 更新按钮颜色
        buttons = [
            (self.btn_budget, "budget"), 
            (self.btn_shift, "shift"), 
            (self.btn_promo, "promo"), 
            (self.btn_param, "param"), 
            (self.btn_report, "report")
        ]
        
        for btn, n in buttons:
            if n == name:
                btn.configure(
                    fg_color=Colors.PRIMARY, 
                    text_color=Colors.TEXT_INVERSE,
                    hover_color=Colors.PRIMARY_HOVER
                )
            else:
                btn.configure(
                    fg_color="transparent", 
                    text_color=Colors.TEXT_PRIMARY,
                    hover_color=Colors.BG_TERTIARY
                )

        # 3. 显示/隐藏视图 (安全处理未初始化的视图)
        frames = [
            (self.home_frame, "budget"), 
            (self.shift_frame, "shift"),
            (self.promo_frame, "promo"), 
            (self.param_frame, "param"),
            (self.report_frame, "report")
        ]
        
        for f, n in frames:
            if f is not None: # 仅处理已初始化的视图
                if n == name:
                    f.grid(row=0, column=1, sticky="nsew")
                else:
                    f.grid_forget()

    def btn_budget_event(self):
        self.select_frame_by_name("budget")

    def btn_shift_event(self):
        self.select_frame_by_name("shift")

    def btn_promo_event(self):
        self.select_frame_by_name("promo")

    def btn_param_event(self):
        self.select_frame_by_name("param")

    def btn_report_event(self):
        self.select_frame_by_name("report")

    def change_appearance_mode_event(self, new_appearance_mode):
        apply_theme(new_appearance_mode)
