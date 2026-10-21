import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/user")
            .then((r) => setUser(r.data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const can = (action) => {
        if (!user) return false;
        const map = {
            edit: ["admin", "committee"],
            finance: ["admin", "finance"],
            manage: ["admin"],
        };
        return map[action]?.includes(user.role) ?? false;
    };

    return (
        <AuthContext.Provider value={{ user, loading, can }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
