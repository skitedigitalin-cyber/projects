import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const res = await axios.get('http://localhost:5000/api/auth/me');
                    setUser(res.data);
                    localStorage.setItem('user', JSON.stringify(res.data));
                } catch (error) {
                    console.error("Token verification failed:", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    delete axios.defaults.headers.common['Authorization'];
                }
            } else {
                setUser(null);
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
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
