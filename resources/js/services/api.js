import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "X-CSRF-TOKEN":
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") ?? "",
    },
    withCredentials: true,
});

export default api;
