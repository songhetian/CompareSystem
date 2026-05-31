import customtkinter as ctk

class StyledCard(ctk.CTkFrame):
    def __init__(self, master, title="", subtitle="", **kwargs):
        super().__init__(master, corner_radius=16, border_width=1, 
                         border_color=("gray85", "gray25"), 
                         fg_color=("gray98", "gray12"), **kwargs)
        
        self.grid_columnconfigure(0, weight=1)
        if title:
            header_f = ctk.CTkFrame(self, fg_color="transparent")
            header_f.grid(row=0, column=0, sticky="ew", padx=20, pady=(15, 5))
            
            self.title_label = ctk.CTkLabel(header_f, text=title, 
                                          font=ctk.CTkFont(size=18, weight="bold"),
                                          text_color=("#1f538d", "#72aee6"))
            self.title_label.grid(row=0, column=0, sticky="w")
            
            if subtitle:
                self.sub_label = ctk.CTkLabel(header_f, text=subtitle, 
                                              font=ctk.CTkFont(size=12),
                                              text_color="gray")
                self.sub_label.grid(row=1, column=0, sticky="w")

class MetricCard(ctk.CTkFrame):
    def __init__(self, master, label, value, unit="", icon="📊", color=("#3B8ED0", "#1F6AA5"), **kwargs):
        super().__init__(master, corner_radius=16, border_width=0, 
                         fg_color=color, **kwargs)
        
        self.grid_columnconfigure(0, weight=1)
        
        icon_f = ctk.CTkFrame(self, width=40, height=40, corner_radius=20, fg_color=("#6FB3E5", "#307DBF"))
        icon_f.grid(row=0, column=0, padx=20, pady=(20, 0), sticky="w")
        icon_f.grid_propagate(False)
        
        ctk.CTkLabel(icon_f, text=icon, font=ctk.CTkFont(size=20)).place(relx=0.5, rely=0.5, anchor="center")

        self.val_label = ctk.CTkLabel(self, text=f"{value}{unit}", 
                                      font=ctk.CTkFont(size=32, weight="bold"),
                                      text_color="white")
        self.val_label.grid(row=1, column=0, padx=20, pady=(10, 0), sticky="w")

        self.label_label = ctk.CTkLabel(self, text=label, 
                                        font=ctk.CTkFont(size=14),
                                        text_color="#f0f0f0")
        self.label_label.grid(row=2, column=0, padx=20, pady=(0, 20), sticky="w")

    def update_value(self, value, unit=""):
        self.val_label.configure(text=f"{value}{unit}")

class SectionHeader(ctk.CTkLabel):
    def __init__(self, master, text, **kwargs):
        super().__init__(master, text=text, 
                         font=ctk.CTkFont(size=26, weight="bold"),
                         anchor="w", **kwargs)

class PrecisionSlider(ctk.CTkFrame):
    def __init__(self, master, label, from_, to, initial, unit="", steps=None, command=None, **kwargs):
        super().__init__(master, fg_color="transparent", **kwargs)
        self.grid_columnconfigure(1, weight=1)
        
        self.label = ctk.CTkLabel(self, text=label, font=ctk.CTkFont(weight="bold"), width=140, anchor="w")
        self.label.grid(row=0, column=0, padx=(0, 10))
        
        self.slider = ctk.CTkSlider(self, from_=from_, to=to, number_of_steps=steps, command=self._on_slider_change)
        self.slider.set(initial)
        self.slider.grid(row=0, column=1, sticky="ew")
        
        # Entry for manual input and precise display
        self.entry = ctk.CTkEntry(self, width=80, font=ctk.CTkFont(weight="bold"), justify="center")
        self.entry.insert(0, str(initial))
        self.entry.grid(row=0, column=2, padx=(15, 5))
        self.entry.bind("<Return>", self._on_entry_confirm)
        
        self.unit_label = ctk.CTkLabel(self, text=unit, width=40, text_color="gray")
        self.unit_label.grid(row=0, column=3)
        
        self.external_command = command

    def _on_slider_change(self, val):
        display_val = int(val) if val >= 1 else round(val, 2)
        self.entry.delete(0, "end")
        self.entry.insert(0, str(display_val))
        if self.external_command:
            self.external_command(val)

    def _on_entry_confirm(self, event):
        try:
            val = float(self.entry.get())
            self.slider.set(val)
            if self.external_command:
                self.external_command(val)
        except ValueError:
            self.entry.delete(0, "end")
            self.entry.insert(0, str(self.slider.get()))

    def get(self):
        return self.slider.get()

class ModernSlider(PrecisionSlider): # Backwards compatibility
    pass
