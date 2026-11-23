import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
    ArrowRight, Check, X, Lock, Mail, Building2, UserRound, 
    Layers, Briefcase, FileText, Users, CalendarDays, 
    ArrowUpRight, Plus, Minus, Sparkles, ShieldCheck, 
    Clock, TrendingUp, CheckCircle2, ChevronRight, Zap,
    Eye, EyeOff, CreditCard, QrCode, Smartphone, Landmark, Shield
} from 'lucide-react';

export default function LandingPage() {
    const { user, register, login, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('Free Trial'); // 'Free Trial' | 'Growth' | 'Enterprise'
    const [openFaq, setOpenFaq] = useState(0);

    const scrollToSection = (e, id) => {
        if (e) e.preventDefault();
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.pushState(null, '', `#${id}`);
        }
    };

    useEffect(() => {
        if (window.location.hash) {
            const id = window.location.hash.replace('#', '');
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 200);
        }
    }, []);

    // Interactive Floating Login State
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [activeRole, setActiveRole] = useState('Admin'); // 'Admin' | 'Employee'
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const loginRef = useRef(null);

    const handleRoleSelect = (role) => {
        setActiveRole(role);
        setLoginError('');
        setLoginPassword('');
    };

    // Dismiss login dropdown on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (loginRef.current && !loginRef.current.contains(e.target)) {
                setIsLoginOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsLoginOpen(false);
            }
        };
        if (isLoginOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isLoginOpen]);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);

        try {
            const res = await login(loginEmail, loginPassword, activeRole);
            if (res.success) {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

                setIsLoginOpen(false);
                if (storedUser.role === 'CEO') {
                    navigate('/ceo-dashboard');
                } else if (storedUser.role === 'Admin') {
                    navigate('/dashboard');
                } else {
                    navigate('/employee-dashboard');
                }
            } else {
                setLoginError(res.message || 'Invalid email or password');
            }
        } catch (err) {
            setLoginError(err.response?.data?.message || err.message || 'Authentication failed');
        } finally {
            setLoginLoading(false);
        }
    };

    // Registration Form State
    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        subDomain: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTabPreview, setActiveTabPreview] = useState('sales');

    // Payment Gateway State for Paid Plans (Growth & Enterprise)
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'upi' | 'netbanking'
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentStep, setPaymentStep] = useState('checkout'); // 'checkout' | 'otp' | 'processing' | 'success' | 'failed'
    const [paymentError, setPaymentError] = useState('');
    const [testOtp, setTestOtp] = useState('123456');
    const [upiId, setUpiId] = useState('success@razorpay');
    const [selectedBank, setSelectedBank] = useState('HDFC Bank (Test)');
    const [cardData, setCardData] = useState({
        number: '4111 1111 1111 1111',
        expiry: '12/28',
        cvv: '123',
        name: 'Razorpay Sandbox User'
    });

    const getPlanPrice = (plan) => {
        if (plan === 'Growth') return billingCycle === 'monthly' ? 1499 : 1199;
        if (plan === 'Enterprise') return billingCycle === 'monthly' ? 3999 : 3199;
        return 0;
    };

    const handleOpenRegister = (plan = 'Free Trial') => {
        setSelectedPlan(plan);
        setError('');
        setIsRegisterOpen(true);
    };

    const handleCompanyNameChange = (e) => {
        const val = e.target.value;
        const autoSub = val.toLowerCase().replace(/[^a-z0-9]/g, '');
        setFormData(prev => ({
            ...prev,
            companyName: val,
            subDomain: autoSub
        }));
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // If user chose a paid plan (Growth or Enterprise), require Razorpay payment!
        if (selectedPlan !== 'Free Trial') {
            setLoading(true);
            try {
                // Fetch order details from backend
                const orderRes = await axios.post('http://localhost:5000/api/billing/create-registration-order', {
                    plan: selectedPlan,
                    billingCycle
                });
                const orderData = orderRes.data;

                // Check if real live Razorpay key is configured
                const isRealKey = orderData.keyId && 
                                  !orderData.keyId.includes('demo') && 
                                  !orderData.keyId.includes('dummy') && 
                                  !orderData.keyId.includes('skite');

                if (isRealKey) {
                    const loaded = await loadRazorpayScript();
                    if (loaded && window.Razorpay) {
                        const rzp = new window.Razorpay({
                            key: orderData.keyId,
                            amount: orderData.amount,
                            currency: orderData.currency,
                            name: 'Skite Prime',
                            description: `${selectedPlan} Workspace Subscription`,
                            order_id: orderData.orderId,
                            prefill: {
                                name: formData.adminName,
                                email: formData.adminEmail
                            },
                            notes: {
                                company: formData.companyName,
                                plan: selectedPlan
                            },
                            theme: {
                                color: '#ff4603'
                            },
                            handler: async function (response) {
                                await handleFinalizeRegistration(response.razorpay_payment_id || `pay_rzp_${Date.now()}`);
                            },
                            modal: {
                                ondismiss: function () {
                                    setLoading(false);
                                    setError('Razorpay payment cancelled! To activate your workspace, payment is required.');
                                }
                            }
                        });
                        rzp.open();
                        setLoading(false);
                        return;
                    }
                }

                // If demo/test sandbox, launch authentic Razorpay checkout modal
                setIsRegisterOpen(false);
                setPaymentStep('checkout');
                setPaymentError('');
                setPaymentLoading(false);
                setTestOtp('123456');
                setPaymentMethod('card');
                setCardData(prev => ({ 
                    number: '4111 1111 1111 1111', 
                    expiry: '12/28', 
                    cvv: '123', 
                    name: formData.adminName || 'Razorpay Sandbox User' 
                }));
                setIsPaymentOpen(true);
            } catch (err) {
                console.error('Razorpay order creation fallback:', err);
                setIsRegisterOpen(false);
                setPaymentStep('checkout');
                setPaymentError('');
                setPaymentLoading(false);
                setTestOtp('123456');
                setCardData(prev => ({ 
                    number: '4111 1111 1111 1111', 
                    expiry: '12/28', 
                    cvv: '123', 
                    name: formData.adminName || 'Razorpay Sandbox User' 
                }));
                setIsPaymentOpen(true);
            } finally {
                setLoading(false);
            }
            return;
        }

        // Free Trial: register directly with 0 payment
        setLoading(true);
        try {
            const res = await register({
                companyName: formData.companyName,
                subDomain: formData.subDomain,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword,
                plan: 'Free Trial'
            });

            if (res.success) {
                setIsRegisterOpen(false);
                navigate('/dashboard');
            } else {
                setError(res.message || 'Registration failed. Please verify your details.');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error creating account');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizeRegistration = async (paymentId) => {
        setLoading(true);
        try {
            const res = await register({
                companyName: formData.companyName,
                subDomain: formData.subDomain,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword,
                plan: selectedPlan,
                paymentId: paymentId
            });

            if (res.success) {
                setIsRegisterOpen(false);
                setIsPaymentOpen(false);
                navigate('/dashboard');
            } else {
                setError(res.message || 'Registration failed after payment.');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error creating account');
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerOtp = () => {
        setPaymentStep('otp');
        setTestOtp('123456');
        setPaymentError('');
    };

    const handleSubmitOtp = () => {
        if (testOtp.trim() === '123456') {
            handleSimulateSuccess('pay_rzp_test_otp_' + Math.random().toString(36).substring(2, 9));
        } else {
            handleSimulateFailure('Invalid 3D Secure OTP entered. Verification failed at ACS issuing bank (expected test OTP is 123456).');
        }
    };

    const handleSimulateSuccess = async (customPaymentId) => {
        setPaymentLoading(true);
        setPaymentStep('processing');

        setTimeout(async () => {
            const generatedPaymentId = customPaymentId || ('pay_rzp_test_' + Math.random().toString(36).substring(2, 10).toLowerCase() + '_' + Date.now());
            try {
                const res = await register({
                    companyName: formData.companyName,
                    subDomain: formData.subDomain,
                    adminName: formData.adminName,
                    adminEmail: formData.adminEmail,
                    adminPassword: formData.adminPassword,
                    plan: selectedPlan,
                    paymentId: generatedPaymentId
                });

                if (res.success) {
                    setPaymentStep('success');
                    setTimeout(() => {
                        setIsPaymentOpen(false);
                        navigate('/dashboard');
                    }, 1500);
                } else {
                    setPaymentStep('failed');
                    setPaymentError(res.message || 'Payment verification failed at server.');
                }
            } catch (err) {
                setPaymentStep('failed');
                setPaymentError(err.response?.data?.message || 'Payment processing failed.');
            } finally {
                setPaymentLoading(false);
            }
        }, 1200);
    };

    const handleSimulateFailure = (reason) => {
        setPaymentLoading(true);
        setPaymentStep('processing');

        setTimeout(() => {
            setPaymentLoading(false);
            setPaymentStep('failed');
            setPaymentError(reason || 'Payment Failed: Transaction declined by bank network (BAD_REQUEST_PAYMENT_DECLINED). No money was deducted.');
        }, 800);
    };

    const handleTryAgain = () => {
        setPaymentStep('checkout');
        setPaymentError('');
        setPaymentLoading(false);
    };

    const handleCompletePayment = () => {
        if (paymentMethod === 'card' && cardData.number.replace(/\s+/g, '').endsWith('1092')) {
            handleSimulateFailure('Card declined: Insufficient funds in test bank account (BAD_REQUEST_PAYMENT_DECLINED)');
            return;
        }
        if (paymentMethod === 'upi' && upiId.toLowerCase().includes('fail')) {
            handleSimulateFailure('UPI transaction failed: VPA declined by customer bank (BAD_REQUEST_PAYMENT_DECLINED)');
            return;
        }
        handleSimulateSuccess();
    };

    const handleCancelPayment = () => {
        setIsPaymentOpen(false);
        setIsRegisterOpen(true);
        setError(`Razorpay payment cancelled! To activate the ${selectedPlan} workspace, payment is required.`);
    };

    const toggleFaq = (idx) => {
        setOpenFaq(openFaq === idx ? null : idx);
    };

    return (
        <div className="min-h-screen bg-[#f5f5f3] text-slate-900 font-sans selection:bg-[#ff4603]/20 selection:text-[#ff4603] relative overflow-x-hidden">
            {/* Ambient Breathing Glow Orbs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-[#ff4603]/15 via-orange-100/30 to-transparent blur-3xl pointer-events-none -z-10 animate-pulse-glow"></div>
            <div className="absolute top-48 -left-32 w-96 h-96 bg-[#ff4603]/10 rounded-full blur-3xl pointer-events-none -z-10 animate-float-slow"></div>
            <div className="absolute top-96 -right-32 w-[28rem] h-[28rem] bg-orange-200/20 rounded-full blur-3xl pointer-events-none -z-10 animate-float-reverse"></div>

            {/* Subtle Clean Grid Texture */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#e6e6e3_1px,transparent_1px),linear-gradient(to_bottom,#e6e6e3_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35 pointer-events-none -z-10 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

            {/* 1. Header Navigation */}
            <header className="sticky top-4 z-40 px-4 max-w-6xl mx-auto animate-fade-up">
                <nav className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-500">
                    {/* Brand */}
                    <div 
                        className="flex items-center space-x-3 cursor-pointer group" 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <div className="w-8 h-8 rounded-xl bg-[#ff4603] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-[#ff4603]/25 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500">
                            <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-[#ff4603] transition-colors duration-300">Skite Prime</span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#ff4603] border border-orange-200/80">
                                Enterprise Suite
                            </span>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
                        <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-[#ff4603] transition-colors duration-300">Overview</a>
                        <a href="#packages" onClick={(e) => scrollToSection(e, 'packages')} className="hover:text-[#ff4603] transition-colors duration-300 flex items-center gap-1.5 group">
                            <span>Packages & Trial</span>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping-subtle absolute inline-flex h-full w-full rounded-full bg-[#ff4603]/60 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4603]"></span>
                            </span>
                        </a>
                        <a href="#modules" onClick={(e) => scrollToSection(e, 'modules')} className="hover:text-[#ff4603] transition-colors duration-300">Modules</a>
                        <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-[#ff4603] transition-colors duration-300">FAQ</a>
                    </div>

                    {/* Action Hub */}
                    <div className="flex items-center space-x-3">
                        {user ? (
                            <Link 
                                to={user.role === 'CEO' ? '/ceo-dashboard' : (user.role !== 'Admin' ? '/employee-dashboard' : '/dashboard')} 
                                className="group px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow active:scale-98"
                            >
                                <span>Go to Workspace</span>
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-500" />
                            </Link>
                        ) : (
                            <>
                                {/* 👤 Interactive User Icon + Creative Popover Login Form */}
                                <div className="relative" ref={loginRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsLoginOpen(prev => !prev);
                                            setLoginError('');
                                        }}
                                        className={`group relative w-9 h-9 rounded-xl transition-all duration-300 flex items-center justify-center border cursor-pointer ${
                                            isLoginOpen 
                                                ? 'bg-[#ff4603] text-white border-[#ff4603] shadow-md shadow-[#ff4603]/30 scale-105' 
                                                : 'bg-white hover:bg-orange-50 text-slate-700 hover:text-[#ff4603] border-slate-200/90 hover:border-orange-300 shadow-xs hover:shadow'
                                        }`}
                                        title="Account Login"
                                        aria-label="User Login"
                                    >
                                        <UserRound size={17} className={`transition-transform duration-300 ${isLoginOpen ? 'scale-110' : 'group-hover:scale-110'}`} />
                                        {/* Status pulse dot */}
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4603]/60 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff4603] border-2 border-white"></span>
                                        </span>
                                    </button>

                                    {/* Different Style Popover Login Form Card */}
                                    {isLoginOpen && (
                                        <div className="absolute right-0 top-full mt-3 w-[330px] sm:w-[360px] z-50 animate-scale-in origin-top-right">
                                            {/* Caret pointer */}
                                            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-l border-slate-200/90 rotate-45 z-20"></div>

                                            {/* Double Bezel Outer Frame */}
                                            <div className="p-1.5 bg-gradient-to-b from-slate-100 via-white to-slate-100/90 rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-900/20 backdrop-blur-2xl relative">
                                                <div className="bg-white rounded-[1.35rem] p-5 border border-slate-100 text-left">
                                                    {/* Card Header */}
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-[#ff4603] border border-orange-200/80 text-[11px] font-bold">
                                                            <Sparkles size={11} className="text-[#ff4603]" />
                                                            <span>Instant Portal Login</span>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setIsLoginOpen(false)}
                                                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>

                                                    <div className="mt-3 mb-3">
                                                        <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Welcome Back</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Quick sign in with your workspace role</p>
                                                    </div>

                                                    {/* Role Quick Selector (Admin & Employee) */}
                                                    <div className="mb-4">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Role</div>
                                                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-xl">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRoleSelect('Admin')}
                                                                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                    activeRole === 'Admin' 
                                                                        ? 'bg-white text-[#ff4603] shadow-sm' 
                                                                        : 'text-slate-500 hover:text-slate-800'
                                                                }`}
                                                            >
                                                                Admin
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRoleSelect('Employee')}
                                                                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                    activeRole === 'Employee' 
                                                                        ? 'bg-white text-[#ff4603] shadow-sm' 
                                                                        : 'text-slate-500 hover:text-slate-800'
                                                                }`}
                                                            >
                                                                Employee
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Error alert */}
                                                    {loginError && (
                                                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2 mb-3 animate-fade-in">
                                                            <X size={13} className="text-rose-500 shrink-0" />
                                                            <span className="truncate">{loginError}</span>
                                                        </div>
                                                    )}

                                                    {/* Login Form */}
                                                    <form onSubmit={handleLoginSubmit} className="space-y-3">
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Email</label>
                                                            <div className="relative">
                                                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input 
                                                                    type="email" 
                                                                    required 
                                                                    placeholder="name@company.com"
                                                                    value={loginEmail}
                                                                    onChange={(e) => setLoginEmail(e.target.value)}
                                                                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff4603] focus:ring-2 focus:ring-[#ff4603]/15 focus:bg-white transition-all shadow-inner"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
                                                            <div className="relative">
                                                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input 
                                                                    type={showPassword ? "text" : "password"} 
                                                                    required 
                                                                    placeholder="••••••••"
                                                                    value={loginPassword}
                                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff4603] focus:ring-2 focus:ring-[#ff4603]/15 focus:bg-white transition-all shadow-inner"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowPassword(p => !p)}
                                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                                                    tabIndex={-1}
                                                                >
                                                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <button 
                                                            type="submit" 
                                                            disabled={loginLoading}
                                                            className="group w-full py-2.5 rounded-xl text-xs font-bold bg-[#ff4603] text-white hover:bg-[#e03a00] shadow-md shadow-[#ff4603]/25 hover:shadow-[#ff4603]/40 hover:-translate-y-0.5 active:scale-98 transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1 cursor-pointer"
                                                        >
                                                            {loginLoading ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                                    <span>Verifying...</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span>Sign In to Workspace</span>
                                                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </form>

                                                    {/* Footer Switcher */}
                                                    <div className="mt-3.5 pt-3 border-t border-slate-100 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsLoginOpen(false);
                                                                handleOpenRegister('Free Trial');
                                                            }}
                                                            className="text-[11px] font-semibold text-slate-500 hover:text-[#ff4603] transition-colors cursor-pointer inline-flex items-center gap-1"
                                                        >
                                                            <span>New organization?</span>
                                                            <span className="text-[#ff4603] font-bold underline underline-offset-2">Start 30-Day Free Trial</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleOpenRegister('Free Trial')}
                                    className="group px-4 py-2 rounded-xl text-xs font-semibold bg-[#ff4603] text-white hover:bg-[#e03a00] transition-all duration-500 flex items-center gap-1.5 shadow-md shadow-[#ff4603]/25 hover:shadow-[#ff4603]/40 hover:-translate-y-0.5 active:scale-98 cursor-pointer"
                                >
                                    <span>Start 30-Day Trial</span>
                                    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-500" />
                                </button>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* 2. Hero Section */}
            <section className="pt-16 pb-14 md:pt-24 md:pb-20 px-4 max-w-5xl mx-auto text-center">
                {/* Pill Eyebrow */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 text-[#ff4603] text-xs font-semibold tracking-wide mb-6 border border-orange-200 shadow-sm hover:border-orange-300 transition-all duration-500 animate-fade-up hover:scale-[1.02] cursor-default">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping-subtle absolute inline-flex h-full w-full rounded-full bg-[#ff4603]/60 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4603]"></span>
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-[#ff4603]" />
                    <span>30-Day Unrestricted Free Trial • No Credit Card Required</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#ff4603] text-white text-[10px] uppercase font-bold tracking-wider">Free</span>
                </div>

                {/* Grand Headline */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6 max-w-4xl mx-auto animate-fade-up delay-100">
                    The Modern Operating System for <br className="hidden sm:inline" />
                    <span className="bg-gradient-to-r from-[#ff4603] via-[#ff6a2b] to-[#e03a00] bg-clip-text text-transparent inline-block hover:scale-[1.01] transition-transform duration-500">
                        High-Velocity Teams.
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-10 font-normal animate-fade-up delay-200">
                    Lead pipeline tracking, GST-compliant invoicing, employee attendance with granular module permissions, 
                    and calendar scheduling — unified in a clean, effortless workspace.
                </p>

                {/* Dual CTAs with Button-in-Button kinetic architecture */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up delay-300">
                    <button
                        onClick={() => handleOpenRegister('Free Trial')}
                        className="group w-full sm:w-auto pl-8 pr-3 py-3.5 rounded-2xl text-sm font-bold text-white bg-[#ff4603] hover:bg-[#e03a00] shadow-xl shadow-[#ff4603]/25 hover:shadow-[#ff4603]/40 hover:-translate-y-1 active:scale-98 transition-all duration-500 ease-out flex items-center justify-between gap-4 cursor-pointer"
                    >
                        <span>Start 30-Day Free Trial</span>
                        <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:scale-105 transition-all duration-500 ease-out">
                            <ArrowRight size={16} />
                        </span>
                    </button>

                    <a
                        href="#packages"
                        onClick={(e) => scrollToSection(e, 'packages')}
                        className="group w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-98 transition-all duration-500 ease-out flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>Explore Packages & Quotas</span>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform duration-500 ease-out" />
                    </a>
                </div>

                {/* Trust Metrics Pill Strip */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-medium text-slate-700 border border-slate-200/90 py-4 px-6 max-w-4xl mx-auto bg-white/70 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition-all duration-500 animate-fade-up delay-400">
                    <div className="flex items-center gap-2 hover:text-[#ff4603] transition-colors duration-300">
                        <CheckCircle2 className="w-4 h-4 text-[#ff4603]" />
                        <span><strong>30 Days</strong> Full Access</span>
                    </div>
                    <div className="hidden sm:block text-slate-300">•</div>
                    <div className="flex items-center gap-2 hover:text-[#ff4603] transition-colors duration-300">
                        <CheckCircle2 className="w-4 h-4 text-[#ff4603]" />
                        <span><strong>Up to 5 Employees</strong></span>
                    </div>
                    <div className="hidden sm:block text-slate-300">•</div>
                    <div className="flex items-center gap-2 hover:text-[#ff4603] transition-colors duration-300">
                        <CheckCircle2 className="w-4 h-4 text-[#ff4603]" />
                        <span><strong>Up to 50 Leads</strong></span>
                    </div>
                    <div className="hidden sm:block text-slate-300">•</div>
                    <div className="flex items-center gap-2 hover:text-[#ff4603] transition-colors duration-300">
                        <CheckCircle2 className="w-4 h-4 text-[#ff4603]" />
                        <span><strong>25 GST Invoices</strong></span>
                    </div>
                </div>

                {/* 3. High-Fidelity Product UI Preview */}
                <div className="mt-14 max-w-5xl mx-auto text-left animate-fade-up delay-500">
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-200/60 overflow-hidden hover:shadow-[#ff4603]/10 transition-shadow duration-500">
                        {/* Chrome Top Bar */}
                        <div className="h-12 bg-slate-50 border-b border-slate-200 px-5 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-rose-400 hover:scale-110 transition-transform"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400 hover:scale-110 transition-transform"></div>
                                <div className="w-3 h-3 rounded-full bg-[#ff4603]/60 hover:scale-110 transition-transform"></div>
                                <span className="ml-3 font-mono text-xs text-slate-500 font-medium hidden sm:inline">app.skiteprime.com/workspace</span>
                            </div>

                            {/* Live Simulator Indicator & Tab Switcher */}
                            <div className="flex items-center space-x-3">
                                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-[11px] font-bold text-[#ff4603]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff4603] animate-pulse"></span>
                                    <span>Interactive Simulator</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {[
                                        { id: 'sales', label: 'Sales & Leads' },
                                        { id: 'finance', label: 'Invoicing & GST' },
                                        { id: 'hr', label: 'HR & Access' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTabPreview(tab.id)}
                                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                activeTabPreview === tab.id 
                                                    ? 'bg-[#ff4603] text-white shadow-sm shadow-[#ff4603]/30 scale-105' 
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Screen Content Body with Animated Tab Crossfade */}
                        <div key={activeTabPreview} className="p-6 sm:p-8 animate-fade-in">
                            {activeTabPreview === 'sales' && (
                                <>
                                    {/* Metric Cards Row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50/70 to-white border border-orange-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#ff4603]">
                                                    +18.4%
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">₹42,80,000</p>
                                            <p className="text-xs text-[#ff4603] font-medium mt-1">50 Leads Active (Trial Quota)</p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversion Rate</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    34.2%
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">14 Won</p>
                                            <p className="text-xs text-amber-700 font-medium mt-1">Highest velocity this month</p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-ups Today</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                                                    8 Due
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">0 Overdue</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">Automated alert sync</p>
                                        </div>
                                    </div>

                                    {/* Rich Data Rows */}
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 px-5 py-3 text-xs font-bold text-slate-600 grid grid-cols-12 border-b border-slate-200 uppercase tracking-wider">
                                            <span className="col-span-5">Lead / Company</span>
                                            <span className="col-span-3">Status</span>
                                            <span className="col-span-2">Value</span>
                                            <span className="col-span-2 text-right">Stage</span>
                                        </div>

                                        <div className="divide-y divide-slate-100 text-sm">
                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff4603] font-bold flex items-center justify-center text-xs shadow-sm">
                                                        LD
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Nova Technologies Pvt Ltd</p>
                                                        <p className="text-xs text-slate-500">Scheduled Callback • LD-10492</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                                        Hot Lead
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">₹4,50,000</span>
                                                <span className="col-span-2 text-right text-xs font-semibold text-[#ff4603]">Proposal Sent</span>
                                            </div>

                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shadow-sm">
                                                        VG
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Vertex Global Logistics</p>
                                                        <p className="text-xs text-slate-500">Meeting Confirmed • LD-10493</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                        Warm Lead
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">₹2,80,000</span>
                                                <span className="col-span-2 text-right text-xs font-semibold text-[#ff4603]">Negotiation</span>
                                            </div>

                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shadow-sm">
                                                        KR
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Kinetix Retail Networks</p>
                                                        <p className="text-xs text-slate-500">Demo Finished • LD-10494</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-[#ff4603] border border-orange-200">
                                                        Qualified
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">₹1,95,000</span>
                                                <span className="col-span-2 text-right text-xs font-semibold text-[#ff4603]">Contract In Draft</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTabPreview === 'finance' && (
                                <>
                                    {/* Finance Metrics */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50/70 to-white border border-orange-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#ff4603]">
                                                    GST 18%
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">₹18,45,200</p>
                                            <p className="text-xs text-[#ff4603] font-medium mt-1">25 / 25 Invoices (Trial Quota)</p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payments Settled</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#ff4603]">
                                                    92.4%
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">₹16,20,000</p>
                                            <p className="text-xs text-amber-700 font-medium mt-1">Instant Bank Reconciliation</p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Ledger</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                                                    Compliant
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">₹2,81,300</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">CGST & SGST Split Clean</p>
                                        </div>
                                    </div>

                                    {/* Finance Invoices Table */}
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 px-5 py-3 text-xs font-bold text-slate-600 grid grid-cols-12 border-b border-slate-200 uppercase tracking-wider">
                                            <span className="col-span-5">Invoice Reference</span>
                                            <span className="col-span-3">Status</span>
                                            <span className="col-span-2">Amount</span>
                                            <span className="col-span-2 text-right">Tax Type</span>
                                        </div>

                                        <div className="divide-y divide-slate-100 text-sm">
                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff4603] font-bold flex items-center justify-center text-xs shadow-sm">
                                                        IV
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Invoice #INV-2026-089</p>
                                                        <p className="text-xs text-slate-500">Apex Solutions • Paid via NEFT</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-[#ff4603] border border-orange-200">
                                                        Paid
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">₹1,25,000</span>
                                                <span className="col-span-2 text-right text-xs font-semibold text-[#ff4603]">GST 18%</span>
                                            </div>

                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shadow-sm">
                                                        IV
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Invoice #INV-2026-088</p>
                                                        <p className="text-xs text-slate-500">Zen Retailers • Due in 2 days</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                        Pending
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">₹3,40,000</span>
                                                <span className="col-span-2 text-right text-xs font-semibold text-[#ff4603]">GST 18%</span>
                                            </div>

                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff4603] font-bold flex items-center justify-center text-xs shadow-sm">
                                                        IV
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Invoice #INV-2026-087</p>
                                                        <p className="text-xs text-slate-500">CloudSync Ltd • Direct UPI</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-[#ff4603] border border-orange-200">
                                                        Paid
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">₹85,000</span>
                                                <span className="col-span-2 text-right text-xs font-semibold text-[#ff4603]">GST 18%</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTabPreview === 'hr' && (
                                <>
                                    {/* HR Metrics */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50/70 to-white border border-orange-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Capacity</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#ff4603]">
                                                    Full Quota
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">5 / 5 Seats</p>
                                            <p className="text-xs text-[#ff4603] font-medium mt-1">30-Day Free Trial Active</p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Attendance</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    On Duty
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">4 Present</p>
                                            <p className="text-xs text-amber-700 font-medium mt-1">Auto-checkout system active</p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ease-out">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Permission Enforced</p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                                                    Granular
                                                </span>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">3 Roles</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">Zero unauthorized access</p>
                                        </div>
                                    </div>

                                    {/* Employee List with Granular Permissions */}
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 px-5 py-3 text-xs font-bold text-slate-600 grid grid-cols-12 border-b border-slate-200 uppercase tracking-wider">
                                            <span className="col-span-5">Employee & Role</span>
                                            <span className="col-span-3">Shift Status</span>
                                            <span className="col-span-2">ID</span>
                                            <span className="col-span-2 text-right">Enabled Module</span>
                                        </div>

                                        <div className="divide-y divide-slate-100 text-sm">
                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shadow-sm">
                                                        SM
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Subramani (Sales Exec)</p>
                                                        <p className="text-xs text-slate-500">Finance & Settings Locked</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-[#ff4603] border border-orange-200">
                                                        Active Shift
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">EMP-004</span>
                                                <span className="col-span-2 text-right text-xs font-bold text-[#ff4603]">Sales Only</span>
                                            </div>

                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shadow-sm">
                                                        KV
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Kavitha (Accounts Lead)</p>
                                                        <p className="text-xs text-slate-500">Sales Pipelines Locked</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-[#ff4603] border border-orange-200">
                                                        Active Shift
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">EMP-002</span>
                                                <span className="col-span-2 text-right text-xs font-bold text-[#ff4603]">Finance Only</span>
                                            </div>

                                            <div className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/90 hover:translate-x-1 transition-all duration-500 ease-out">
                                                <div className="col-span-5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                                        PR
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Priya (Operations Admin)</p>
                                                        <p className="text-xs text-slate-500">All Modules Unrestricted</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                                        On Duty
                                                    </span>
                                                </div>
                                                <span className="col-span-2 font-bold text-slate-900">EMP-001</span>
                                                <span className="col-span-2 text-right text-xs font-bold text-slate-900">Full Access</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Packages & Pricing Section */}
            <section id="packages" className="scroll-mt-24 py-20 px-4 max-w-6xl mx-auto border-t border-slate-200">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="text-xs uppercase font-bold tracking-widest text-[#ff4603] bg-orange-50 px-3 py-1 rounded-full border border-orange-200 mb-3 inline-block">
                        Clear & Transparent Pricing
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                        Pick a plan or test free for 30 days.
                    </h2>
                    <p className="text-slate-600 text-base">
                        Get started instantly with our complete 30-Day Free Trial. Upgrade anytime as your company expands.
                    </p>

                    {/* Cycle Toggle */}
                    <div className="mt-8 inline-flex items-center p-1.5 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                billingCycle === 'monthly' ? 'bg-white text-[#ff4603] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Monthly Billing
                        </button>
                        <button
                            onClick={() => setBillingCycle('annual')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                billingCycle === 'annual' ? 'bg-white text-[#ff4603] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>Annual Billing</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#ff4603]">Save 20%</span>
                        </button>
                    </div>
                </div>

                {/* 3 Balanced Pricing Cards with Double-Bezel and Kinetic Physics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    {/* CARD 1: 30-DAY FREE TRIAL */}
                    <div className="p-2 bg-slate-100/90 rounded-[2.2rem] border border-slate-200/90 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-orange-300 group flex flex-col">
                        <div className="bg-white rounded-[calc(2.2rem-0.5rem)] border-2 border-slate-900 p-8 flex flex-col justify-between relative shadow-sm h-full">
                            <div className="absolute -top-3.5 left-8 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-md">
                                ★ 30-Day Free Trial
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2 mt-2">
                                    <h3 className="font-extrabold text-2xl text-slate-900">Free Trial</h3>
                                    <span className="text-xs font-bold text-[#ff4603] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                                        ₹0 Due
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-6">
                                    Test all core CRM, Invoicing, and HR modules without paying a single rupee.
                                </p>

                                <div className="mb-6 pb-6 border-b border-slate-100">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-extrabold text-slate-900">₹0</span>
                                        <span className="text-sm text-slate-500 font-semibold">/ 30 Days</span>
                                    </div>
                                    <p className="text-xs text-[#ff4603] font-semibold mt-1">✓ Instant activation • No credit card required</p>
                                </div>

                                {/* Exact limits with prominent badges */}
                                <div className="space-y-3.5 mb-8 text-sm text-slate-800">
                                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-orange-50/70 border border-orange-100">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0 mt-0.5" />
                                        <span><strong className="text-slate-900">5 Employees:</strong> Add team members & configure specific module permissions</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-orange-50/70 border border-orange-100">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0 mt-0.5" />
                                        <span><strong className="text-slate-900">50 Leads:</strong> Manage pipelines, callback alerts & overdue flags</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-orange-50/70 border border-orange-100">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0 mt-0.5" />
                                        <span><strong className="text-slate-900">25 Invoices:</strong> Complete GST billing, tax items & payment reconciliation</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600 pl-1">
                                        <Check className="w-4 h-4 text-[#ff4603] shrink-0" />
                                        <span>Full 30-Day platform access</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600 pl-1">
                                        <Check className="w-4 h-4 text-[#ff4603] shrink-0" />
                                        <span>Calendar with 1-Year retention cleanup</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleOpenRegister('Free Trial')}
                                className="group w-full py-3.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer mt-4"
                            >
                                <span>Claim 30-Day Free Trial</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* CARD 2: GROWTH PLAN (MOST POPULAR) */}
                    <div className="p-2 bg-[#ff4603]/10 rounded-[2.2rem] border-2 border-[#ff4603] shadow-xl shadow-[#ff4603]/15 hover:shadow-[#ff4603]/30 transition-all duration-500 hover:-translate-y-2 group flex flex-col">
                        <div className="bg-white rounded-[calc(2.2rem-0.5rem)] p-8 flex flex-col justify-between relative shadow-sm h-full">
                            <div className="absolute -top-3.5 left-8 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#ff4603] text-white shadow-md shadow-[#ff4603]/30">
                                🔥 Most Popular for Teams
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2 mt-2">
                                    <h3 className="font-extrabold text-2xl text-slate-900">Growth Plan</h3>
                                    <span className="text-xs font-bold text-[#ff4603] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                                        Scaled
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-6">
                                    Built for active companies scaling up their sales pipeline and staff.
                                </p>

                                <div className="mb-6 pb-6 border-b border-slate-100">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-extrabold text-slate-900">
                                            {billingCycle === 'monthly' ? '₹1,499' : '₹1,199'}
                                        </span>
                                        <span className="text-sm text-slate-500 font-semibold">/ Month</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Billed {billingCycle === 'monthly' ? 'monthly' : 'annually'}</p>
                                </div>

                                <div className="space-y-3.5 mb-8 text-sm text-slate-800">
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span><strong className="text-slate-900">Up to 25 Employees</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span><strong className="text-slate-900">Up to 500 Leads & Deals</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span><strong className="text-slate-900">Up to 250 Invoices & Bills</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span>Full Project Gantt & Milestones</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span>Multi-role permissions (Admin, CEO, Employee)</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span>Priority WhatsApp & Email Support</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleOpenRegister('Growth')}
                                className="group w-full py-3.5 rounded-xl text-sm font-bold bg-[#ff4603] text-white hover:bg-[#e03a00] shadow-lg shadow-[#ff4603]/25 hover:shadow-[#ff4603]/40 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-4"
                            >
                                <span>Get Started with Growth</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* CARD 3: ENTERPRISE PLAN */}
                    <div className="p-2 bg-slate-100/90 rounded-[2.2rem] border border-slate-200/90 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-slate-300 group flex flex-col">
                        <div className="bg-white rounded-[calc(2.2rem-0.5rem)] p-8 flex flex-col justify-between relative shadow-sm h-full">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-extrabold text-2xl text-slate-900">Enterprise</h3>
                                    <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                                        Unlimited
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-6">
                                    For large enterprises requiring unlimited capacity and custom setup.
                                </p>

                                <div className="mb-6 pb-6 border-b border-slate-100">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-extrabold text-slate-900">
                                            {billingCycle === 'monthly' ? '₹3,999' : '₹3,199'}
                                        </span>
                                        <span className="text-sm text-slate-500 font-semibold">/ Month</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Dedicated cloud infrastructure</p>
                                </div>

                                <div className="space-y-3.5 mb-8 text-sm text-slate-800">
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span><strong className="text-slate-900">Unlimited Employees</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span><strong className="text-slate-900">Unlimited Leads & Pipeline</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span><strong className="text-slate-900">Unlimited Invoices & Billing</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span>Custom Subdomain & Multi-branch Tenancy</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span>CEO Executive Radar & Live Feed</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-[#ff4603] shrink-0" />
                                        <span>24/7 Dedicated Account Manager</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleOpenRegister('Enterprise')}
                                className="group w-full py-3.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-4"
                            >
                                <span>Deploy Enterprise</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Feature Bento Grid with Double-Bezel and Kinetic Physics */}
            <div id="modules" className="scroll-mt-24"></div>
            <section id="features" className="scroll-mt-24 py-20 px-4 max-w-6xl mx-auto border-t border-slate-200">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="text-xs uppercase font-bold tracking-widest text-[#ff4603] bg-orange-50 px-3 py-1 rounded-full border border-orange-200 mb-3 inline-block">
                        Core Platform Capabilities
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                        Engineered with purpose. Zero bloat.
                    </h2>
                    <p className="text-slate-600 text-base">
                        Every module is crafted to solve real operational bottlenecks without clutter.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Module 1: Sales */}
                    <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200/80 hover:border-orange-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 group flex flex-col">
                        <div className="bg-white rounded-[calc(2rem-0.5rem)] p-8 flex flex-col justify-between h-full">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff4603] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm">
                                    <Briefcase size={22} />
                                </div>
                                <h3 className="font-extrabold text-xl text-slate-900 mb-3 group-hover:text-[#ff4603] transition-colors">Leads & Deal Pipelines</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                    Track leads through stages from Prospect to Won. Tag temperature as Hot, Warm, or Cold. Get automatic callback notifications and overdue follow-up escalations so zero deals slip through.
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-xs font-bold text-[#ff4603] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                                    Up to 50 Leads in 30-Day Trial
                                </span>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-300" />
                            </div>
                        </div>
                    </div>

                    {/* Module 2: Invoices */}
                    <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200/80 hover:border-orange-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 group flex flex-col">
                        <div className="bg-white rounded-[calc(2rem-0.5rem)] p-8 flex flex-col justify-between h-full">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff4603] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm">
                                    <FileText size={22} />
                                </div>
                                <h3 className="font-extrabold text-xl text-slate-900 mb-3 group-hover:text-[#ff4603] transition-colors">Invoices & Financial Ledger</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                    Generate GST-compliant invoices with line items, HSN codes, and instant tax calculations. Record inward customer payments and auto-update account balance ledgers without external software.
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-xs font-bold text-[#ff4603] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                                    Up to 25 Invoices in 30-Day Trial
                                </span>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-500 ease-out" />
                            </div>
                        </div>
                    </div>

                    {/* Module 3: HR & Shifts */}
                    <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group flex flex-col">
                        <div className="bg-white rounded-[calc(2rem-0.5rem)] p-8 flex flex-col justify-between h-full">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out shadow-sm">
                                    <Users size={22} />
                                </div>
                                <h3 className="font-extrabold text-xl text-slate-900 mb-3 group-hover:text-amber-800 transition-colors duration-300">Employee Access & Shifts</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                    Granular permissions per employee. Enable only "Sales" for a salesperson, strictly hiding Finance, Settings, and Calendar menus. Manage check-in attendance and delegate tasks directly.
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                    Up to 5 Employees in 30-Day Trial
                                </span>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-500 ease-out" />
                            </div>
                        </div>
                    </div>

                    {/* Module 4: Calendar */}
                    <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200/80 hover:border-purple-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group flex flex-col">
                        <div className="bg-white rounded-[calc(2rem-0.5rem)] p-8 flex flex-col justify-between h-full">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out shadow-sm">
                                    <CalendarDays size={22} />
                                </div>
                                <h3 className="font-extrabold text-xl text-slate-900 mb-3 group-hover:text-purple-800 transition-colors duration-300">Calendar Automation</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                    Effortlessly schedule business milestones, team meetings, and customer calls. Features quick hover-to-delete ('X') and automated background cleanup for events older than 1 year to keep the database fast.
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                                    Automatic 1-Year Retention Cleanup
                                </span>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-500 ease-out" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. FAQ Accordion */}
            <section id="faq" className="scroll-mt-24 py-20 px-4 max-w-4xl mx-auto border-t border-slate-200">
                <div className="text-center mb-14">
                    <span className="text-xs uppercase font-bold tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-3 inline-block">
                        Got Questions?
                    </span>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Frequently Asked Questions</h2>
                    <p className="text-slate-600 text-sm">Everything you need to know about the 30-Day Free Trial and packages.</p>
                </div>

                <div className="space-y-4">
                    {[
                        {
                            q: 'What is included in the 30-Day Free Trial?',
                            a: 'You get full 30-day access to all core platform features. You can add up to 5 employees, manage up to 50 active leads, and create up to 25 GST-compliant invoices with zero charges and no credit card required.'
                        },
                        {
                            q: 'What happens when I reach the 5 employees, 50 leads, or 25 invoices limit?',
                            a: 'The system protects your account and cleanly alerts you that the free trial quota has been reached, prompting you to upgrade to the Growth or Enterprise plan so you can continue scaling without interruption.'
                        },
                        {
                            q: 'Can I assign specific module permissions to employees on the trial?',
                            a: 'Yes! Even on the trial, admins have full granular permission control. When creating or editing an employee, you can toggle which sections (Sales, Finance, etc.) they can see. If you grant only Sales, their sidebar will strictly show only Sales and hide all other modules.'
                        },
                        {
                            q: 'How does the automatic 1-year calendar cleanup work?',
                            a: 'Skite Prime has an automated background retention job that periodically scans and cleans up calendar events that are older than 365 days, ensuring your database remains performant and clean.'
                        }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-500">
                            <button
                                onClick={() => toggleFaq(idx)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left text-sm font-bold text-slate-900 hover:text-[#ff4603] transition-colors duration-300 group cursor-pointer"
                            >
                                <span>{item.q}</span>
                                <span className={`p-1.5 rounded-xl transition-all duration-500 ${openFaq === idx ? 'bg-orange-50 text-[#ff4603] rotate-180' : 'bg-slate-100 text-slate-500 group-hover:bg-orange-50 group-hover:text-[#ff4603]'}`}>
                                    {openFaq === idx ? <Minus size={16} /> : <Plus size={16} />}
                                </span>
                            </button>
                            {openFaq === idx && (
                                <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-fade-in">
                                    {item.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* 7. Footer */}
            <footer className="py-12 px-4 border-t border-slate-200 bg-white text-sm text-slate-500">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-7 h-7 rounded-lg bg-[#ff4603] text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500">
                            SP
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-[#ff4603] transition-colors duration-300">Skite Prime</span>
                        <span>• Modern Enterprise Operating System</span>
                    </div>

                    <div className="flex items-center space-x-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-[#ff4603] transition-colors">Overview</a>
                        <a href="#packages" className="hover:text-[#ff4603] transition-colors">Packages</a>
                        <button 
                            type="button"
                            onClick={() => {
                                setIsLoginOpen(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} 
                            className="hover:text-[#ff4603] transition-colors cursor-pointer"
                        >
                            Sign In
                        </button>
                    </div>

                    <p className="text-xs">© 2026 Skite Prime Technologies. All rights reserved.</p>
                </div>
            </footer>

            {/* 8. Registration Modal (Light Theme with Spring Scale Animation) */}
            {isRegisterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 text-left animate-scale-in">
                        {/* Close button */}
                        <button
                            onClick={() => setIsRegisterOpen(false)}
                            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        <div className="mb-6">
                            <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-orange-50 text-[#ff4603] border border-orange-200 mb-2">
                                Instant Setup
                            </span>
                            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                Create Your Workspace
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Launch your organization account in under 30 seconds.
                            </p>
                        </div>

                        {/* Plan Tabs */}
                        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 mb-5">
                            {[
                                { id: 'Free Trial', name: 'Free Trial', price: '₹0 (30 Days)' },
                                { id: 'Growth', name: 'Growth', price: '₹1,499/mo' },
                                { id: 'Enterprise', name: 'Enterprise', price: '₹3,999/mo' }
                            ].map(plan => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer ${
                                        selectedPlan === plan.id
                                            ? 'bg-white text-[#ff4603] shadow-sm font-bold scale-[1.02] border border-[#ff4603]/20'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <p className="text-xs">{plan.name}</p>
                                    <p className="text-[10px] text-slate-500 font-semibold">{plan.price}</p>
                                </button>
                            ))}
                        </div>

                        {/* Plan Specs Breakdown */}
                        {selectedPlan === 'Free Trial' ? (
                            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-[#ff4603] mb-5 animate-fade-in">
                                <strong>30-Day Free Trial includes:</strong> 5 Employees • 50 Leads • 25 Invoices • ₹0 Due
                            </div>
                        ) : selectedPlan === 'Growth' ? (
                            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-[#ff4603] mb-5 animate-fade-in">
                                <strong>Growth Plan includes:</strong> 25 Employees • 500 Leads • 250 Invoices
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 mb-5 animate-fade-in">
                                <strong>Enterprise includes:</strong> Unlimited Employees • Unlimited Leads • SLA
                            </div>
                        )}

                        {error && (
                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium mb-4 animate-fade-in">
                                {error}
                            </div>
                        )}

                        {/* Registration Form */}
                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Skite Corp"
                                        value={formData.companyName}
                                        onChange={handleCompanyNameChange}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff4603] focus:ring-1 focus:ring-[#ff4603] focus:bg-white transition-all shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Devanathan"
                                        value={formData.adminName}
                                        onChange={(e) => setFormData(p => ({ ...p, adminName: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff4603] focus:ring-1 focus:ring-[#ff4603] focus:bg-white transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Email Address</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="admin@company.com"
                                    value={formData.adminEmail}
                                    onChange={(e) => setFormData(p => ({ ...p, adminEmail: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff4603] focus:ring-1 focus:ring-[#ff4603] focus:bg-white transition-all shadow-inner"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={formData.adminPassword}
                                    onChange={(e) => setFormData(p => ({ ...p, adminPassword: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff4603] focus:ring-1 focus:ring-[#ff4603] focus:bg-white transition-all shadow-inner"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full py-3.5 rounded-2xl text-sm font-bold bg-[#ff4603] text-white hover:bg-[#e03a00] shadow-xl shadow-[#ff4603]/25 hover:shadow-[#ff4603]/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>Setting up workspace...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>
                                            {selectedPlan === 'Free Trial' 
                                                ? 'Launch 30-Day Free Trial (₹0)' 
                                                : `Proceed to Pay ₹${getPlanPrice(selectedPlan).toLocaleString()} & Subscribe`}
                                        </span>
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 9. Secure Payment Checkout Gateway (Enforced for Paid Plans) */}
            {isPaymentOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-left animate-scale-in">
                        {/* Header Banner */}
                        <div className="bg-[#111111] text-white px-6 py-5 flex items-center justify-between border-b border-blue-900/40">
                            <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                                    <span className="text-xs font-black tracking-tighter">Rzp</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base font-extrabold tracking-tight">Razorpay Secure Checkout</h4>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                            Test Mode
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5">
                                        <span className="flex items-center gap-1"><Lock size={10} className="text-[#ff4603]" /> 256-Bit SSL Encrypted</span>
                                        <span>•</span>
                                        <span className="text-[#ff4603] font-semibold">{selectedPlan} Subscription</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelPayment}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Cancel Payment"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Payment Step: Processing */}
                        {paymentStep === 'processing' && (
                            <div className="p-10 text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 text-[#ff4603] flex items-center justify-center animate-pulse">
                                    <Lock size={28} className="animate-spin" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">Authorizing Payment...</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Securely contacting payment network for ₹{getPlanPrice(selectedPlan).toLocaleString()}
                                    </p>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-[#ff4603] h-full rounded-full animate-progress"></div>
                                </div>
                                <p className="text-[11px] text-slate-400">Do not refresh or close this window.</p>
                            </div>
                        )}

                        {/* Payment Step: Success */}
                        {paymentStep === 'success' && (
                            <div className="p-10 text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-[#ff4603] flex items-center justify-center animate-bounce">
                                    <CheckCircle2 size={36} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-extrabold text-slate-900">Payment Successful!</h4>
                                    <p className="text-xs text-slate-600 mt-1">
                                        ₹{getPlanPrice(selectedPlan).toLocaleString()} received. Workspace has been activated.
                                    </p>
                                </div>
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs font-semibold text-[#ff4603]">
                                    Redirecting to your Admin Dashboard...
                                </div>
                            </div>
                        )}

                        {/* Payment Step: 3D Secure OTP Authentication */}
                        {paymentStep === 'otp' && (
                            <div className="p-6 space-y-4 animate-fade-in">
                                {/* Bank Simulation Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-800">3D Secure Bank Verification</h5>
                                            <p className="text-[10px] text-slate-400">ACS Gateway • VISA / RuPay Simulation</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        ₹{getPlanPrice(selectedPlan).toLocaleString()}
                                    </span>
                                </div>

                                {/* Order & Account Details */}
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Merchant:</span>
                                        <span className="font-semibold text-slate-800">Skite Prime Cloud ERP</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Card/Account:</span>
                                        <span className="font-semibold text-slate-800">•••• •••• •••• 1111</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Plan:</span>
                                        <span className="font-semibold text-[#ff4603]">{selectedPlan} Subscription</span>
                                    </div>
                                </div>

                                {/* Sandbox Instructions */}
                                <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                                    <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Test OTP Instructions</p>
                                        <p className="text-[11px] text-blue-700 mt-0.5">
                                            Use <code className="bg-blue-200/80 px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">123456</code> to simulate successful approval, or enter any other number to test bank decline.
                                        </p>
                                    </div>
                                </div>

                                {/* OTP Form */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Enter 6-Digit OTP</label>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={testOtp}
                                        onChange={(e) => setTestOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="123456"
                                        className="w-full text-center tracking-[0.5em] text-2xl font-black py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none transition-all shadow-inner"
                                    />
                                </div>

                                {/* OTP Buttons */}
                                <div className="space-y-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleSubmitOtp}
                                        disabled={paymentLoading}
                                        className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#ff4603] hover:bg-[#e03a00] text-white shadow-lg shadow-[#ff4603]/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <CheckCircle2 size={16} />
                                        <span>Submit OTP & Approve Payment</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSimulateFailure('Transaction cancelled by user during 3D Secure verification.')}
                                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer text-center"
                                    >
                                        Cancel / Reject Verification
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Payment Step: Declined / Failed Screen */}
                        {paymentStep === 'failed' && (
                            <div className="p-7 text-center space-y-4 animate-scale-in">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-inner">
                                    <X size={36} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wider mb-2">
                                        Razorpay: BAD_REQUEST_PAYMENT_DECLINED
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900">Payment Failed</h4>
                                    <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                                        {paymentError || 'Your issuing bank has declined this transaction. No funds were debited from your account.'}
                                    </p>
                                </div>

                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Sparkles size={13} className="text-amber-700" />
                                        <span>Razorpay Sandbox Diagnostic</span>
                                    </div>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        • Workspace was <strong>NOT</strong> activated.<br/>
                                        • You can re-attempt using any test method or OTP <code className="bg-amber-100 px-1 rounded font-mono font-bold">123456</code>.
                                    </p>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleTryAgain}
                                        className="w-full py-3.5 rounded-2xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>Try Again / Choose Payment Method</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCancelPayment}
                                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-center"
                                    >
                                        Cancel & Return to Registration
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Payment Step: Checkout Form */}
                        {paymentStep === 'checkout' && (
                            <div className="p-6">
                                {/* Test Sandbox Notice */}
                                <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-900">
                                    <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-[11px] leading-relaxed">
                                        <span className="font-bold text-amber-950">Razorpay Test Sandbox Active: </span>
                                        Dummy testing mode. Select any dummy option below or use the simulation buttons.
                                    </div>
                                </div>

                                {/* Order Summary Pill */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 font-semibold">Workspace Subscription</p>
                                        <h5 className="text-base font-extrabold text-slate-900">{selectedPlan} Plan ({billingCycle === 'monthly' ? 'Monthly' : 'Annual'})</h5>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{formData.companyName || 'Your Company'} • {formData.adminEmail}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-slate-900">₹{getPlanPrice(selectedPlan).toLocaleString()}</div>
                                        <span className="text-[10px] font-bold text-[#ff4603] bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                                            GST 18% Included
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Method Selection */}
                                <div className="mb-4">
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Select Payment Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'card', label: 'Card', icon: CreditCard },
                                            { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                                            { id: 'netbanking', label: 'Net Banking', icon: Landmark }
                                        ].map(m => {
                                            const Icon = m.icon;
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(m.id)}
                                                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                        paymentMethod === m.id
                                                            ? 'bg-orange-50 border-[#ff4603] text-[#ff4603] shadow-sm ring-1 ring-[#ff4603]/20'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <Icon size={16} />
                                                    <span>{m.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Method Specific Details */}
                                {paymentMethod === 'card' && (
                                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 mb-4 animate-fade-in">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-700">Card Number</label>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCardData(p => ({ ...p, number: '4111 1111 1111 1111' }))}
                                                        className="text-[10px] font-bold text-[#ff4603] bg-orange-100 hover:bg-orange-200 px-2 py-0.5 rounded cursor-pointer"
                                                    >
                                                        ✓ Visa Test
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCardData(p => ({ ...p, number: '4000 0000 0000 1092' }))}
                                                        className="text-[10px] font-bold text-red-700 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded cursor-pointer"
                                                    >
                                                        ✕ Decline Test
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={cardData.number}
                                                    onChange={(e) => setCardData(p => ({ ...p, number: e.target.value }))}
                                                    placeholder="4111 1111 1111 1111"
                                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff4603] shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry</label>
                                                <input
                                                    type="text"
                                                    value={cardData.expiry}
                                                    onChange={(e) => setCardData(p => ({ ...p, expiry: e.target.value }))}
                                                    placeholder="12/28"
                                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff4603] shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">CVV</label>
                                                <input
                                                    type="password"
                                                    maxLength="4"
                                                    value={cardData.cvv}
                                                    onChange={(e) => setCardData(p => ({ ...p, cvv: e.target.value }))}
                                                    placeholder="123"
                                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff4603] shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'upi' && (
                                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 mb-4 animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700">UPI ID / VPA</span>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setUpiId('success@razorpay')}
                                                    className="text-[10px] font-bold text-[#ff4603] bg-orange-100 hover:bg-orange-200 px-2 py-0.5 rounded cursor-pointer"
                                                >
                                                    ✓ success@razorpay
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setUpiId('failure@razorpay')}
                                                    className="text-[10px] font-bold text-red-700 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded cursor-pointer"
                                                >
                                                    ✕ failure@razorpay
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={upiId}
                                                onChange={(e) => setUpiId(e.target.value)}
                                                placeholder="success@razorpay"
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff4603] shadow-sm"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500">Supports Google Pay, PhonePe, Paytm, BHIM and CRED simulators.</p>
                                    </div>
                                )}

                                {paymentMethod === 'netbanking' && (
                                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 mb-4 animate-fade-in">
                                        <label className="block text-[11px] font-bold text-slate-700">Popular Test Banks</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['HDFC Bank (Test)', 'ICICI Bank (Test)', 'SBI (Test)', 'Axis Bank (Test)'].map(b => (
                                                <button
                                                    key={b}
                                                    type="button"
                                                    onClick={() => setSelectedBank(b)}
                                                    className={`p-2 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                                                        selectedBank === b 
                                                            ? 'bg-orange-50 border-[#ff4603] text-[#ff4603] ring-1 ring-[#ff4603]/20' 
                                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Interactive Action Controls */}
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={handleCompletePayment}
                                        disabled={paymentLoading}
                                        className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#ff4603] hover:bg-[#e03a00] text-white shadow-lg shadow-[#ff4603]/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Lock size={15} />
                                        <span>Simulate Success (Pay ₹{getPlanPrice(selectedPlan).toLocaleString()})</span>
                                    </button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={handleTriggerOtp}
                                            className="py-2.5 px-3 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <Shield size={14} className="text-blue-600" />
                                            <span>Enter Test OTP</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSimulateFailure('Transaction declined by issuing bank (BAD_REQUEST_PAYMENT_DECLINED)')}
                                            className="py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <X size={14} className="text-red-600" />
                                            <span>Simulate Failure</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCancelPayment}
                                        className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-center"
                                    >
                                        Cancel & Go Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
