import customtkinter as ctk
from database.db_manager import DatabaseManager
from database.models import ParamModel
from .views.shift_view import ShiftView
from .views.param_view import ParamView
from .views.budget_view import BudgetView
from .views.staff_view import StaffView
from .views.report_view import ReportView

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("电商客服人力预算系统 (固定班次版)")
        self.geometry("1200x800")
        self.minsize(1000, 700)

        # Initialize Database and Defaults
        self.db_manager = DatabaseManager()
        self.param_model = ParamModel(self.db_manager)
        self.param_model.init_default_params()

        # set grid layout 1x2
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # create navigation frame
        self.navigation_frame = ctk.CTkFrame(self, corner_radius=0)
        self.navigation_frame.grid(row=0, column=0, sticky="nsew")
        self.navigation_frame.grid_rowconfigure(7, weight=1)

        self.navigation_frame_label = ctk.CTkLabel(self.navigation_frame, text="🧠 人力预算系统",
                                                 font=ctk.CTkFont(size=22, weight="bold"))
        self.navigation_frame_label.grid(row=0, column=0, padx=20, pady=30)

        self.btn_budget = ctk.CTkButton(self.navigation_frame, corner_radius=8, height=45, border_spacing=15, text="📊 人力预算测算",
                                                   fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                                   anchor="w", font=ctk.CTkFont(size=14), command=self.btn_budget_event)
        self.btn_budget.grid(row=1, column=0, sticky="ew", padx=10, pady=2)

        self.btn_shift = ctk.CTkButton(self.navigation_frame, corner_radius=8, height=45, border_spacing=15, text="📅 班次配置管理",
                                                      fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                                      anchor="w", font=ctk.CTkFont(size=14), command=self.btn_shift_event)
        self.btn_shift.grid(row=2, column=0, sticky="ew", padx=10, pady=2)

        self.btn_param = ctk.CTkButton(self.navigation_frame, corner_radius=8, height=45, border_spacing=15, text="⚙️ 全局参数配置",
                                                      fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                                      anchor="w", font=ctk.CTkFont(size=14), command=self.btn_param_event)
        self.btn_param.grid(row=3, column=0, sticky="ew", padx=10, pady=2)

        self.btn_staff = ctk.CTkButton(self.navigation_frame, corner_radius=8, height=45, border_spacing=15, text="👤 人员档案排班",
                                                      fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                                      anchor="w", font=ctk.CTkFont(size=14), command=self.btn_staff_event)
        self.btn_staff.grid(row=4, column=0, sticky="ew", padx=10, pady=2)

        self.btn_report = ctk.CTkButton(self.navigation_frame, corner_radius=8, height=45, border_spacing=15, text="📉 数据报表复盘",
                                                       fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                                       anchor="w", font=ctk.CTkFont(size=14), command=self.btn_report_event)
        self.btn_report.grid(row=5, column=0, sticky="ew", padx=10, pady=2)

        self.appearance_mode_menu = ctk.CTkOptionMenu(self.navigation_frame, values=["Light", "Dark", "System"],
                                                                       command=self.change_appearance_mode_event)
        self.appearance_mode_menu.grid(row=8, column=0, padx=20, pady=20, sticky="s")

        # create home frame
        self.home_frame = BudgetView(self, self.db_manager)
        self.shift_frame = ShiftView(self, self.db_manager)
        self.param_frame = ParamView(self, self.db_manager)
        self.staff_frame = StaffView(self, self.db_manager)
        self.report_frame = ReportView(self, self.db_manager)

        # select default frame
        self.select_frame_by_name("budget")

    def select_frame_by_name(self, name):
        # set button color for selected button
        self.btn_budget.configure(fg_color=("gray75", "gray25") if name == "budget" else "transparent")
        self.btn_shift.configure(fg_color=("gray75", "gray25") if name == "shift" else "transparent")
        self.btn_param.configure(fg_color=("gray75", "gray25") if name == "param" else "transparent")
        self.btn_staff.configure(fg_color=("gray75", "gray25") if name == "staff" else "transparent")
        self.btn_report.configure(fg_color=("gray75", "gray25") if name == "report" else "transparent")

        # show selected frame
        if name == "budget":
            self.home_frame.grid(row=0, column=1, sticky="nsew")
        else:
            self.home_frame.grid_forget()
        if name == "shift":
            self.shift_frame.grid(row=0, column=1, sticky="nsew")
        else:
            self.shift_frame.grid_forget()
        if name == "param":
            self.param_frame.grid(row=0, column=1, sticky="nsew")
        else:
            self.param_frame.grid_forget()
        if name == "staff":
            self.staff_frame.grid(row=0, column=1, sticky="nsew")
        else:
            self.staff_frame.grid_forget()
        if name == "report":
            self.report_frame.grid(row=0, column=1, sticky="nsew")
        else:
            self.report_frame.grid_forget()

    def btn_budget_event(self):
        self.select_frame_by_name("budget")

    def btn_shift_event(self):
        self.select_frame_by_name("shift")

    def btn_param_event(self):
        self.select_frame_by_name("param")

    def btn_staff_event(self):
        self.select_frame_by_name("staff")

    def btn_report_event(self):
        self.select_frame_by_name("report")

    def change_appearance_mode_event(self, new_appearance_mode):
        ctk.set_appearance_mode(new_appearance_mode)
