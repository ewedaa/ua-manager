import React, { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
    ADMIN: 'admin',
    VIEWER: 'viewer',
};

export function AuthProvider({ children }) {
    // App is open to everyone — no login required
    const value = {
        user: { username: 'user', role: ROLES.ADMIN },
        login: () => ({ success: true, role: ROLES.ADMIN }),
        logout: () => { },
        isAdmin: true,
        isLoggedIn: true,
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
