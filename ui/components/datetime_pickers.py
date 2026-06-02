"""
Datetime Picker Components

This module provides reusable, styled datetime picker components using
the CustomTkinter framework and CTkDateEntry library.
"""

import customtkinter as ctk
from ctkdateentry import CTkDateEntry
from datetime import datetime, date, timedelta
from ui.design_system import (Colors, Typography, Spacing, BorderRadius,
                              create_font, get_color, create_styled_combobox)

class BaseDateTimePicker(ctk.CTkFrame):
    """Base class for all datetime picker components"""

    def __init__(self, master, callback=None, **kwargs):
        super().__init__(master, fg_color="transparent", **kwargs)
        self.callback = callback
        self.value = None

    def _on_change(self, *args):
        """Internal handler for value changes"""
        if self.callback:
            self.callback(self.get_value())

    def get_value(self):
        """Return the current value of the picker"""
        return self.value

    def set_value(self, value):
        """Set the value of the picker"""
        self.value = value
        if self.callback:
            self.callback(value)

    def clear(self):
        """Reset the picker to an empty state"""
        self.value = None
        if self.callback:
            self.callback(None)


class DatePicker(BaseDateTimePicker):
    """A styled date picker component using CTkDateEntry"""

    def __init__(self, master, placeholder_text="Select Date", min_date=None, max_date=None, callback=None, **kwargs):
        super().__init__(master, callback=callback)

        self.min_date = min_date
        self.max_date = max_date

        # Configure the CTkDateEntry widget
        self.date_entry = CTkDateEntry(
            self,
            width=140,
            corner_radius=BorderRadius.SM,
            border_width=0, 
            fg_color=Colors.BG_PRIMARY, 
            border_color=Colors.BORDER_DEFAULT
        )
        self.date_entry.pack(fill="x", expand=True)

        # 深度同步内部组件背景色，彻底消除“灰色长条”
        try:
            bg_hex = get_color(Colors.BG_PRIMARY)
            text_hex = get_color(Colors.TEXT_PRIMARY)
            
            # 配置内部 CTkEntry
            if hasattr(self.date_entry, 'entry'):
                self.date_entry.entry.configure(
                    font=create_font(Typography.SIZE_BODY),
                    text_color=text_hex,
                    fg_color=bg_hex,      # 设为卡片底色
                    bg_color="transparent",
                    border_width=1,        # 维持一个轻微的边框
                    border_color=get_color(Colors.BORDER_DEFAULT)
                )
            
            # 如果有按钮组件，也进行风格统一
            if hasattr(self.date_entry, 'button'):
                self.date_entry.button.configure(
                    fg_color=bg_hex,
                    hover_color=get_color(Colors.BG_TERTIARY),
                    text_color=text_hex
                )

            # 事件绑定
            self.date_entry.entry.bind("<FocusOut>", self._on_change)
            self.date_entry.entry.bind("<Return>", self._on_change)
            self.date_entry.entry.bind("<Escape>", lambda e: self.clear())
        except Exception as e:
            print(f"DatePicker styling error: {e}")

    def get_date(self):
        """Returns the selected date as a date object or None"""
        date_str = self.date_entry.entry.get()
        if not date_str:
            return None
        try:
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
                try:
                    return datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            return None
        except Exception:
            return None

    def get_formatted_date(self):
        """Returns the selected date as a string (YYYY-MM-DD)"""
        d = self.get_date()
        if d:
            if self.min_date and d < self.min_date: d = self.min_date
            if self.max_date and d > self.max_date: d = self.max_date
            return d.strftime("%Y-%m-%d")
        return ""

    def set_date(self, date_val):
        """Sets the date value (accepts date object or YYYY-MM-DD string)"""
        if isinstance(date_val, str) and date_val:
            try:
                d = datetime.strptime(date_val, "%Y-%m-%d").date()
                self.date_entry.entry.delete(0, "end")
                self.date_entry.entry.insert(0, d.strftime("%Y-%m-%d"))
            except ValueError:
                pass
        elif isinstance(date_val, (date, datetime)):
            self.date_entry.entry.delete(0, "end")
            self.date_entry.entry.insert(0, date_val.strftime("%Y-%m-%d"))

        if self.callback:
            self.callback(self.get_date())

    def get_value(self):
        return self.get_formatted_date()

    def set_value(self, value):
        self.set_date(value)

    def clear(self):
        self.date_entry.entry.delete(0, "end")
        super().clear()


