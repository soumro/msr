import { NavLink, Outlet } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDashboard } from "../services/scholarships";

const TABS = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/register", label: "Master Register" },
    { to: "/duplicates", label: "Duplicate-Aid Checks" },
    { to: "/renewals", label: "Renewals" },
    { to: "/applications", label: "Application Tracking" },
    { to: "/reconciliation", label: "Financial Reconciliation" },
    { to: "/reports/year-end", label: "Year-End Report" },
    { to: "/support", label: "Student Support" },
    { to: "/import", label: "Bulk Import" },
    { to: "/settings/lookups", label: "Lookups" },
    { to: "/settings/audit", label: "📜 Audit Log" },
];

export default function Layout() {
    const qc = useQueryClient();

    // Fetch dashboard — non-critical, wrap in try/catch equivalent
    const { data } = useQuery({
        queryKey: ["dashboard"],
        queryFn: fetchDashboard,
        retry: false,
    });

    const logout = async () => {
        // 1. Try the API logout
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
        } catch (e) {
            // Ignore — we'll force-navigate anyway
        }

        // 2. Clear client state
        try {
            qc.clear();
        } catch (e) {}

        // 3. Hard navigate to login
        window.location.href = "/login";
    };

    return (
        <div className="min-h-screen">
            <header className="bg-emerald-900 text-white px-6 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center font-extrabold border border-white/20">
                    MSR
                </div>
                <div className="flex-1">
                    <h1 className="font-semibold">
                        Master Scholarship Register
                    </h1>
                    <p className="text-xs text-white/70">
                        Laravel + React monolith
                    </p>
                </div>
                <button
                    onClick={logout}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                    Logout
                </button>
            </header>

            <nav className="bg-white border-b flex overflow-x-auto sticky top-0 z-40">
                {TABS.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        className={({ isActive }) =>
                            `px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap flex items-center gap-2 ${
                                isActive
                                    ? "border-emerald-700 text-emerald-800"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                            }`
                        }
                    >
                        {t.label}
                        {t.to === "/duplicates" &&
                            data &&
                            data.duplicate_flags > 0 && (
                                <span className="text-[11px] font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                                    {data.duplicate_flags}
                                </span>
                            )}
                        {t.to === "/renewals" &&
                            data &&
                            data.renewals_due > 0 && (
                                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                                    {data.renewals_due}
                                </span>
                            )}
                    </NavLink>
                ))}
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
