import api from "./api";

// Scholarships
export const fetchScholarships = (params = {}) =>
    api.get("/scholarships", { params }).then((r) => r.data);
export const fetchScholarship = (id) =>
    api.get(`/scholarships/${id}`).then((r) => r.data.data);
export const createScholarship = (p) =>
    api.post("/scholarships", p).then((r) => r.data);
export const updateScholarship = (id, p) =>
    api.put(`/scholarships/${id}`, p).then((r) => r.data);
export const deleteScholarship = (id) => api.delete(`/scholarships/${id}`);

// Duplicates
export const fetchDuplicates = () =>
    api.get("/duplicates").then((r) => r.data.data);
export const reviewDuplicate = (id, review_status, committee_note) =>
    api
        .post(`/duplicates/${id}/review`, { review_status, committee_note })
        .then((r) => r.data);

// Dashboard
export const fetchDashboard = () => api.get("/dashboard").then((r) => r.data);

// Applications
export const fetchApplications = (params = {}) =>
    api.get("/applications", { params }).then((r) => r.data);
export const fetchApplication = (id) =>
    api.get(`/applications/${id}`).then((r) => r.data);
export const createApplication = (p) =>
    api.post("/applications", p).then((r) => r.data);
export const updateApplication = (id, p) =>
    api.put(`/applications/${id}`, p).then((r) => r.data);
export const deleteApplication = (id) => api.delete(`/applications/${id}`);

// Reconciliation
export const fetchReconciliation = () =>
    api.get("/reconciliation").then((r) => r.data.data);
export const updateReceived = (p) =>
    api.put("/reconciliation", p).then((r) => r.data);

// Announcements
export const fetchAnnouncements = (params = {}) =>
    api.get("/announcements", { params }).then((r) => r.data.data);
export const createAnnouncement = (p) =>
    api.post("/announcements", p).then((r) => r.data);
export const updateAnnouncement = (id, p) =>
    api.put(`/announcements/${id}`, p).then((r) => r.data);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// Lookups
export const fetchLookups = (type) =>
    api.get("/lookups", { params: { type } }).then((r) => r.data.data);
export const createLookup = (type, name) =>
    api.post("/lookups", { type, name }).then((r) => r.data);
export const deleteLookup = (id) => api.delete(`/lookups/${id}`);

export const fetchRenewals = (params = {}) =>
    api.get("/renewals", { params }).then((r) => r.data);
export const updateRenewalStatus = (
    id,
    renewal_status,
    rejection_reason = "",
) =>
    api
        .patch(`/renewals/${id}/status`, { renewal_status, rejection_reason })
        .then((r) => r.data);
export const bulkRenewalStatus = (ids, renewal_status) =>
    api
        .post("/renewals/bulk-status", { ids, renewal_status })
        .then((r) => r.data);

export const fetchYearEndReport = (academic_year) =>
    api
        .get("/reports/year-end", { params: { academic_year } })
        .then((r) => r.data);

export const downloadImportTemplate = () => {
    window.location.href = "/api/import/template";
};
export const downloadSheetTemplate = () => {
    window.location.href = "/api/import/sheet-template";
};
export const validateImport = (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
        .post("/import/validate", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
};
export const commitImport = (file, skipInvalid = true) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("skip_invalid", skipInvalid ? "1" : "0");
    return api
        .post("/import/commit", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
};
export const validateSheet = (file, context) => {
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(context).forEach(([k, v]) => fd.append(k, v ?? ""));
    return api
        .post("/import/sheet-validate", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
};
export const commitSheet = (file, context) => {
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(context).forEach(([k, v]) => fd.append(k, v ?? ""));
    return api
        .post("/import/sheet-commit", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
};
export const fetchImportHistory = () =>
    api.get("/import/history").then((r) => r.data.data);

export const promoteApplication = (id) =>
    api.post(`/applications/${id}/promote`).then((r) => r.data);

export const bulkUpdateScholarships = (ids, patch) =>
    api.patch("/scholarships/bulk", { ids, ...patch }).then((r) => r.data);
