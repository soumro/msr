import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
    const toast = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [info, setInfo] = useState({ name: "", email: "" });
    const [pw, setPw] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    const [savingInfo, setSavingInfo] = useState(false);
    const [savingPw, setSavingPw] = useState(false);

    useEffect(() => {
        if (user) setInfo({ name: user.name ?? "", email: user.email ?? "" });
    }, [user]);

    const saveInfo = async (e) => {
        e.preventDefault();
        setSavingInfo(true);
        try {
            await api.put("/profile", info);
            toast.success("Profile updated");
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Update failed");
        } finally {
            setSavingInfo(false);
        }
    };

    const savePassword = async (e) => {
        e.preventDefault();
        setSavingPw(true);
        try {
            await api.put("/profile/password", pw);
            setPw({
                current_password: "",
                password: "",
                password_confirmation: "",
            });
            toast.success("Password changed");
        } catch (err) {
            const msg =
                err?.response?.data?.message ??
                Object.values(err?.response?.data?.errors ?? {})
                    .flat()
                    .join("\n") ??
                "Could not change password";
            toast.error(msg);
        } finally {
            setSavingPw(false);
        }
    };

    return (
        <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        ←
                    </button>
                    <div>
                        <h2 className="font-semibold">My Profile</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {user?.role && (
                                <span className="uppercase font-bold text-emerald-700">
                                    {user.role}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <form onSubmit={saveInfo} className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                        Basic Information
                    </h3>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={info.name}
                            onChange={(e) =>
                                setInfo({ ...info, name: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={info.email}
                            onChange={(e) =>
                                setInfo({ ...info, email: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={savingInfo}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                            {savingInfo ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={savePassword} className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                        Change Password
                    </h3>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Current Password
                        </label>
                        <input
                            type="password"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={pw.current_password}
                            onChange={(e) =>
                                setPw({
                                    ...pw,
                                    current_password: e.target.value,
                                })
                            }
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            New Password
                        </label>
                        <input
                            type="password"
                            minLength={8}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={pw.password}
                            onChange={(e) =>
                                setPw({ ...pw, password: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            minLength={8}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={pw.password_confirmation}
                            onChange={(e) =>
                                setPw({
                                    ...pw,
                                    password_confirmation: e.target.value,
                                })
                            }
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={savingPw}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                            {savingPw ? "Changing…" : "Change Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
