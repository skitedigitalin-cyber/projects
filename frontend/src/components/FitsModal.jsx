import { useState } from 'react';
import axios from 'axios';
import { X, Zap, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function FitsModal({ lead, isOpen, onClose, onUpdate }) {
    if (!isOpen || !lead) return null;

    const existingFits = lead.fits || {};
    const [familiarity, setFamiliarity] = useState(existingFits.familiarity || '');
    const [intention, setIntention] = useState(existingFits.intention || '');
    const [intentionReason, setIntentionReason] = useState(existingFits.intentionReason || '');
    const [time, setTime] = useState(existingFits.time || '');
    const [spend, setSpend] = useState(existingFits.spend || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Rule:
    // Familiarity in [Medium, High] AND
    // Intention in [yes, Yes] AND
    // Time in [Fast, Move] AND
    // Spend in [Speed, Slow]
    const isQualified =
        ['Medium', 'High'].includes(familiarity) &&
        (intention || '').toLowerCase() === 'yes' &&
        ['Fast', 'Move'].includes(time) &&
        ['Speed', 'Slow'].includes(spend);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const fitsData = {
                familiarity,
                intention,
                intentionReason,
                time,
                spend
            };

            const payload = {
                callStatus: 'Called',
                fits: fitsData
            };

            if (isQualified) {
                payload.leadStatus = 'Qualified';
                payload.leadStage = 'Qualified';
                payload.qualifiedAlertDate = new Date().toISOString().split('T')[0];
                payload.qualifiedNotes = `Qualified via FITS (F: ${familiarity}, I: ${intention}${intentionReason ? ` - ${intentionReason}` : ''}, T: ${time}, S: ${spend})`;
            }

            const res = await axios.put(`http://localhost:5000/api/leads/${lead._id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onUpdate(res.data, isQualified);
            onClose();
        } catch (err) {
            console.error('Error saving FITS assessment:', err);
            setError(err.response?.data?.message || 'Failed to save FITS assessment. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                            <Zap size={20} className="text-yellow-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight">FITS Assessment</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Client: <span className="text-slate-700 font-bold">{lead.customerName}</span> {lead.companyName ? `(${lead.companyName})` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle size={15} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* 1. Familiarity */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>1. Familiarity (Familierity)</span>
                            <span className="text-[11px] text-slate-400 font-normal">Brand / service awareness</span>
                        </label>
                        <select
                            value={familiarity}
                            onChange={(e) => setFamiliarity(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        >
                            <option value="">-- Select Familiarity --</option>
                            <option value="No">No</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>

                    {/* 2. Intention */}
                    <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2.5">
                        <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>2. Intention</span>
                            <span className="text-[11px] text-slate-400 font-normal">Genuine intent to buy / take service</span>
                        </label>
                        <select
                            value={intention}
                            onChange={(e) => setIntention(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        >
                            <option value="">-- Select Intention --</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>

                        {/* Intention Reason - edhanala select nu type pannanum */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Reason for selection (Edhanala select nu type pannanum):
                            </label>
                            <textarea
                                rows={2}
                                value={intentionReason}
                                onChange={(e) => setIntentionReason(e.target.value)}
                                placeholder="Enter reason / notes about client intention..."
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* 3. Time */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>3. Time</span>
                            <span className="text-[11px] text-slate-400 font-normal">Urgency / timeline</span>
                        </label>
                        <select
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        >
                            <option value="">-- Select Time --</option>
                            <option value="Fast">Fast</option>
                            <option value="Move">Move</option>
                            <option value="Stand">Stand</option>
                        </select>
                    </div>

                    {/* 4. Spend */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>4. Spend</span>
                            <span className="text-[11px] text-slate-400 font-normal">Budget readiness</span>
                        </label>
                        <select
                            value={spend}
                            onChange={(e) => setSpend(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        >
                            <option value="">-- Select Spend --</option>
                            <option value="Speed">Speed</option>
                            <option value="Slow">Slow</option>
                            <option value="No">No</option>
                        </select>
                    </div>

                    {/* Live Qualification Status Banner */}
                    <div className="pt-2">
                        {isQualified ? (
                            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div className="text-xs text-emerald-900 leading-relaxed">
                                    <strong className="block text-emerald-800 text-[13px] font-bold mb-0.5">
                                        ✨ Qualified Criteria Matched!
                                    </strong>
                                    Familiarity ({familiarity}) + Intention (Yes) + Time ({time}) + Spend ({spend}) matched. This lead will automatically move to the <strong>Qualified</strong> stage upon saving.
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2.5 text-xs text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                <span>
                                    Lead will be saved in <strong>Called</strong> column. (F: Med/High, I: Yes, T: Fast/Move, S: Speed/Slow to qualify).
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                isQualified
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'
                            }`}
                        >
                            {isSaving ? 'Saving...' : isQualified ? (
                                <>
                                    Save &amp; Move to Qualified <ArrowRight size={14} />
                                </>
                            ) : (
                                'Save in Called'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
