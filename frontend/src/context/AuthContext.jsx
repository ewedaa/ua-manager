import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
    ADMIN: 'admin',
    VIEWER: 'viewer',
};

// Hardcoded users for demo/basic auth
const USERS = {
    'admin': { password: '123', role: ROLES.ADMIN },
    'viewer': { password: '123', role: ROLES.VIEWER },
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('auth_user');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (username, password) => {
        const userRec = USERS[username.toLowerCase()];
        if (userRec && userRec.password === password) {
            const userData = { username: username.toLowerCase(), role: userRec.role };
            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            return { success: true, role: userRec.role };
        }
        return { success: false, error: 'Invalid username or password' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth_user');
    };

    const value = {
        user,
        login,
        logout,
        isAdmin: user?.role === ROLES.ADMIN,
        isLoggedIn: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;
