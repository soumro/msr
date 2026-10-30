import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { fetchDashboard } from "../services/scholarships";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

const NAV = [
    { to: "/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/register", label: "Master Register", icon: "📋" },
    { to: "/duplicates", label: "Duplicates", icon: "🔍", badge: "dup" },
    { to: "/renewals", label: "Renewals", icon: "🔄", badge: "ren" },
    { to: "/applications", label: "Applications", icon: "📝" },
    { to: "/reconciliation", label: "Reconciliation", icon: "💰" },
    { to: "/reports/year-end", label: "Reports", icon: "📊" },
    { to: "/support", label: "Student Support", icon: "🎓" },
    { to: "/import", label: "Bulk Import", icon: "📥", requires: "edit" },
    {
        to: "/settings/lookups",
        label: "Lookups",
        icon: "⚙️",
        requires: "manage",
    },
    {
        to: "/settings/audit",
        label: "Audit Log",
        icon: "📜",
        requires: "manage",
    },
    {
        to: "/settings/app",
        label: "App Settings",
        icon: "🎨",
        requires: "manage",
    },

    { to: "/my-page", label: "My Page", icon: "🎯" },
    { to: "/reports/multi-record", label: "Multi-Record Students", icon: "🔀" },
    {
        to: "/reports/pending-installments",
        label: "Pending Installments",
        icon: "⏳",
    },
];

export default function Layout() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { user, can } = useAuth();
    const { settings } = useSettings();

    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("nav_collapsed");
        if (stored === "1") setCollapsed(true);
    }, []);

    useEffect(() => {
        localStorage.setItem("nav_collapsed", collapsed ? "1" : "0");
    }, [collapsed]);

    const { data } = useQuery({
        queryKey: ["dashboard"],
        queryFn: fetchDashboard,
        retry: false,
    });

    const logout = async () => {
        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute("content") ?? "";
            await fetch("/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                },
            });
        } catch {}
        qc.clear();
        window.location.href = "/login";
    };

    const visibleNav = NAV.filter((t) => !t.requires || can(t.requires));
    const isVertical = settings.nav_style === "vertical";

    const Header = (
        <header className="bg-emerald-900 text-white px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-4 shrink-0">
            {settings.logo_path ? (
                <img
                    src={settings.logo_path}
                    alt="Logo"
                    className="w-10 h-10 rounded-xl bg-white/10 p-1 object-contain shrink-0"
                />
            ) : (
                <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center font-extrabold border border-white/20 text-sm shrink-0">
                    {settings.app_name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .substring(0, 3)
                        .toUpperCase()}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate text-sm md:text-base">
                    {settings.app_name}
                </h1>
                {settings.app_slogan && (
                    <p className="text-xs text-white/70 truncate hidden sm:block">
                        {settings.app_slogan}
                    </p>
                )}
            </div>

            {user && (
                <div className="hidden md:block text-right shrink-0">
                    <div className="text-xs text-white/70 truncate max-w-[200px]">
                        {user.email}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-white/90 bg-white/10 px-2 py-0.5 rounded inline-block">
                        {user.role}
                    </div>
                </div>
            )}

            <button
                onClick={() => navigate("/profile")}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-2 md:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            >
                👤 <span className="hidden sm:inline">Profile</span>
            </button>

            <button
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-2 md:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            >
                Logout
            </button>
        </header>
    );

    // ============ VERTICAL (SIDEBAR) MODE ============
    if (isVertical) {
        return (
            <div className="h-screen flex overflow-hidden bg-slate-100">
                {/* SIDEBAR — fixed height, its nav scrolls if too many items */}
                <aside
                    className={`bg-slate-900 text-white flex flex-col h-screen transition-all duration-200 ${
                        collapsed ? "w-16" : "w-60"
                    } shrink-0`}
                >
                    <div className="px-3 py-4 flex items-center gap-3 border-b border-slate-800 shrink-0">
                        {settings.logo_path ? (
                            <img
                                src={settings.logo_path}
                                alt="Logo"
                                className="w-10 h-10 rounded-lg bg-white/10 p-1 object-contain shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-700 grid place-items-center font-extrabold shrink-0 text-sm">
                                {settings.app_name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .substring(0, 3)
                                    .toUpperCase()}
                            </div>
                        )}
                        {!collapsed && (
                            <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">
                                    {settings.app_name}
                                </div>
                                {settings.app_slogan && (
                                    <div className="text-[10px] text-white/60 truncate">
                                        {settings.app_slogan}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <nav className="flex-1 overflow-y-auto py-3">
                        {visibleNav.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-emerald-700 text-white border-l-4 border-emerald-400"
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white border-l-4 border-transparent"
                                    }`
                                }
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="text-lg shrink-0">
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span className="flex-1 truncate">
                                            {item.label}
                                        </span>
                                        {item.badge === "dup" &&
                                            data?.duplicate_flags > 0 && (
                                                <span className="text-[10px] font-bold bg-red-600 text-white rounded-full px-1.5 py-0.5">
                                                    {data.duplicate_flags}
                                                </span>
                                            )}
                                        {item.badge === "ren" &&
                                            data?.renewals_due > 0 && (
                                                <span className="text-[10px] font-bold bg-amber-500 text-black rounded-full px-1.5 py-0.5">
                                                    {data.renewals_due}
                                                </span>
                                            )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="border-t border-slate-800 p-3 shrink-0">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="w-full text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 py-1.5 rounded hover:bg-slate-800"
                            title={collapsed ? "Expand" : "Collapse"}
                        >
                            {collapsed ? "»" : "« Collapse"}
                        </button>
                    </div>
                </aside>

                {/* RIGHT SIDE — fixed header, scrolling main */}
                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                    {Header}

                    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100">
                        <div className="max-w-7xl mx-auto px-4 py-6">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // ============ HORIZONTAL (TABS) MODE ============
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
            {Header}

            <nav className="bg-white border-b flex overflow-x-auto shrink-0 sticky top-0 z-30">
                {visibleNav.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap flex items-center gap-2 shrink-0 ${
                                isActive
                                    ? "border-emerald-700 text-emerald-800"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                            }`
                        }
                    >
                        <span>{item.icon}</span>
                        {item.label}
                        {item.badge === "dup" && data?.duplicate_flags > 0 && (
                            <span className="text-[11px] font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                                {data.duplicate_flags}
                            </span>
                        )}
                        {item.badge === "ren" && data?.renewals_due > 0 && (
                            <span className="text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                                {data.renewals_due}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
