import customtkinter as ctk
from ui.design_system import Colors, Typography, Spacing, BorderRadius, create_font, get_color

class StyledCard(ctk.CTkFrame):
    """A card container with consistent padding, border, and background"""

    def __init__(self, master, title="", subtitle="", **kwargs):
        super().__init__(
            master,
            corner_radius=BorderRadius.LG,
            border_width=1,
            border_color=Colors.BORDER_DEFAULT,
            fg_color=Colors.BG_PRIMARY,
            **kwargs
        )

        if title:
            header_f = ctk.CTkFrame(self, fg_color="transparent")
            header_f.pack(fill="x", padx=Spacing.XL, pady=(Spacing.LG, Spacing.XS))

            self.title_label = ctk.CTkLabel(
                header_f, text=title,
                font=create_font(Typography.SIZE_H3, weight=Typography.WEIGHT_BOLD),
                text_color=Colors.TEXT_PRIMARY,
                anchor="w"
            )
            self.title_label.pack(fill="x")

            if subtitle:
                self.sub_label = ctk.CTkLabel(
                    header_f, text=subtitle,
                    font=create_font(Typography.SIZE_CAPTION),
                    text_color=Colors.TEXT_SECONDARY,
                    anchor="w"
                )
                self.sub_label.pack(fill="x")

class MetricCard(ctk.CTkFrame):
    """A specialized card for displaying key metrics with an icon"""

    def __init__(self, master, label, value, unit="", icon="📊", color=Colors.PRIMARY, **kwargs):
        super().__init__(
            master,
            corner_radius=BorderRadius.LG,
            border_width=0,
            fg_color=color,
            **kwargs
        )

        self.grid_columnconfigure(0, weight=1)

        # Icon container
        icon_f = ctk.CTkFrame(
            self, width=40, height=40,
            corner_radius=BorderRadius.FULL,
            fg_color=Colors.PRIMARY_HOVER # Use a slightly different shade for icon background
        )
        icon_f.grid(row=0, column=0, padx=Spacing.XL, pady=(Spacing.XL, 0), sticky="w")
        icon_f.grid_propagate(False)

        ctk.CTkLabel(
            icon_f, text=icon,
            font=create_font(Typography.SIZE_H3)
        ).place(relx=0.5, rely=0.5, anchor="center")

        self.val_label = ctk.CTkLabel(
            self, text=f"{value}{unit}",
            font=create_font(Typography.SIZE_DISPLAY, weight=Typography.WEIGHT_BOLD),
            text_color=Colors.TEXT_INVERSE
        )
        self.val_label.grid(row=1, column=0, padx=Spacing.XL, pady=(Spacing.SM, 0), sticky="w")

        self.label_label = ctk.CTkLabel(
            self, text=label,
            font=create_font(Typography.SIZE_BODY),
            text_color=Colors.NEUTRAL_100 # Light text for contrast
        )
        self.label_label.grid(row=2, column=0, padx=Spacing.XL, pady=(0, Spacing.XL), sticky="w")

    def update_value(self, value, unit=""):
        self.val_label.configure(text=f"{value}{unit}")

class SectionHeader(ctk.CTkLabel):
    """A prominent header for major UI sections"""

    def __init__(self, master, text, **kwargs):
        super().__init__(
            master, text=text,
            font=create_font(Typography.SIZE_H1, weight=Typography.WEIGHT_BOLD),
            text_color=Colors.TEXT_PRIMARY,
            anchor="w", **kwargs
        )

class StyledButton(ctk.CTkButton):
    """A button that follows the design system styling"""

    def __init__(self, master, **kwargs):
        # Default styling
        defaults = {
            "corner_radius": BorderRadius.MD,
            "font": create_font(Typography.SIZE_BODY, weight=Typography.WEIGHT_MEDIUM),
            "fg_color": Colors.PRIMARY,
            "hover_color": Colors.PRIMARY_HOVER,
            "text_color": Colors.TEXT_INVERSE,
            "height": 36
        }
        # Override with any provided kwargs
        defaults.update(kwargs)
        super().__init__(master, **defaults)

class StyledEntry(ctk.CTkEntry):
    """An entry field that follows the design system styling"""

    def __init__(self, master, **kwargs):
        defaults = {
            "corner_radius": BorderRadius.MD,
            "font": create_font(Typography.SIZE_BODY),
            "border_width": 2,
            "border_color": Colors.BORDER_DEFAULT,
            "fg_color": Colors.BG_PRIMARY,
            "text_color": Colors.TEXT_PRIMARY,
            "placeholder_text_color": Colors.TEXT_TERTIARY,
            "height": 40
        }
        defaults.update(kwargs)
        super().__init__(master, **defaults)

        # 添加焦点效果
        self.bind("<FocusIn>", self._on_focus_in)
        self.bind("<FocusOut>", self._on_focus_out)

    def _on_focus_in(self, event):
        self.configure(border_color=Colors.PRIMARY)

    def _on_focus_out(self, event):
        self.configure(border_color=Colors.BORDER_DEFAULT)


