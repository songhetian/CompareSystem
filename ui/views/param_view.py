import customtkinter as ctk
from database.models import ParameterSchemeModel, ParamModel
from ui.components.styled_widgets import StyledCard, SectionHeader, PrecisionSlider, StyledButton, StyledEntry
from ui.design_system import Spacing, Colors, create_font, Typography, get_color, BorderRadius
import json

class ParamView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.scheme_model = ParameterSchemeModel(db_manager)
        self.param_model = ParamModel(db_manager)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header Area
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=Spacing.HUGE, pady=(Spacing.HUGE, Spacing.XL), sticky="ew")

        SectionHeader(self.header_frame, text="测算模板管理中心").grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(self.header_frame, text="为不同项目保存不同的参数，以后直接选就行，不用来回改",
                     text_color=Colors.TEXT_SECONDARY, font=create_font(Typography.SIZE_BODY)).grid(row=1, column=0, sticky="w")

        self.add_btn = StyledButton(self.header_frame, text="➕ 新建一个模板", width=160, 
                                     fg_color=Colors.SUCCESS, command=self.create_new_scheme)
        self.add_btn.place(relx=1.0, rely=0.5, anchor="e")

        # Scrollable Content (Centered Table)
        self.scroll_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.scroll_frame.grid(row=1, column=0, sticky="nsew", padx=Spacing.XXXL, pady=10)
        self.scroll_frame.grid_columnconfigure(0, weight=1)

        self.load_schemes()

    def load_schemes(self):
        for widget in self.scroll_frame.winfo_children(): widget.destroy()
        
        schemes = self.scheme_model.get_all()
        
        # Table Header
        header_f = ctk.CTkFrame(self.scroll_frame, fg_color=Colors.BG_SECONDARY, corner_radius=BorderRadius.MD)
        header_f.pack(fill="x", pady=(0, 10))
        
        cols = ["状态", "方案名称", "描述说明", "最后更新", "操作"]
        weights = [1, 3, 4, 3, 4]
        for i, col in enumerate(cols):
            header_f.grid_columnconfigure(i, weight=weights[i])
            ctk.CTkLabel(header_f, text=col, font=create_font(Typography.SIZE_BODY, weight="bold"), anchor="center").grid(row=0, column=i, pady=10)

        # Data Rows
        for idx, s in enumerate(schemes):
            s_id, name, p_json, is_def, desc, c_time, u_time = s
            bg = Colors.BG_PRIMARY if idx % 2 == 0 else Colors.BG_TERTIARY
            row_f = ctk.CTkFrame(self.scroll_frame, fg_color=bg, corner_radius=BorderRadius.SM)
            row_f.pack(fill="x", pady=1)
            
            for i in range(len(cols)): row_f.grid_columnconfigure(i, weight=weights[i])
            
            # Status
            status_text = "⭐ 默认" if is_def else ""
            ctk.CTkLabel(row_f, text=status_text, text_color=Colors.ACCENT, font=create_font(Typography.SIZE_SMALL, weight="bold"), anchor="center").grid(row=0, column=0, pady=12)
            
            # Name & Desc
            ctk.CTkLabel(row_f, text=name, font=create_font(Typography.SIZE_BODY, weight="bold"), anchor="center").grid(row=0, column=1, pady=12)
            ctk.CTkLabel(row_f, text=desc or "-", font=create_font(Typography.SIZE_SMALL), anchor="center").grid(row=0, column=2, pady=12)
            ctk.CTkLabel(row_f, text=u_time[:16], font=create_font(Typography.SIZE_SMALL), text_color=Colors.TEXT_TERTIARY, anchor="center").grid(row=0, column=3, pady=12)
            
            # Actions
            btn_f = ctk.CTkFrame(row_f, fg_color="transparent")
            btn_f.grid(row=0, column=4, pady=8)
            
            ctk.CTkButton(btn_f, text="编辑", width=60, height=26, fg_color=Colors.INFO, font=create_font(Typography.SIZE_SMALL), 
                           command=lambda sid=s_id: self.edit_scheme(sid)).pack(side="left", padx=2)
            
            if not is_def:
                ctk.CTkButton(btn_f, text="设为默认", width=80, height=26, fg_color=Colors.PRIMARY, font=create_font(Typography.SIZE_SMALL),
                               command=lambda sid=s_id: self.set_default(sid)).pack(side="left", padx=2)
                ctk.CTkButton(btn_f, text="删除", width=60, height=26, fg_color=Colors.ERROR, font=create_font(Typography.SIZE_SMALL),
                               command=lambda sid=s_id: self.delete_scheme(sid)).pack(side="left", padx=2)

    def set_default(self, sid):
        self.scheme_model.set_default(sid)
        self.load_schemes()

    def delete_scheme(self, sid):
        self.scheme_model.delete_scheme(sid)
        self.load_schemes()

    def create_new_scheme(self):
        # 弹窗输入名称和描述
        win = SchemeMetaWindow(self, "新增方案", self.db_manager, self.save_new_scheme)
        self.center_dialog(win, 400, 350)

    def save_new_scheme(self, name, desc):
        # 复制当前默认参数作为模板
        default_s = self.scheme_model.get_default()
        params = json.loads(default_s[2]) if default_s else {}
        if not params:
            # 如果没有方案，从 sys_params 加载
            params = self.param_model.get_all_dict()
            
        self.scheme_model.add_scheme(name, params, desc)
        self.load_schemes()

    def edit_scheme(self, sid):
        scheme = self.scheme_model.get_by_id(sid)
        if scheme:
            win = SchemeEditorWindow(self, scheme, self.db_manager, self.load_schemes)
            self.center_dialog(win, 900, 700)

    def center_dialog(self, d, w, h):
        self.update_idletasks()
        x = self.winfo_rootx() + (self.winfo_width()//2) - (w//2)
        y = self.winfo_rooty() + (self.winfo_height()//2) - (h//2)
        d.geometry(f"{w}x{h}+{x}+{y}")

class SchemeMetaWindow(ctk.CTkToplevel):
    def __init__(self, parent, title, db_manager, callback):
        super().__init__(parent); self.title(title); self.attributes("-topmost", True)
        self.transient(parent); self.grab_set()
        
        main = ctk.CTkFrame(self, fg_color="transparent"); main.pack(fill="both", expand=True, padx=30, pady=30)
        SectionHeader(main, text=title).pack(anchor="w", pady=(0, 20))
        
        ctk.CTkLabel(main, text="方案名称:", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w")
        self.name_e = StyledEntry(main); self.name_e.pack(fill="x", pady=(5, 15))
        
        ctk.CTkLabel(main, text="描述说明:", font=create_font(Typography.SIZE_BODY, weight="bold")).pack(anchor="w")
        self.desc_e = StyledEntry(main); self.desc_e.pack(fill="x", pady=(5, 25))
        
        StyledButton(main, text="💾 保存并继续", height=45, command=lambda: [callback(self.name_e.get(), self.desc_e.get()), self.destroy()]).pack(fill="x")

class SchemeEditorWindow(ctk.CTkToplevel):
    def __init__(self, parent, scheme, db_manager, callback):
        super().__init__(parent); self.title(f"编辑方案: {scheme[1]}"); self.geometry("900x700")
        self.transient(parent); self.grab_set(); self.attributes("-topmost", True)
        self.scheme_id, self.scheme_name, self.params_dict = scheme[0], scheme[1], json.loads(scheme[2])
        self.db_manager, self.callback = db_manager, callback
        self.scheme_model = ParameterSchemeModel(db_manager)
        self.param_model = ParamModel(db_manager)

        main = ctk.CTkFrame(self, fg_color="transparent"); main.pack(fill="both", expand=True, padx=20, pady=20)
        
        hdr = ctk.CTkFrame(main, fg_color="transparent"); hdr.pack(fill="x", pady=(0, 15))
        SectionHeader(hdr, text=f"⚙️ 方案微调: {self.scheme_name}").pack(side="left")
        StyledButton(hdr, text="🚀 保存并固化该方案", width=180, command=self.save_params).pack(side="right")

        self.scroll = ctk.CTkScrollableFrame(main, fg_color="transparent")
        self.scroll.pack(fill="both", expand=True)
        self.controls = {}

        params = self.param_model.get_all() # 仅用于获取元数据（名称、分类、描述）
        categories = {}
        for p in params:
            cat = p[5]
            if cat not in categories: categories[cat] = []
            categories[cat].append(p)

        order = ["基础业务", "漏斗转化", "岗位效能", "分时爆发", "专项大促", "时间偏移"]
        for cat in order:
            if cat not in categories: continue
            card = StyledCard(self.scroll, title=cat); card.pack(fill="x", pady=Spacing.MD)
            for p in categories[cat]:
                p_id, name, key, _, desc, _, _ = p
                val = self.params_dict.get(key, 0.0)
                
                # 定义范围（复用逻辑）
                p_min, p_max, p_steps, p_unit = 0.0, 5.0, 50, ""
                if "客单价" in name: p_min, p_max, p_steps, p_unit = 50, 1000, 95, " 元"
                elif "访客数" in name: p_min, p_max, p_steps, p_unit = 100, 100000, 999, " 人"
                elif "高峰系数" in name or "冗余系数" in name: p_min, p_max, p_steps, p_unit = 1.0, 2.0, 50, ""
                elif "率" in name or "占比" in name: p_min, p_max, p_steps, p_unit = 0.0, 1.0, 100, ""
                elif "工作时长" in name: p_min, p_max, p_steps, p_unit = 4, 12, 16, " 小时"
                elif "休息分钟" in name: p_min, p_max, p_steps, p_unit = 0, 30, 30, " 分钟"
                elif "处理时长" in name: p_min, p_max, p_steps, p_unit = 1.0, 15.0, 70, " 分钟"
                elif "饱和度" in name: p_min, p_max, p_steps, p_unit = 0.5, 1.0, 50, ""
                elif "爆发开始" in name or "爆发结束" in name: p_min, p_max, p_steps, p_unit = 0, 23, 23, " 点"
                elif "爆发倍数" in name: p_min, p_max, p_steps, p_unit = 1.0, 5.0, 80, " 倍"
                elif "系数" in name and "大促" in cat: p_min, p_max, p_steps, p_unit = 1.0, 5.0, 80, " 倍"
                elif "时间偏移" in name: p_min, p_max, p_steps, p_unit = -30, 30, 60, " 天"

                ctrl = PrecisionSlider(card, name, p_min, p_max, val, unit=p_unit, steps=p_steps)
                ctrl.pack(fill="x", padx=Spacing.XL, pady=Spacing.MD)
                self.controls[key] = ctrl

    def save_params(self):
        # 强制同步焦点，确保正在编辑的输入框生效
        self.focus_set()
        self.update_idletasks()
        
        new_params = {k: c.get() for k, c in self.controls.items()}
        self.scheme_model.update_scheme(self.scheme_id, self.scheme_name, new_params)
        self.callback()
        self.destroy()


class TimeOffsetPanel(ctk.CTkFrame):
    """UI panel for configuring service phase time offsets

    This panel allows users to configure time offset parameters for presale,
    midsale, and aftersale service phases. Time offsets adjust when workload
    peaks occur relative to a promotional event date.
    """

    def __init__(self, master, param_model: ParamModel):
        """Initialize time offset configuration panel

        Args:
            master: Parent widget
            param_model: ParamModel instance for database operations
        """
        super().__init__(
            master,
            corner_radius=BorderRadius.LG,
            border_width=1,
            border_color=Colors.BORDER_DEFAULT,
            fg_color=Colors.BG_PRIMARY
        )

        self.param_model = param_model
        self.input_fields = {}
        self.error_labels = {}

        # Section Header
        header_frame = ctk.CTkFrame(self, fg_color="transparent")
        header_frame.pack(fill="x", padx=Spacing.XL, pady=(Spacing.LG, Spacing.XS))

        title_label = ctk.CTkLabel(
            header_frame,
            text="⏱️ 时间偏移配置",
            font=create_font(Typography.SIZE_H3, weight=Typography.WEIGHT_BOLD),
            text_color=Colors.TEXT_PRIMARY,
            anchor="w"
        )
        title_label.pack(fill="x")

        # Help text explaining feature purpose
        help_text = ctk.CTkLabel(
            header_frame,
            text="设置各服务阶段工作量高峰的时间偏移,用于大促等场景的精准人力预测",
            font=create_font(Typography.SIZE_CAPTION),
            text_color=Colors.TEXT_SECONDARY,
            anchor="w"
        )
        help_text.pack(fill="x", pady=(Spacing.XS, 0))

        # Input fields container
        inputs_frame = ctk.CTkFrame(self, fg_color="transparent")
        inputs_frame.pack(fill="x", padx=Spacing.XL, pady=Spacing.MD)

        # Define the three service phases
        phases = [
            ("presale_time_offset", "售前时间偏移"),
            ("midsale_time_offset", "售中时间偏移"),
            ("aftersale_time_offset", "售后时间偏移")
        ]

        # Create input field for each phase
        for idx, (param_key, label_text) in enumerate(phases):
            # Row container
            row_frame = ctk.CTkFrame(inputs_frame, fg_color="transparent")
            row_frame.pack(fill="x", pady=Spacing.SM)
            row_frame.grid_columnconfigure(1, weight=1)

            # Label
            label = ctk.CTkLabel(
                row_frame,
                text=label_text,
                font=create_font(Typography.SIZE_BODY, weight=Typography.WEIGHT_BOLD),
                width=140,
                anchor="w"
            )
            label.grid(row=0, column=0, padx=(0, Spacing.MD), sticky="w")

            # Input entry
            entry = StyledEntry(row_frame, width=80, justify="center")
            entry.grid(row=0, column=1, padx=Spacing.SM, sticky="w")
            self.input_fields[param_key] = entry

            # Unit label
            unit_label = ctk.CTkLabel(
                row_frame,
                text="天",
                font=create_font(Typography.SIZE_BODY),
                text_color=Colors.TEXT_SECONDARY,
                width=30,
                anchor="w"
            )
            unit_label.grid(row=0, column=2, padx=(Spacing.XS, Spacing.MD), sticky="w")

            # Explanation text
            explanation = ctk.CTkLabel(
                row_frame,
                text="负数表示提前,正数表示延后",
                font=create_font(Typography.SIZE_SMALL),
                text_color=Colors.TEXT_TERTIARY,
                anchor="w"
            )
            explanation.grid(row=0, column=3, padx=Spacing.SM, sticky="w")

            # Error label (initially hidden)
            error_label = ctk.CTkLabel(
                inputs_frame,
                text="",
                font=create_font(Typography.SIZE_SMALL),
                text_color=Colors.ERROR,
                anchor="w"
            )
            error_label.pack(fill="x", pady=(0, Spacing.XS))
            self.error_labels[param_key] = error_label

        # Usage example text
        example_frame = ctk.CTkFrame(self, fg_color=Colors.BG_SECONDARY, corner_radius=BorderRadius.MD)
        example_frame.pack(fill="x", padx=Spacing.XL, pady=Spacing.MD)

        example_label = ctk.CTkLabel(
            example_frame,
            text="💡 例如:售后设置+3表示售后高峰延迟3天出现",
            font=create_font(Typography.SIZE_CAPTION),
            text_color=Colors.TEXT_SECONDARY,
            anchor="w"
        )
        example_label.pack(fill="x", padx=Spacing.MD, pady=Spacing.SM)

        # Action buttons
        button_frame = ctk.CTkFrame(self, fg_color="transparent")
        button_frame.pack(fill="x", padx=Spacing.XL, pady=(Spacing.MD, Spacing.LG))

        # Save button
        self.save_btn = StyledButton(
            button_frame,
            text="💾 保存",
            width=120,
            command=self._on_save_clicked
        )
        self.save_btn.pack(side="left", padx=(0, Spacing.SM))

        # Reset button
        self.reset_btn = StyledButton(
            button_frame,
            text="🔄 恢复默认值",
            width=140,
            command=self._on_reset_clicked
        )
        self.reset_btn.pack(side="left", padx=Spacing.SM)

        # Success message label (initially hidden)
        self.success_label = ctk.CTkLabel(
            button_frame,
            text="",
            font=create_font(Typography.SIZE_BODY),
            text_color=get_color(Colors.SUCCESS),
            anchor="w"
        )
        self.success_label.pack(side="left", padx=Spacing.MD)

        # Load current values from database
        self.load_values()

    def load_values(self):
        """Load current time offset values from database and display in UI"""
        phases = ["presale_time_offset", "midsale_time_offset", "aftersale_time_offset"]
        defaults = {"presale_time_offset": -2, "midsale_time_offset": 0, "aftersale_time_offset": 3}

        for param_key in phases:
            value = self.param_model.get_by_key(param_key)
            if value is None:
                value = defaults.get(param_key, 0)

            entry = self.input_fields[param_key]
            entry.delete(0, "end")
            # Format as integer if it's a whole number
            display_value = int(float(value)) if float(value) == int(float(value)) else float(value)
            entry.insert(0, str(display_value))

    def _on_save_clicked(self):
        """Handle save button click"""
        # Clear success message
        self.success_label.configure(text="")

        # Validate and save
        if self.validate_and_save():
            # Display success message
            self.success_label.configure(text="✅ 时间偏移参数已保存")
            # Clear success message after 3 seconds
            self.after(3000, lambda: self.success_label.configure(text=""))

    def _on_reset_clicked(self):
        """Handle reset button click"""
        # Clear success message
        self.success_label.configure(text="")

        # Reset to defaults
        self.reset_to_defaults()

        # Display confirmation message
        self.success_label.configure(text="✅ 已恢复为默认时间偏移值")
        # Clear success message after 3 seconds
        self.after(3000, lambda: self.success_label.configure(text=""))

    def validate_and_save(self) -> bool:
        """Validate all inputs and save to database

        Returns:
            bool: True if save successful, False otherwise
        """
        # Clear previous error messages
        for error_label in self.error_labels.values():
            error_label.configure(text="")

        # Validate all inputs
        valid = True
        values_to_save = {}

        for param_key, entry in self.input_fields.items():
            value_str = entry.get().strip()

            # Empty input uses default 0
            if value_str == "":
                values_to_save[param_key] = 0
                continue

            # Try to convert to integer
            try:
                value = int(value_str)
            except ValueError:
                self.error_labels[param_key].configure(text="时间偏移必须为整数")
                valid = False
                continue

            # Check range [-30, +30]
            if not (-30 <= value <= 30):
                self.error_labels[param_key].configure(text="时间偏移必须在-30到+30天之间")
                valid = False
                continue

            values_to_save[param_key] = value

        # If validation failed, don't save
        if not valid:
            return False

        # Save all valid values to database
        for param_key, value in values_to_save.items():
            self.param_model.update_param(param_key, float(value))

        return True

    def reset_to_defaults(self):
        """Reset all time offsets to default values"""
        defaults = {
            "presale_time_offset": -2,
            "midsale_time_offset": 0,
            "aftersale_time_offset": 3
        }

        # Save defaults to database
        for param_key, value in defaults.items():
            self.param_model.update_param(param_key, float(value))

        # Refresh UI to display default values
        self.load_values()

        # Clear any error messages
        for error_label in self.error_labels.values():
            error_label.configure(text="")
