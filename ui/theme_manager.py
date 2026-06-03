import json
import os
import customtkinter as ctk

THEME_CONFIG_FILE = "theme_config.json"

def save_theme(theme_mode):
    """Save the theme preference to a local JSON file"""
    config = {"appearance_mode": theme_mode}
    try:
        with open(THEME_CONFIG_FILE, "w") as f:
            json.dump(config, f)
    except Exception as e:
        print(f"Error saving theme: {e}")

def load_theme():
    """Load the theme preference from the local JSON file"""
    if os.path.exists(THEME_CONFIG_FILE):
        try:
            with open(THEME_CONFIG_FILE, "r") as f:
                config = json.load(f)
                return config.get("appearance_mode", "System")
        except Exception as e:
            print(f"Error loading theme: {e}")
    return "System"

def apply_theme(theme_mode):
    """Apply the theme mode to the application"""
    ctk.set_appearance_mode(theme_mode)
    save_theme(theme_mode)
