import axios from 'axios';

// =========================================================================
// 🌐 SMART API URL CONFIGURATION (Live Hostinger & Local Development)
// =========================================================================
export const LIVE_API_URL = 'https://whitesmoke-goshawk-594665.hostingersite.com';
export const LOCAL_API_URL = 'http://localhost:5000';

// When built for production (dist), ALWAYS use LIVE_API_URL.
// Only use LOCAL_API_URL when explicitly running in Vite dev server (import.meta.env.DEV) on localhost.
const isDev = Boolean(import.meta.env.DEV);
const isLocalHost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
);

const isLocal = isDev && isLocalHost;

export const API_BASE_URL = isLocal ? LOCAL_API_URL : (import.meta.env.VITE_API_URL || LIVE_API_URL);

// Automatically routes all requests to API_BASE_URL and attaches JWT Token
axios.defaults.baseURL = API_BASE_URL;

axios.interceptors.request.use((config) => {
    // If request contains localhost:5000 while in production/dist build, rewrite to live API URL
    if (config.url) {
        if (!isLocal) {
            if (config.url.includes('http://localhost:5000')) {
                config.url = config.url.replace(/http:\/\/localhost:5000/g, API_BASE_URL);
            } else if (config.url.includes('localhost:5000')) {
                config.url = config.url.replace(/localhost:5000/g, API_BASE_URL.replace(/^https?:\/\//, ''));
            }
        } else if (isLocal && config.url.includes('whitesmoke-goshawk-594665.hostingersite.com')) {
            config.url = config.url.replace(/https:\/\/whitesmoke-goshawk-594665\.hostingersite\.com/g, LOCAL_API_URL);
        }
    }

    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default API_BASE_URL;