class StyledComboBox(ctk.CTkComboBox):
    """A modern styled combobox/dropdown"""

    def __init__(self, master, **kwargs):
        defaults = {
            "corner_radius": BorderRadius.MD,
            "font": create_font(Typography.SIZE_BODY),
            "border_width": 2,
            "border_color": Colors.BORDER_DEFAULT,
            "fg_color": Colors.BG_PRIMARY,
            "text_color": Colors.TEXT_PRIMARY,
            "button_color": Colors.PRIMARY,
            "button_hover_color": Colors.PRIMARY_HOVER,
            "dropdown_fg_color": Colors.BG_PRIMARY,
            "dropdown_hover_color": Colors.BG_SECONDARY,
            "dropdown_text_color": Colors.TEXT_PRIMARY,
            "height": 40
        }
        defaults.update(kwargs)
        super().__init__(master, **defaults)


class StyledOptionMenu(ctk.CTkOptionMenu):
    """A modern styled option menu"""

    def __init__(self, master, **kwargs):
        # CTkOptionMenu supported parameters:
        # corner_radius, font, fg_color, button_color, button_hover_color, text_color,
        # dropdown_fg_color, dropdown_hover_color, dropdown_text_color, dropdown_font, height, anchor
        # NOT supported: border_width, border_color
        defaults = {
            "corner_radius": BorderRadius.MD,
            "font": create_font(Typography.SIZE_BODY, weight=Typography.WEIGHT_MEDIUM),
            "fg_color": Colors.BG_PRIMARY,
            "button_color": Colors.PRIMARY,
            "button_hover_color": Colors.PRIMARY_HOVER,
            "text_color": Colors.TEXT_PRIMARY,
            "dropdown_fg_color": Colors.BG_PRIMARY,
            "dropdown_hover_color": Colors.PRIMARY,
            "dropdown_text_color": Colors.TEXT_PRIMARY,
            "dropdown_font": create_font(Typography.SIZE_BODY),
            "height": 40,
            "anchor": "w"
        }
        defaults.update(kwargs)
        super().__init__(master, **defaults)

class PrecisionSlider(ctk.CTkFrame):
    """A slider with a linked numeric entry for precise control"""

    def __init__(self, master, label, from_, to, initial, unit="", steps=None, command=None, **kwargs):
        super().__init__(master, fg_color="transparent", **kwargs)
        self.grid_columnconfigure(1, weight=1)
        self.from_val = from_
        self.to_val = to

        self.label = ctk.CTkLabel(
            self, text=label,
            font=create_font(Typography.SIZE_BODY, weight=Typography.WEIGHT_BOLD),
            width=140, anchor="w"
        )
        self.label.grid(row=0, column=0, padx=(0, Spacing.SM))

        self.slider = ctk.CTkSlider(
            self, from_=from_, to=to,
            number_of_steps=steps,
            command=self._on_slider_change,
            button_color=Colors.PRIMARY,
            button_hover_color=Colors.PRIMARY_HOVER,
            progress_color=Colors.PRIMARY
        )
        self.slider.set(initial)
        self.slider.grid(row=0, column=1, sticky="ew")

        self.entry = StyledEntry(self, width=80, justify="center")
        self.entry.insert(0, str(initial))
        self.entry.grid(row=0, column=2, padx=(Spacing.LG, Spacing.XS))
        self.entry.bind("<Return>", self._on_entry_confirm)
        self.entry.bind("<FocusOut>", self._on_entry_confirm)

        self.unit_label = ctk.CTkLabel(
            self, text=unit, width=40,
            font=create_font(Typography.SIZE_CAPTION),
            text_color=Colors.TEXT_SECONDARY
        )
        self.unit_label.grid(row=0, column=3)

        self.external_command = command

    def _on_slider_change(self, val):
        val = round(float(val), 2)
        display_val = int(val) if val >= 1 and val == int(val) else val
        self.entry.delete(0, "end")
        self.entry.insert(0, str(display_val))
        if self.external_command:
            self.external_command(val)

    def _on_entry_confirm(self, event):
        try:
            val = round(float(self.entry.get()), 2)
            # 限制在范围内
            val = max(self.from_val, min(self.to_val, val))
            self.slider.set(val)
            # 格式化回填，确保显示一致
            display_val = int(val) if val >= 1 and val == int(val) else val
            self.entry.delete(0, "end")
            self.entry.insert(0, str(display_val))
            if self.external_command:
                self.external_command(val)
        except ValueError:
            # 恢复旧值
            self._on_slider_change(self.slider.get())

    def get(self):
        try:
            val = float(self.entry.get())
            return round(max(self.from_val, min(self.to_val, val)), 2)
        except:
            return round(self.slider.get(), 2)

class ModernSlider(PrecisionSlider): # Backwards compatibility
    pass
