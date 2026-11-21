import { useState, useEffect } from 'react';
import axios from 'axios';
import { proposalConfigUrl } from '../utils/salesPipeline';
import { MessageCircle, Save } from 'lucide-react';

export default function ProposalConfigTab({ sourceName, serviceType }) {
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const displayName = serviceType && serviceType !== 'All' ? serviceType : sourceName;
    const configUrl = proposalConfigUrl(sourceName, serviceType);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const res = await axios.get(configUrl, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setMessage(res.data.proposalMessage || '');
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [configUrl]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.put(configUrl, { proposalMessage: message }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert('Proposal message saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save message.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-gray-500">Loading configuration...</div>;

    return (
        <div className="w-full max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mt-4">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                    <MessageCircle size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">WhatsApp Proposal Template</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Set a default WhatsApp message for <strong>{displayName}</strong> leads.
                        When a lead is moved to Qualified, you can send this message directly via WhatsApp.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g., Hello! Thanks for reaching out. Here is our proposal..."
                    rows={8}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all resize-none"
                />

                <div className="flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        <Save size={18} className="mr-2" />
                        {isSaving ? 'Saving...' : 'Save Message Template'}
                    </button>
                </div>
            </div>
        </div>
    );
}
