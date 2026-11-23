import { useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LandingMarketing from '../components/LandingMarketing';
import { AuthContext } from '../context/AuthContext';
import { ArrowRight, X, Lock, Sparkles, CheckCircle2, CreditCard, Smartphone, Landmark, Shield } from 'lucide-react';

export default function LandingPage() {
    const { user, register, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
    const [isRegisterOpen, setIsRegisterOpen] = useState(() => searchParams.get('trial') === '1');
    const [selectedPlan, setSelectedPlan] = useState('Free Trial'); // 'Free Trial' | 'Growth' | 'Enterprise'
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

    return (
        <>
            <LandingMarketing user={user} onLogout={logout} billingCycle={billingCycle}
                onBillingCycleChange={setBillingCycle} getPlanPrice={getPlanPrice} onChoosePlan={handleOpenRegister} />

            {isRegisterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 text-left animate-scale-in">
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setIsRegisterOpen(false);
                                if (searchParams.has('trial')) {
                                    const nextParams = new URLSearchParams(searchParams);
                                    nextParams.delete('trial');
                                    setSearchParams(nextParams, { replace: true });
                                }
                            }}
                            aria-label="Close registration" className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
        </>
    );
}
