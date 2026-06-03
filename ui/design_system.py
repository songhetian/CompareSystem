"""
Design System Module

This module centralizes all design constants and provides utility functions
for theme-aware styling. It defines colors, typography, spacing, shadows,
and border radius scales to ensure visual consistency across the application.
"""

import customtkinter as ctk


class Colors:
    """Professional color palette with light/dark mode support"""
    PRIMARY = ("#2563EB", "#3B82F6")  
    PRIMARY_HOVER = ("#1D4ED8", "#2563EB")
    PRIMARY_ACTIVE = ("#1E40AF", "#1D4ED8")

    SECONDARY = ("#7C3AED", "#8B5CF6")  
    ACCENT = ("#10B981", "#34D399")  

    SUCCESS = ("#10B981", "#34D399")
    WARNING = ("#F59E0B", "#FBBF24")
    ERROR = ("#EF4444", "#F87171")
    INFO = ("#3B82F6", "#60A5FA")

    NEUTRAL_50 = ("#F9FAFB", "#18181B")
    NEUTRAL_100 = ("#F3F4F6", "#27272A")
    NEUTRAL_200 = ("#E5E7EB", "#3F3F46")
    NEUTRAL_300 = ("#D1D5DB", "#52525B")
    NEUTRAL_400 = ("#9CA3AF", "#71717A")
    NEUTRAL_500 = ("#6B7280", "#A1A1AA")
    NEUTRAL_600 = ("#4B5563", "#D4D4D8")
    NEUTRAL_700 = ("#374151", "#E4E4E7")
    NEUTRAL_800 = ("#1F2937", "#F4F4F5")
    NEUTRAL_900 = ("#111827", "#FAFAFA")

    BG_PRIMARY = ("#FFFFFF", "#09090B")
    BG_SECONDARY = ("#F9FAFB", "#18181B")
    BG_TERTIARY = ("#F3F4F6", "#27272A")

    BORDER_DEFAULT = ("#E5E7EB", "#3F3F46")
    BORDER_HOVER = ("#D1D5DB", "#52525B")
    BORDER_FOCUS = ("#3B82F6", "#60A5FA")

    TEXT_PRIMARY = ("#111827", "#FAFAFA")
    TEXT_SECONDARY = ("#6B7280", "#A1A1AA")
    TEXT_TERTIARY = ("#9CA3AF", "#71717A")
    TEXT_INVERSE = ("#FFFFFF", "#09090B")


class Typography:
    FONT_FAMILY_PRIMARY = "Segoe UI"
    SIZE_DISPLAY = 32  
    SIZE_H1 = 26
    SIZE_H2 = 22
    SIZE_H3 = 18
    SIZE_BODY = 14
    SIZE_CAPTION = 12
    SIZE_SMALL = 11
    WEIGHT_REGULAR = "normal"
    WEIGHT_MEDIUM = "normal" # CustomTkinter 限制
    WEIGHT_BOLD = "bold"


class Spacing:
    BASE = 4
    XS = 4    
    SM = 8    
    MD = 12   
    LG = 16   
    XL = 20   
    XXL = 24  
    XXXL = 32 
    HUGE = 40 


class BorderRadius:
    SM = 4
    MD = 8
    LG = 12
    XL = 16
    FULL = 9999


def get_color(color_tuple):
    if not isinstance(color_tuple, (tuple, list)): return color_tuple
    mode = ctk.get_appearance_mode()
    return color_tuple[0] if mode == "Light" else color_tuple[1]


def create_font(size, weight="normal"):
    return ctk.CTkFont(family=Typography.FONT_FAMILY_PRIMARY, size=size, weight=weight)


def create_styled_combobox(master, values, **kwargs):
    default_kwargs = {
        'font': create_font(Typography.SIZE_BODY),
        'fg_color': get_color(Colors.BG_PRIMARY),
        'button_color': get_color(Colors.PRIMARY),
        'text_color': get_color(Colors.TEXT_PRIMARY),
        'corner_radius': BorderRadius.MD,
        'height': 36
    }
    default_kwargs.update(kwargs)
    return ctk.CTkComboBox(master, values=values, **default_kwargs)


def create_styled_optionmenu(master, values, **kwargs):
    """彻底移除所有不支持的 border 参数"""
    default_kwargs = {
        'font': create_font(Typography.SIZE_BODY, weight="bold"),
        'fg_color': get_color(Colors.PRIMARY), 
        'button_color': get_color(Colors.PRIMARY),
        'button_hover_color': get_color(Colors.PRIMARY_HOVER),
        'text_color': get_color(Colors.TEXT_INVERSE),
        'corner_radius': BorderRadius.MD,
        'height': 36
    }
    default_kwargs.update(kwargs)
    return ctk.CTkOptionMenu(master, values=values, **default_kwargs)
