import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Lock, Sparkles, CheckCircle } from 'lucide-react';

export default function Billing() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch or init logic here if needed
    }, []);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        setLoading(true);
        const res = await loadRazorpayScript();

        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post('http://localhost:5000/api/billing/create-order', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const options = {
                key: 'rzp_test_dummy_key_id', // Replace with real key in production
                amount: data.amount,
                currency: data.currency,
                name: 'Skite CRM',
                description: 'Monthly Workspace Subscription',
                order_id: data.orderId,
                handler: async function (response) {
                    try {
                        await axios.post('http://localhost:5000/api/billing/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        alert('Payment Successful! Welcome to Skite CRM.');
                        window.location.href = '/dashboard';
                    } catch (err) {
                        alert('Payment verification failed.');
                    }
                },
                theme: {
                    color: '#2563eb'
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            console.error(error);
            alert('Could not initiate payment. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom right, #f8fafc, #eff6ff)" }}>
            <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
                
                {/* Left Side: Info */}
                <div className="space-y-6 animate-fade-up">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                        <Sparkles size={16} className="mr-2" /> Trial Expired
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Continue using <span className="text-blue-600">Skite CRM</span>
                    </h1>
                    <p className="text-lg text-slate-600 font-medium">
                        Your 1-day free trial has expired. Subscribe to our monthly plan to keep your workspace active.
                    </p>
                    <ul className="space-y-4 mt-8">
                        {['Unlimited Lead Management', 'Full HR & Attendance Suite', 'Finance & Invoicing access', 'Premium priority support'].map((item, idx) => (
                            <li key={idx} className="flex items-center text-slate-700 font-bold">
                                <CheckCircle size={20} className="text-emerald-500 mr-3" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right Side: Checkout Card */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 relative overflow-hidden animate-fade-up delay-100">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                    
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Secure Payment</h2>
                        <p className="text-slate-500 text-sm mt-1">Cards only (Powered by Razorpay)</p>
                    </div>

                    <div className="space-y-6">
                        <button 
                            onClick={handlePayment}
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center group disabled:opacity-70 disabled:hover:translate-y-0"
                        >
                            {loading ? 'Initiating Secure Checkout...' : (
                                <>
                                    <CreditCard size={22} className="mr-3 group-hover:scale-110 transition-transform" />
                                    Pay Now
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-center text-xs text-slate-400 font-medium">
                            <Lock size={12} className="mr-1" />
                            100% Encrypted & Secure transaction
                        </div>

                        <div className="border-t border-slate-100 pt-6 text-center">
                            <button onClick={handleLogout} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                                Sign out of workspace
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
