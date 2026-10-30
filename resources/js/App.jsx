import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Duplicates from "./pages/Duplicates";
import Renewals from "./pages/Renewals";
import Applications from "./pages/Applications";
import Reconciliation from "./pages/Reconciliation";
import YearEndReport from "./pages/YearEndReport";
import Support from "./pages/Support";
import Import from "./pages/Import";
import Lookups from "./pages/Lookups";
import AuditLogs from "./pages/AuditLogs";
import Profile from "./pages/Profile";
import AppSettings from "./pages/AppSettings";
import MultiRecordStudents from "./pages/MultiRecordStudents";
import PendingInstallments from "./pages/PendingInstallments";

const qc = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
    return (
        <QueryClientProvider client={qc}>
            <AuthProvider>
                <SettingsProvider>
                    <ToastProvider>
                        <ConfirmProvider>
                            <BrowserRouter>
                                <Routes>
                                    {/* ⚠️ EVERY page route MUST be inside this Layout wrapper.
                      Anything outside it renders WITHOUT the header/nav/sidebar. */}
                                    <Route element={<Layout />}>
                                        <Route
                                            index
                                            element={
                                                <Navigate
                                                    to="/dashboard"
                                                    replace
                                                />
                                            }
                                        />

                                        <Route
                                            path="/dashboard"
                                            element={<Dashboard />}
                                        />
                                        <Route
                                            path="/register"
                                            element={<Register />}
                                        />
                                        <Route
                                            path="/duplicates"
                                            element={<Duplicates />}
                                        />
                                        <Route
                                            path="/renewals"
                                            element={<Renewals />}
                                        />
                                        <Route
                                            path="/applications"
                                            element={<Applications />}
                                        />
                                        <Route
                                            path="/reconciliation"
                                            element={<Reconciliation />}
                                        />
                                        <Route
                                            path="/reports/year-end"
                                            element={<YearEndReport />}
                                        />
                                        <Route
                                            path="/reports/multi-record"
                                            element={<MultiRecordStudents />}
                                        />
                                        <Route
                                            path="/support"
                                            element={<Support />}
                                        />
                                        <Route
                                            path="/import"
                                            element={<Import />}
                                        />
                                        <Route
                                            path="/settings/lookups"
                                            element={<Lookups />}
                                        />
                                        <Route
                                            path="/settings/audit"
                                            element={<AuditLogs />}
                                        />
                                        <Route
                                            path="/settings/app"
                                            element={<AppSettings />}
                                        />
                                        <Route
                                            path="/profile"
                                            element={<Profile />}
                                        />

                                        <Route
                                            path="*"
                                            element={
                                                <Navigate
                                                    to="/dashboard"
                                                    replace
                                                />
                                            }
                                        />
                                        <Route
                                            path="/reports/pending-installments"
                                            element={<PendingInstallments />}
                                        />
                                    </Route>
                                </Routes>
                            </BrowserRouter>
                        </ConfirmProvider>
                    </ToastProvider>
                </SettingsProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
