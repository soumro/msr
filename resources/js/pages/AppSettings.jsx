import { useState, useEffect } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";

export default function AppSettings() {
    const toast = useToast();
    const { settings, refresh } = useSettings();
    const [form, setForm] = useState({
        app_name: "",
        app_slogan: "",
        nav_style: "horizontal",
    });
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setForm({
            app_name: settings.app_name ?? "",
            app_slogan: settings.app_slogan ?? "",
            nav_style: settings.nav_style ?? "horizontal",
        });
    }, [settings]);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post("/settings", form);
            await refresh();
            toast.success("Settings saved");
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const uploadLogo = async (e) => {
        e.preventDefault();
        if (!logoFile) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("logo", logoFile);
            await api.post("/settings/logo", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            await refresh();
            setLogoFile(null);
            e.target.reset();
            toast.success("Logo uploaded");
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const removeLogo = async () => {
        if (!confirm("Remove the logo?")) return;
        try {
            await api.delete("/settings/logo");
            await refresh();
            toast.success("Logo removed");
        } catch {
            toast.error("Could not remove logo");
        }
    };

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">App Settings</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Configure the app name, slogan, logo, and navigation
                        style. Changes apply across the app.
                    </p>
                </div>

                <form onSubmit={save} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            App Name
                        </label>
                        <input
                            type="text"
                            maxLength={120}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={form.app_name}
                            onChange={(e) =>
                                setForm({ ...form, app_name: e.target.value })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Slogan
                        </label>
                        <input
                            type="text"
                            maxLength={200}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={form.app_slogan}
                            onChange={(e) =>
                                setForm({ ...form, app_slogan: e.target.value })
                            }
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                            Appears on the login screen and header.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                            Navigation Style
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {
                                    value: "horizontal",
                                    label: "Horizontal Tabs",
                                    desc: "Nav under the header",
                                },
                                {
                                    value: "vertical",
                                    label: "Vertical Sidebar",
                                    desc: "Collapsible left sidebar",
                                },
                            ].map((opt) => (
                                <label
                                    key={opt.value}
                                    className={`border rounded-lg p-3 cursor-pointer flex items-start gap-2 transition ${
                                        form.nav_style === opt.value
                                            ? "border-emerald-700 bg-emerald-50"
                                            : "border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="nav_style"
                                        value={opt.value}
                                        checked={form.nav_style === opt.value}
                                        onChange={() =>
                                            setForm({
                                                ...form,
                                                nav_style: opt.value,
                                            })
                                        }
                                        className="mt-0.5 accent-emerald-700"
                                    />
                                    <div>
                                        <div className="text-sm font-semibold">
                                            {opt.label}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {opt.desc}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save Settings"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h3 className="font-semibold">Logo</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        PNG, JPG, SVG, or WebP. Max 2 MB.
                    </p>
                </div>

                <div className="p-5 space-y-4">
                    {settings.logo_path && (
                        <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <img
                                src={settings.logo_path}
                                alt="Logo"
                                className="w-16 h-16 object-contain rounded-lg bg-white border border-slate-200 p-1"
                            />
                            <div className="flex-1 text-xs text-slate-600 font-mono truncate">
                                {settings.logo_path}
                            </div>
                            <button
                                type="button"
                                onClick={removeLogo}
                                className="text-red-600 text-xs font-semibold hover:underline"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    <form
                        onSubmit={uploadLogo}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                setLogoFile(e.target.files[0] || null)
                            }
                            className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:text-white file:text-xs file:font-semibold hover:file:bg-emerald-800"
                        />
                        <button
                            type="submit"
                            disabled={!logoFile || uploading}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                        >
                            {uploading ? "Uploading…" : "Upload Logo"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
