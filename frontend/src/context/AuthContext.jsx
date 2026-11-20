import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const applyTheme = (theme) => {
        const isSkite = user?.isSkiteTenant || user?.email?.includes('skite') || localStorage.getItem('user')?.includes('skite');
        const defaultTheme = isSkite ? 'skite-orange' : 'default';
        const activeTheme = theme || localStorage.getItem('app-theme') || defaultTheme;
        
        if (activeTheme === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', activeTheme);
        }
        localStorage.setItem('app-theme', activeTheme);
    };

    useEffect(() => {
        const verifyUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const res = await axios.get('http://localhost:5000/api/auth/me');
                    setUser(res.data);
                    localStorage.setItem('user', JSON.stringify(res.data));
                    const effectiveTheme = res.data.theme || (res.data.isSkiteTenant ? 'skite-orange' : 'default');
                    applyTheme(effectiveTheme);
                } catch (error) {
                    console.error("Token verification failed:", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    delete axios.defaults.headers.common['Authorization'];
                    applyTheme('skite-orange');
                }
            } else {
                setUser(null);
                applyTheme('skite-orange');
            }
            setLoading(false);
        };
        verifyUser();
    }, []);

    const clearTenantStorage = () => {
        localStorage.removeItem('invoice-custom-logo');
        localStorage.removeItem('invoice-custom-sign');
        localStorage.removeItem('invoice-custom-seal');
        localStorage.removeItem('invoice-company-details');
        localStorage.removeItem('selected-invoice-template');
    };

    const login = async (email, password, role) => {
        try {
            clearTenantStorage();
            const res = await axios.post('http://localhost:5000/api/auth/login', { email, password, role });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
            applyTheme(res.data.user.theme);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (registerData) => {
        try {
            clearTenantStorage();
            const res = await axios.post('http://localhost:5000/api/auth/register', registerData);
            if (res.data.token && res.data.user) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setUser(res.data.user);
                axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
                applyTheme(res.data.user.theme);
            }
            return { success: true, message: res.data.message, user: res.data.user };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        clearTenantStorage();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        applyTheme('default');
    };

    const updateContextUser = (updates) => {
        const newUser = { ...user, ...updates };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
        if (updates.theme) {
            applyTheme(updates.theme);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, updateContextUser }}>
            {children}
        </AuthContext.Provider>
    );
};