class TimePicker(BaseDateTimePicker):
    """A styled time picker component with hour and minute selectors"""

    def __init__(self, master, minute_step=15, **kwargs):
        super().__init__(master, **kwargs)

        self.grid_columnconfigure((0, 2), weight=1)

        # Hour selector
        hours = [f"{i:02d}" for i in range(24)]
        self.hour_cb = create_styled_combobox(
            self, values=hours, width=70, command=self._on_change
        )
        self.hour_cb.grid(row=0, column=0, padx=(0, 2))

        self.sep_label = ctk.CTkLabel(self, text=":",
                                     font=create_font(Typography.SIZE_BODY, weight="bold"),
                                     text_color=get_color(Colors.TEXT_PRIMARY))
        self.sep_label.grid(row=0, column=1)

        # Minute selector
        minutes = [f"{i:02d}" for i in range(0, 60, minute_step)]
        self.min_cb = create_styled_combobox(
            self, values=minutes, width=70, command=self._on_change
        )
        self.min_cb.grid(row=0, column=2, padx=(2, 0))

        self.hour_cb.set("09")
        self.min_cb.set("00")

    def get_time(self):
        """Returns the selected time as HH:mm"""
        return f"{self.hour_cb.get()}:{self.min_cb.get()}"

    def set_time(self, time_str):
        """Sets the time (format HH:mm)"""
        if ":" in time_str:
            h, m = time_str.split(":")
            self.hour_cb.set(h.zfill(2))
            try:
                m_int = int(m)
                steps = [int(v) for v in self.min_cb._values]
                closest = min(steps, key=lambda x: abs(x - m_int))
                self.min_cb.set(f"{closest:02d}")
            except ValueError:
                pass

        if self.callback:
            self.callback(self.get_time())

    def get_value(self):
        return self.get_time()

    def set_value(self, value):
        self.set_time(value)

    def clear(self):
        self.hour_cb.set("09")
        self.min_cb.set("00")
        super().clear()


class DateRangePicker(BaseDateTimePicker):
    """A component for selecting a date range (start and end)"""

    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)

        # Create a unified container that looks like a single input group
        self.container = ctk.CTkFrame(
            self,
            fg_color="transparent"
        )
        self.container.pack(fill="x", expand=True)
        
        # Grid layout for side-by-side pickers
        self.container.grid_columnconfigure((0, 2), weight=1)
        self.container.grid_columnconfigure(1, weight=0)

        # Start date
        self.start_picker = DatePicker(self.container, callback=self._validate_range)
        self.start_picker.grid(row=0, column=0, sticky="ew")

        # Separator icon/text
        self.sep_label = ctk.CTkLabel(
            self.container,
            text="至",
            font=create_font(Typography.SIZE_BODY, weight=Typography.WEIGHT_BOLD),
            text_color=Colors.TEXT_SECONDARY,
            width=30
        )
        self.sep_label.grid(row=0, column=1, padx=Spacing.SM)

        # End date
        self.end_picker = DatePicker(self.container, callback=self._validate_range)
        self.end_picker.grid(row=0, column=2, sticky="ew")

        # Set default values
        today = datetime.now().date()
        self.start_picker.set_date(today)
        self.end_picker.set_date(today + timedelta(days=30))

    def _validate_range(self, *args):
        start = self.start_picker.get_date()
        end = self.end_picker.get_date()

        if start and end and end < start:
            # Auto-correct end date if it's before start date
            self.end_picker.set_date(start)

        if self.callback:
            self.callback(self.get_date_range())

    def get_date_range(self):
        """Returns tuple of (start_date, end_date)"""
        return (self.start_picker.get_formatted_date(), self.end_picker.get_formatted_date())

    def set_date_range(self, start_date, end_date):
        if start_date:
            self.start_picker.set_date(start_date)
        if end_date:
            self.end_picker.set_date(end_date)

    def get_formatted_range(self):
        start, end = self.get_date_range()
        if start and end:
            return f"{start} 至 {end}"
        return ""

    def get_value(self):
        return self.get_date_range()

    def set_value(self, value):
        if isinstance(value, (tuple, list)) and len(value) == 2:
            self.start_picker.set_date(value[0])
            self.end_picker.set_date(value[1])

    def clear(self):
        self.start_picker.clear()
        self.end_picker.clear()
        super().clear()


class MonthYearPicker(BaseDateTimePicker):
    """A component for selecting Month and Year"""

    def __init__(self, master, start_year=None, end_year=None, **kwargs):
        super().__init__(master, **kwargs)

        current_year = datetime.now().year
        if not start_year:
            start_year = current_year - 5
        if not end_year:
            end_year = current_year + 1

        years = [str(y) for y in range(start_year, end_year + 1)]
        months = [f"{m:02d}" for m in range(1, 13)]

        self.grid_columnconfigure((0, 1), weight=1)

        self.year_cb = create_styled_combobox(
            self, values=years[::-1], width=100, command=self._on_change
        )
        self.year_cb.grid(row=0, column=0, padx=(0, 5))

        self.month_cb = create_styled_combobox(
            self, values=months, width=80, command=self._on_change
        )
        self.month_cb.grid(row=0, column=1, padx=(5, 0))

        self.year_cb.set(str(current_year))
        self.month_cb.set(f"{datetime.now().month:02d}")

    def get_date(self):
        """Returns YYYY-MM"""
        return f"{self.year_cb.get()}-{self.month_cb.get()}"

    def get_value(self):
        return self.get_date()

    def set_value(self, value):
        if "-" in value:
            y, m = value.split("-")
            self.year_cb.set(y)
            self.month_cb.set(m.zfill(2))

        if self.callback:
            self.callback(self.get_date())

    def clear(self):
        current_year = datetime.now().year
        self.year_cb.set(str(current_year))
        self.month_cb.set(f"{datetime.now().month:02d}")
        super().clear()
