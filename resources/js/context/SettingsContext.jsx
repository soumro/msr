import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const SettingsContext = createContext(null);

const DEFAULTS = {
    app_name: "Master Scholarship Register",
    app_slogan: "Empowering students, one scholarship at a time",
    logo_path: "",
    nav_style: "horizontal",
};

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            const r = await api.get("/settings");
            setSettings({ ...DEFAULTS, ...r.data.data });
        } catch {
            setSettings(DEFAULTS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    return (
        <SettingsContext.Provider
            value={{ settings, loading, refresh, setSettings }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);
