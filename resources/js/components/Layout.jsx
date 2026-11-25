import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { fetchDashboard } from "../services/scholarships";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

const NAV_SECTIONS = [
    {
        label: "Operations",
        items: [
            { to: "/dashboard", label: "Dashboard", icon: "🏠" },
            { to: "/register", label: "Master Register", icon: "📋" },
            {
                to: "/duplicates",
                label: "Duplicates",
                icon: "🔍",
                badge: "dup",
            },
            { to: "/renewals", label: "Renewals", icon: "🔄", badge: "ren" },
            { to: "/applications", label: "Applications", icon: "📝" },
        ],
    },
    {
        label: "Financial",
        items: [
            { to: "/reconciliation", label: "Reconciliation", icon: "💰" },
            { to: "/reports/year-end", label: "Reports", icon: "📊" },
            { to: "/audit-reports", label: "Audit Reports", icon: "📑" },
        ],
    },
    {
        label: "Support",
        items: [{ to: "/support", label: "Support", icon: "🎓" }],
    },
    {
        label: "Administration",
        items: [
            {
                to: "/import",
                label: "Bulk Import",
                icon: "📥",
                requires: "edit",
            },
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
                requires: "audit",
            },
            {
                to: "/settings/backup",
                label: "Backups",
                icon: "💾",
                requires: "manage",
            },
            {
                to: "/settings/app",
                label: "App Settings",
                icon: "🎨",
                requires: "manage",
            },
        ],
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

    const visibleSections = NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((t) => !t.requires || can(t.requires)),
    })).filter((section) => section.items.length > 0);

    const isVertical = settings.nav_style === "vertical";

    // ────────────────────────────────────────────────────────
    // HEADER (shared between both modes)
    // ────────────────────────────────────────────────────────
    const Header = (
        <header className="relative bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white px-4 md:px-6 py-3.5 flex items-center gap-3 md:gap-4 shrink-0 z-20 shadow-md">
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/60 to-transparent"></div>

            {settings.logo_path ? (
                <img
                    src={settings.logo_path}
                    alt="Logo"
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/10 p-1 object-contain border border-white/25 shadow-lg shrink-0"
                />
            ) : (
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/15 grid place-items-center font-extrabold border border-white/25 text-sm shadow-lg shrink-0">
                    {settings.app_name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .substring(0, 3)
                        .toUpperCase()}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <h1 className="font-extrabold truncate text-sm md:text-base tracking-tight">
                    {settings.app_name}
                </h1>
                {settings.app_slogan && (
                    <p className="text-[11px] text-white/65 truncate hidden sm:block mt-0.5">
                        {settings.app_slogan}
                    </p>
                )}
            </div>

            {user && (
                <button
                    onClick={() => navigate("/profile")}
                    className="hidden md:flex items-center gap-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full pl-1 pr-3 py-1 transition-all shrink-0 group"
                    title="View profile"
                >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-[10px] font-extrabold text-slate-900 shadow-sm">
                        {(user.name || user.email || "?")
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()}
                    </div>
                    <div className="text-left max-w-[140px]">
                        <p className="text-[11px] font-semibold text-white truncate leading-tight">
                            {user.name || user.email}
                        </p>
                        <p className="text-[9px] text-gold-300 font-bold uppercase tracking-wider leading-tight">
                            {user.role}
                        </p>
                    </div>
                </button>
            )}

            <button
                onClick={() => navigate("/profile")}
                className="md:hidden bg-white/10 hover:bg-white/20 border border-white/20 text-white w-9 h-9 rounded-full grid place-items-center shrink-0 transition-colors"
                title="Profile"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </button>

            <button
                onClick={logout}
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors shadow-lg shadow-gold-500/20 flex items-center gap-1.5"
                title="Logout"
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
            </button>
        </header>
    );

    // ────────────────────────────────────────────────────────
    // VERTICAL MODE
    // ────────────────────────────────────────────────────────
    if (isVertical) {
        return (
            <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50/30">
                <aside
                    className={`relative text-white flex flex-col h-screen transition-[width] duration-300 ease-in-out shrink-0 ${
                        collapsed ? "w-[68px]" : "w-[260px]"
                    }`}
                    style={{
                        background:
                            "linear-gradient(180deg, #1e1b4b 0%, #3b1e7a 45%, #4c1d95 100%)",
                    }}
                >
                    {/* Brand block */}
                    <div
                        className={`px-3 py-4 flex items-center gap-3 border-b border-white/10 shrink-0 ${collapsed ? "justify-center" : ""}`}
                    >
                        {settings.logo_path ? (
                            <img
                                src={settings.logo_path}
                                alt="Logo"
                                className="w-10 h-10 rounded-xl bg-white/10 p-1 object-contain shrink-0 border border-white/20"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center font-extrabold shrink-0 border border-white/20 text-sm">
                                {settings.app_name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .substring(0, 3)
                                    .toUpperCase()}
                            </div>
                        )}
                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-extrabold truncate leading-tight">
                                    {settings.app_name}
                                </div>
                                {settings.app_slogan && (
                                    <div className="text-[10px] text-white/55 truncate mt-0.5">
                                        {settings.app_slogan}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Nav sections */}
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
                        {visibleSections.map((section, sIdx) => (
                            <div
                                key={section.label}
                                className={
                                    sIdx > 0
                                        ? "mt-3 pt-3 border-t border-white/5"
                                        : ""
                                }
                            >
                                {!collapsed && (
                                    <p className="px-4 pb-1.5 text-[9px] uppercase font-extrabold tracking-[0.15em] text-white/35">
                                        {section.label}
                                    </p>
                                )}
                                {section.items.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        title={
                                            collapsed ? item.label : undefined
                                        }
                                        className={({ isActive }) =>
                                            `group relative flex items-center gap-3 mx-2 my-0.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                                collapsed
                                                    ? "px-0 py-3 justify-center"
                                                    : "px-3 py-2.5"
                                            } ${
                                                isActive
                                                    ? "bg-white/15 text-white shadow-lg shadow-purple-900/40"
                                                    : "text-white/70 hover:bg-white/8 hover:text-white"
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                {isActive && !collapsed && (
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold-400 rounded-r-full"></span>
                                                )}
                                                <span
                                                    className={`text-lg shrink-0 ${isActive ? "scale-110" : ""} transition-transform`}
                                                >
                                                    {item.icon}
                                                </span>
                                                {!collapsed && (
                                                    <>
                                                        <span className="flex-1 truncate">
                                                            {item.label}
                                                        </span>
                                                        {item.badge === "dup" &&
                                                            data?.duplicate_flags >
                                                                0 && (
                                                                <span className="text-[10px] font-extrabold bg-rose-500 text-white rounded-full px-1.5 min-w-[20px] text-center py-0.5">
                                                                    {
                                                                        data.duplicate_flags
                                                                    }
                                                                </span>
                                                            )}
                                                        {item.badge === "ren" &&
                                                            data?.renewals_due >
                                                                0 && (
                                                                <span className="text-[10px] font-extrabold bg-gold-500 text-slate-900 rounded-full px-1.5 min-w-[20px] text-center py-0.5">
                                                                    {
                                                                        data.renewals_due
                                                                    }
                                                                </span>
                                                            )}
                                                    </>
                                                )}
                                                {collapsed &&
                                                    ((item.badge === "dup" &&
                                                        data?.duplicate_flags >
                                                            0) ||
                                                        (item.badge === "ren" &&
                                                            data?.renewals_due >
                                                                0)) && (
                                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-purple-900"></span>
                                                    )}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </div>
                        ))}
                    </nav>

                    {/* Collapse button */}
                    <div className="border-t border-white/10 p-3 shrink-0">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="w-full text-xs font-bold text-white/60 hover:text-white flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                            title={
                                collapsed
                                    ? "Expand sidebar"
                                    : "Collapse sidebar"
                            }
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
                            >
                                <polyline points="11 17 6 12 11 7" />
                                <polyline points="18 17 13 12 18 7" />
                            </svg>
                            {!collapsed && <span>Collapse</span>}
                        </button>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                    {Header}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="max-w-7xl mx-auto px-4 py-6">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // ────────────────────────────────────────────────────────
    // HORIZONTAL MODE
    // ────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50/30">
            {Header}

            <nav className="bg-white border-b border-slate-200 flex overflow-x-auto shrink-0 shadow-sm">
                {visibleSections.map((section, sIdx) => (
                    <div
                        key={section.label}
                        className={`flex items-stretch ${sIdx > 0 ? "border-l border-slate-200" : ""}`}
                    >
                        {section.items.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `relative px-4 py-3.5 text-sm font-semibold whitespace-nowrap flex items-center gap-2 shrink-0 transition-all ${
                                        isActive
                                            ? "text-purple-800 bg-purple-50/60"
                                            : "text-slate-500 hover:text-purple-700 hover:bg-purple-50/30"
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <span
                                            className={`text-base transition-transform ${isActive ? "scale-110" : ""}`}
                                        >
                                            {item.icon}
                                        </span>
                                        <span>{item.label}</span>
                                        {item.badge === "dup" &&
                                            data?.duplicate_flags > 0 && (
                                                <span className="text-[10px] font-extrabold bg-rose-100 text-rose-700 rounded-full px-1.5 min-w-[18px] text-center py-0.5">
                                                    {data.duplicate_flags}
                                                </span>
                                            )}
                                        {item.badge === "ren" &&
                                            data?.renewals_due > 0 && (
                                                <span className="text-[10px] font-extrabold bg-gold-100 text-gold-700 rounded-full px-1.5 min-w-[18px] text-center py-0.5">
                                                    {data.renewals_due}
                                                </span>
                                            )}
                                        {isActive && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-purple-400"></span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
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
