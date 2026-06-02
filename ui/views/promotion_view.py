import customtkinter as ctk
from database.models import PromotionSchemeModel
from ui.components.styled_widgets import (StyledCard, SectionHeader, StyledButton, StyledEntry)
from ui.design_system import Spacing, Colors, Typography, create_font, get_color, BorderRadius

class PromotionView(ctk.CTkFrame):
    """活动规划管理视图 - 管理多阶段大促活动的定义"""
    
    def __init__(self, master, db_manager):
        super().__init__(master, corner_radius=0, fg_color="transparent")
        self.db_manager = db_manager
        self.promotion_model = PromotionSchemeModel(db_manager)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=Spacing.HUGE, pady=(Spacing.HUGE, Spacing.XL), sticky="ew")
        
        SectionHeader(self.header_frame, text="活动力度管理").pack(anchor="w")
        ctk.CTkLabel(self.header_frame, text="定义不同规模的活动（如 S1、S2），测算时直接选就行",
                     text_color=Colors.TEXT_SECONDARY, font=create_font(Typography.SIZE_BODY)).pack(anchor="w")

        # 内容区
        self.content_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.content_frame.grid(row=1, column=0, sticky="nsew", padx=Spacing.XXXL, pady=(0, Spacing.XXXL))
        self.content_frame.grid_columnconfigure(0, weight=1)
        
        # 添加新方案
        self.setup_add_form()
        
        # 列表显示
        self.list_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        self.list_frame.pack(fill="both", expand=True, pady=Spacing.LG)
        self.load_schemes()

    def setup_add_form(self):
        card = StyledCard(self.content_frame, title="添加一个新的活动级别")
        card.pack(fill="x", pady=Spacing.MD)
        
        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(padx=Spacing.XL, pady=Spacing.MD, fill="x")
        
        self.name_entry = StyledEntry(inner, placeholder_text="名字 (如: 双11大促)")
        self.name_entry.pack(fill="x", pady=5)
        
        self.factor_entry = StyledEntry(inner, placeholder_text="流量比平时大多少倍？ (如: 2.8)")
        self.factor_entry.pack(fill="x", pady=5)
        
        self.desc_entry = StyledEntry(inner, placeholder_text="简单说明一下")
        self.desc_entry.pack(fill="x", pady=5)
        
        StyledButton(inner, text="➕ 增加这个级别", command=self.add_scheme).pack(fill="x", pady=10)

    def load_schemes(self):
        for widget in self.list_frame.winfo_children(): widget.destroy()
        
        schemes = self.promotion_model.get_all()
        for s in schemes:
            s_id, name, factor, desc, _, _ = s
            card = StyledCard(self.list_frame)
            card.pack(fill="x", pady=Spacing.XS)
            
            row = ctk.CTkFrame(card, fg_color="transparent")
            row.pack(fill="x", padx=Spacing.LG, pady=Spacing.SM)
            
            ctk.CTkLabel(row, text=f"{name} (系数: {factor}x)", font=create_font(Typography.SIZE_BODY, weight=Typography.WEIGHT_BOLD)).pack(side="left")
            StyledButton(row, text="删除", width=60, fg_color=Colors.ERROR, command=lambda sid=s_id: self.delete_scheme(sid)).pack(side="right")

    def center_dialog(self, dialog, width, height):
        self.update_idletasks()
        px, py, pw, ph = self.winfo_rootx(), self.winfo_rooty(), self.winfo_width(), self.winfo_height()
        x = px + (pw // 2) - (width // 2)
        y = py + (ph // 2) - (height // 2)
        dialog.geometry(f"{width}x{height}+{x}+{y}")

    def add_scheme(self):
        try:
            self.promotion_model.add_scheme(self.name_entry.get(), float(self.factor_entry.get()), self.desc_entry.get())
            self.load_schemes()
        except: pass

    def delete_scheme(self, sid):
        self.promotion_model.delete_scheme(sid)
        self.load_schemes()
