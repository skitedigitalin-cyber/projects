import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api';
import { proposalConfigUrl } from '../utils/salesPipeline';
import { X, Calendar, Clock, CheckCircle, ArrowRight, Building, PhoneOutgoing, FileText, CheckSquare, Briefcase, IndianRupee, MessageCircle, Eye } from 'lucide-react';

export default function LeadDetailsModal({ lead, draftCallStatus, proposalService, onClose, onUpdate, onEdit }) {
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [profileError, setProfileError] = useState('');

    // Form states
    const [callStatus, setCallStatus] = useState(draftCallStatus || lead.callStatus || 'Lead');
    const [alertDate, setAlertDate] = useState(lead.callbackAlertDate || '');
    const [alertTime, setAlertTime] = useState(lead.callbackAlertTime || '');
    const [descriptions, setDescriptions] = useState({
        'Callback (1)': lead.callback1Description || '',
        'Callback (2)': lead.callback2Description || '',
        'Callback (3)': lead.callback3Description || '',
        'Callback (4)': lead.callback4Description || '',
        'Callback (5)': lead.callback5Description || '',
    });
    const [rejectReason, setRejectReason] = useState(lead.rejectReason || '');
    
    const [waitingListDescription, setWaitingListDescription] = useState(lead.waitingListDescription || '');
    const [editingStage, setEditingStage] = useState(false);
    const [stageDetails, setStageDetails] = useState('');
    const [fullAmount, setFullAmount] = useState(lead.fullAmount ?? lead.leadValue ?? '');
    const needsReminder = /Callback|Not Attend|Waiting List/i.test(callStatus);
    const callChanged = callStatus !== (lead.callStatus || 'Lead')
        || (needsReminder && (alertDate !== (lead.callbackAlertDate || '') || alertTime !== (lead.callbackAlertTime || '')))
        || (callStatus === 'Rejected' && rejectReason !== (lead.rejectReason || ''))
        || (callStatus === 'Waiting List' && waitingListDescription !== (lead.waitingListDescription || ''))
        || Object.entries(descriptions).some(([status, value]) =>
            value !== (lead['callback' + status.match(/\d/)[0] + 'Description'] || ''));

    // Stage Move States
    const [pendingStage, setPendingStage] = useState(null);
    const [stageNotes, setStageNotes] = useState('');
    const [stageAlertDate, setStageAlertDate] = useState('');
    const [stageAlertTime, setStageAlertTime] = useState('');

    // Convert states
    const [advanceAmount, setAdvanceAmount] = useState(lead.advanceAmount || '');
    const [screenshotFile, setScreenshotFile] = useState(null);

    const profileFields = [
        ['customerName', 'Full name'], ['mobileNumber', 'Phone'], ['whatsappNumber', 'WhatsApp'],
        ['email', 'Email'], ['companyName', 'Company'], ['website', 'Website'],
        ['industry', 'Business type'], ['location', 'Location'],
    ];

    const saveProfile = async event => {
        event.preventDefault();
        setIsSaving(true);
        setProfileError('');
        try {
            const customerName = profile.customerName.trim();
            if (!customerName) throw new Error('Enter a full name.');
            const { data } = await axios.put('/api/leads/' + lead._id, { ...profile, customerName });
            onUpdate(data);
            setProfile(null);
        } catch (error) {
            setProfileError(error.response?.data?.message || error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCallStatusSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                callStatus,
                leadStage: 'Lead',
                waitingListDescription,
                nextFollowUpDate: null,
                callbackAlertDate: needsReminder ? alertDate : '',
                callbackAlertTime: needsReminder ? alertTime : '',
                callback1Description: descriptions['Callback (1)'],
                callback2Description: descriptions['Callback (2)'],
                callback3Description: descriptions['Callback (3)'],
                callback4Description: descriptions['Callback (4)'],
                callback5Description: descriptions['Callback (5)'],
                rejectReason: callStatus === 'Rejected' ? rejectReason : ''
            };
            
            if (callStatus === 'Rejected') {
                payload.leadStatus = 'Lost';
                if (!lead.rejectedFromStage) {
                    payload.rejectedFromStage = 'Lead';
                }
            } else if (needsReminder) {
                payload.leadStatus = 'Contacted';
            } else if (callStatus === 'Lead' || callStatus === 'Pending') {
                payload.leadStatus = 'New';
            } else if (callStatus.includes('Attend')) {
                payload.leadStatus = 'Contacted';
            }

            const res = await axios.put(`http://localhost:5000/api/leads/${lead._id}`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            onUpdate(res.data);
        } catch (error) {
            console.error(error);
            alert('Error saving status');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmStageMove = async () => {
        if (pendingStage === 'Rejected' && !rejectReason.trim()) return;
        if (pendingStage === 'Converted' && (Number(fullAmount) < 0 || Number(advanceAmount) < 0 || Number(advanceAmount) > Number(fullAmount))) {
            alert('Enter valid amounts. The advance cannot exceed the total.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = { 
                leadStatus: pendingStage === 'Rejected' ? 'Lost' : pendingStage,
                leadStage: pendingStage === 'Converted' ? 'Convert' : pendingStage === 'Rejected' ? 'Lead' : pendingStage
            };
            
            if (pendingStage === 'Qualified') {
                payload.qualifiedDetails = stageDetails;
                payload.qualifiedNotes = stageNotes;
                payload.qualifiedAlertDate = stageAlertDate;
                payload.qualifiedAlertTime = stageAlertTime;
                payload.callbackAlertDate = '';
                payload.callbackAlertTime = '';
                payload.nextFollowUpDate = null;
            } else if (pendingStage === 'Appointment') {
                payload.appointmentDetails = stageDetails;
                payload.appointmentNotes = stageNotes;
                payload.appointmentAlertDate = stageAlertDate;
                payload.appointmentAlertTime = stageAlertTime;
                payload.callbackAlertDate = '';
                payload.callbackAlertTime = '';
                payload.nextFollowUpDate = null;
            } else if (pendingStage === 'Converted') {
                payload.fullAmount = Number(fullAmount) || 0;
                payload.advanceAmount = Number(advanceAmount) || 0;
                payload.orderStatus = 'Closed';
                payload.nextFollowUpDate = null;
                payload.callbackAlertDate = '';
                payload.callbackAlertTime = '';
                
                // Upload screenshot if selected
                if (screenshotFile) {
                    const formData = new FormData();
                    formData.append('paymentScreenshot', screenshotFile);
                    
                    const uploadRes = await axios.post(`${API_BASE_URL}/api/leads/upload`, formData, {
                        headers: { 
                            Authorization: `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    payload.paymentScreenshot = uploadRes.data.fileUrl;
                }
            } else if (pendingStage === 'Rejected') {
                Object.assign(payload, { callStatus: 'Rejected', rejectReason: rejectReason.trim(), rejectedFromStage: lead.leadStatus,
                    callbackAlertDate: '', callbackAlertTime: '', nextFollowUpDate: null });
            }

            const res = await axios.put(`${API_BASE_URL}/api/leads/${lead._id}`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            onUpdate(res.data);
            setEditingStage(false);
            setPendingStage(null);
            setStageDetails('');
            setStageNotes('');
            setStageAlertDate('');
            setStageAlertTime('');
            setScreenshotFile(null);
            
        } catch (error) {
            console.error(error);
            alert('Error moving stage');
        } finally {
            setIsSaving(false);
        }
    };

    const renderCallStatus = () => {

        
        return (
            <div className="space-y-5">
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Update Call Status</label>
                    <select 
                        value={callStatus} 
                        onChange={(e) => { setCallStatus(e.target.value); setAlertDate(''); setAlertTime(''); }}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#111111] focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                        {[...new Set(['Lead', 'Callback (1)', 'Callback (2)', 'Callback (3)', 'Callback (4)', 'Callback (5)', 'Not Attend', 'Rejected', 'Waiting List', lead.callStatus].filter(Boolean))].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {needsReminder && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Alert Date</label>
                            <input 
                                type="date" 
                                value={alertDate} 
                                onChange={(e) => setAlertDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#111111]"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Alert Time</label>
                            <input 
                                type="time" 
                                value={alertTime} 
                                onChange={(e) => setAlertTime(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#111111]"
                            />
                        </div>
                    </div>
                )}

                {callStatus.includes('Callback') && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">{callStatus} Description</label>
                        <textarea 
                            rows="3"
                            value={descriptions[callStatus] || ''}
                            onChange={(e) => setDescriptions({ ...descriptions, [callStatus]: e.target.value })}
                            placeholder={`Enter notes for ${callStatus}...`}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#111111]"
                        />
                    </div>
                )}

                {callStatus === 'Waiting List' && (
                    <label className="block text-sm font-medium">Waiting list description
                        <textarea rows="3" className="mt-2 w-full rounded-lg border border-gray-200 p-3"
                            value={waitingListDescription} onChange={event => setWaitingListDescription(event.target.value)} />
                    </label>
                )}
                {callStatus === 'Rejected' && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Reason for Rejection</label>
                        <textarea 
                            rows="3"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Why was this lead rejected?"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#111111]"
                        />
                    </div>
                )}

                <div className="pt-2">
                    <button 
                        onClick={handleCallStatusSave}
                        disabled={isSaving || !callChanged}
                        className="w-full py-3 bg-[#111111] text-white font-medium rounded-lg hover:bg-[#303030] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Save Call Status'}
                    </button>
                </div>
            </div>
        );
    };

    const renderPipelineStages = () => {
        if (pendingStage) {
            return (
                <div className="space-y-5 bg-[#f5f5f3]/80 p-6 rounded-2xl border border-[#e6e6e3] shadow-sm animate-fade-up">
                    <div className="flex items-center justify-between pb-3 border-b border-[#e6e6e3]">
                        <h3 className="font-bold text-slate-800 text-base flex items-center">
                            <ArrowRight size={18} className="mr-2 text-[#3f3f3f]" /> Move to {pendingStage}
                        </h3>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e6e6e3] text-[#111111]">
                            Stage Transition
                        </span>
                    </div>
                    
                    {pendingStage === 'Rejected' ? (
                        <label className="block text-sm font-medium">Reason for rejection
                            <textarea className="mt-2 w-full rounded-lg border border-slate-200 p-3"
                                value={rejectReason} onChange={event => setRejectReason(event.target.value)} />
                        </label>
                    ) : pendingStage !== 'Converted' ? (
                        <div className="space-y-4">
                            {/* Alert Date & Time for Appointment and Qualified */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5 flex items-center">
                                        <Calendar size={14} className="mr-1.5 text-[#3f3f3f]" />
                                        {pendingStage} Alert Date
                                    </label>
                                    <input 
                                        type="date" 
                                        value={stageAlertDate} 
                                        onChange={(e) => setStageAlertDate(e.target.value)} 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-[#111111] focus:ring-4 focus:ring-[#f0f0ee] text-sm font-medium text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5 flex items-center">
                                        <Clock size={14} className="mr-1.5 text-[#3f3f3f]" />
                                        {pendingStage} Alert Time
                                    </label>
                                    <input 
                                        type="time" 
                                        value={stageAlertTime} 
                                        onChange={(e) => setStageAlertTime(e.target.value)} 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-[#111111] focus:ring-4 focus:ring-[#f0f0ee] text-sm font-medium text-slate-800"
                                    />
                                </div>
                            </div>

                            <label className="block text-sm font-medium">{pendingStage} details
                                <input className="mt-2 w-full rounded-lg border border-slate-200 p-3"
                                    value={stageDetails} onChange={event => setStageDetails(event.target.value)} />
                            </label>
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    {pendingStage} Notes
                                </label>
                                <textarea 
                                    rows="3"
                                    value={stageNotes}
                                    onChange={(e) => setStageNotes(e.target.value)}
                                    placeholder={`Enter details, meeting purpose, or location for ${pendingStage}...`}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-[#111111] focus:ring-4 focus:ring-[#f0f0ee] text-sm resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium">Full amount (₹)
                                <input type="number" min="0" step="0.01" className="mt-2 w-full rounded-lg border border-slate-200 p-3"
                                    value={fullAmount} onChange={event => setFullAmount(event.target.value)} />
                            </label>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-green-800 uppercase tracking-wide block mb-1">Advance Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                                        <input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-green-200 rounded-lg outline-none focus:border-green-500 text-sm font-medium" placeholder="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-green-800 uppercase tracking-wide block mb-1">Payment Screenshot</label>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => setScreenshotFile(e.target.files[0])}
                                            className="w-full py-1.5 px-2 bg-white border border-green-200 rounded-lg outline-none focus:border-green-500 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex space-x-3 pt-2">
                        <button 
                            onClick={() => { setPendingStage(null); setEditingStage(false); setStageDetails(''); setStageNotes(''); setStageAlertDate(''); setStageAlertTime(''); setScreenshotFile(null); }}
                            disabled={isSaving}
                            className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-[#f5f5f3] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmStageMove} 
                            disabled={isSaving || (pendingStage === 'Rejected' && !rejectReason.trim())}
                            className="flex-1 py-2.5 bg-[#111111] text-white font-bold rounded-xl hover:bg-[#303030] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                            {isSaving ? 'Saving…' : pendingStage === 'Rejected' ? 'Reject' : pendingStage === 'Converted' ? 'Close lead' : editingStage ? 'Save details' : 'Save & move'}
                        </button>
                    </div>
                </div>
            );
        }

        const isLeadStage = !['Qualified', 'Appointment', 'Converted'].includes(lead.leadStatus);
        const isQualifiedStage = lead.leadStatus === 'Qualified';
        const isAppointmentStage = lead.leadStatus === 'Appointment';
        const isConvertedStage = lead.leadStatus === 'Converted';

        return (
            <div className="space-y-6">
                <p className="text-sm text-slate-500 font-medium">
                    {isQualifiedStage 
                        ? "This lead is currently in Qualified stage. Schedule an Appointment to progress the deal."
                        : isAppointmentStage
                            ? "This lead is in Appointment stage. After completing the meeting, Convert to a Won Deal."
                            : isConvertedStage
                                ? "This lead has been successfully converted to a Won Deal."
                                : "Move this lead to the next stage in the pipeline."}
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                    {/* If in Leads stage: Show Move to Qualified & Schedule Appointment */}
                    {isLeadStage && (
                        <>
                            <button 
                                onClick={() => {
                                    setPendingStage('Qualified');
                                    setStageNotes(lead.qualifiedDetails || lead.qualifiedNotes || '');
                                    setStageAlertDate(lead.qualifiedAlertDate || '');
                                    setStageAlertTime(lead.qualifiedAlertTime || '');
                                }} 
                                className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all text-left group cursor-pointer shadow-sm"
                            >
                                <div className="flex items-center text-purple-700 font-bold text-sm">
                                    <CheckSquare size={18} className="mr-2.5" /> Move to Qualified
                                </div>
                                <ArrowRight size={18} className="text-purple-400 group-hover:text-purple-700 group-hover:translate-x-1 transition-all" />
                            </button>
                            
                            <button 
                                onClick={() => {
                                    setPendingStage('Appointment');
                                    setStageNotes(lead.appointmentDetails || lead.appointmentNotes || '');
                                    setStageAlertDate(lead.appointmentAlertDate || lead.callbackAlertDate || '');
                                    setStageAlertTime(lead.appointmentAlertTime || lead.callbackAlertTime || '');
                                }} 
                                className="flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all text-left group cursor-pointer shadow-sm"
                            >
                                <div className="flex items-center text-orange-700 font-bold text-sm">
                                    <FileText size={18} className="mr-2.5" /> Schedule Appointment
                                </div>
                                <ArrowRight size={18} className="text-orange-400 group-hover:text-orange-700 group-hover:translate-x-1 transition-all" />
                            </button>
                        </>
                    )}

                    {/* If in Qualified stage: ONLY show Appointment! */}
                    {isQualifiedStage && (
                        <button 
                            onClick={() => {
                                setPendingStage('Appointment');
                                setStageNotes(lead.appointmentDetails || lead.appointmentNotes || '');
                                setStageAlertDate(lead.appointmentAlertDate || lead.callbackAlertDate || '');
                                setStageAlertTime(lead.appointmentAlertTime || lead.callbackAlertTime || '');
                            }} 
                            className="flex items-center justify-between p-5 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-2 border-orange-200 rounded-2xl transition-all text-left group cursor-pointer shadow-sm hover:shadow"
                        >
                            <div className="flex items-center text-orange-800 font-bold text-[15px]">
                                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700 mr-3.5 shadow-sm">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="text-base font-bold text-orange-950">Schedule Appointment</div>
                                    <p className="text-xs font-normal text-orange-700 mt-0.5">Select appointment date, time, and meeting agenda</p>
                                </div>
                            </div>
                            <ArrowRight size={20} className="text-orange-500 group-hover:text-orange-800 group-hover:translate-x-1 transition-all" />
                        </button>
                    )}

                    {/* If in Appointment stage: ONLY show Convert to Deal (Won)! */}
                    {isAppointmentStage && (
                        <button 
                            onClick={() => {
                                setPendingStage('Converted');
                                setFullAmount(lead.fullAmount ?? lead.leadValue ?? '');
                                setAdvanceAmount(lead.advanceAmount || '');
                            }} 
                            className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border-2 border-emerald-300 rounded-2xl transition-all text-left group cursor-pointer shadow-sm hover:shadow"
                        >
                            <div className="flex items-center text-emerald-800 font-bold text-[15px]">
                                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 mr-3.5 shadow-sm">
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <div className="text-base font-bold text-emerald-950">Convert to Deal (Won)</div>
                                    <p className="text-xs font-normal text-emerald-700 mt-0.5">Record advance payment details and mark deal as won</p>
                                </div>
                            </div>
                            <ArrowRight size={20} className="text-emerald-500 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all" />
                        </button>
                    )}

                    {/* If Converted: already converted */}
                    {isConvertedStage && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 text-sm font-bold flex items-center justify-center">
                            <CheckCircle size={18} className="mr-2 text-emerald-600" /> Lead has already been Converted to a Deal (Won)
                        </div>
                    )}
                </div>

                {(isQualifiedStage || isAppointmentStage) && (
                    <div className="flex flex-wrap gap-3">
                        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                            onClick={() => {
                                const prefix = lead.leadStatus.toLowerCase();
                                setStageDetails(lead[prefix + 'Details'] || '');
                                setStageNotes(lead[prefix + 'Notes'] || '');
                                setStageAlertDate((lead[prefix + 'AlertDate'] || '').slice(0, 10));
                                setStageAlertTime(lead[prefix + 'AlertTime'] || '');
                                setEditingStage(true);
                                setPendingStage(lead.leadStatus);
                            }}>Edit {lead.leadStatus.toLowerCase()} details</button>
                        <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                            onClick={() => { setRejectReason(''); setPendingStage('Rejected'); }}>Move to Reject</button>
                    </div>
                )}

                {/* Send Proposal WhatsApp Button for Qualified leads */}
                {isQualifiedStage && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <button 
                            onClick={async () => {
                                try {
                                    const service = proposalService || lead.serviceType || lead.productServiceInterested || 'Web Development';
                                    const res = await axios.get(proposalConfigUrl(lead.leadSource, service), {
                                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                    });
                                    const msg = encodeURIComponent(res.data.proposalMessage || '');
                                    const num = (lead.whatsappNumber || lead.mobileNumber || '').replace(/\D/g, '');
                                    if (!num) { alert('Add a WhatsApp or phone number first.'); return; }
                                    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                                } catch (err) {
                                    console.error('Failed to load proposal message', err);
                                    alert('Could not load proposal template. Please configure it first.');
                                }
                            }}
                            className="w-full flex items-center justify-center py-3.5 bg-[#111111] hover:bg-[#303030] text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer active:scale-[0.98]"
                        >
                            <MessageCircle size={20} className="mr-2" /> Send Proposal (WhatsApp)
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div role="dialog" aria-modal="true" aria-label="Lead profile" className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-start p-6 bg-gray-50 border-b border-gray-100">
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <h2 className="text-2xl font-extrabold text-gray-900">{lead.customerName}</h2>
                            <span className="px-2.5 py-0.5 bg-[#e6e6e3] text-[#111111] text-xs font-bold rounded-full">{lead.leadId}</span>
                            <button 
                                onClick={() => { onClose(); onEdit(lead); }} 
                                className="p-1.5 ml-2 bg-white border border-gray-200 text-gray-500 hover:text-[#3f3f3f] hover:border-blue-300 hover:bg-[#f0f0ee] rounded-lg transition-colors cursor-pointer flex items-center shadow-sm"
                                title="Edit Lead"
                            >
                                <Eye size={16} className="mr-1.5" /> <span className="text-xs font-bold">View/Edit</span>
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm font-medium flex items-center"><Building size={14} className="mr-1.5" /> {lead.companyName || lead.industry || 'No Company Info'} &nbsp;|&nbsp; <Briefcase size={14} className="mx-1.5" /> {lead.serviceType || lead.productServiceInterested || 'Service Unknown'}</p>
                    </div>
                    <button type="button" aria-label="Close lead profile" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Grid */}
                <div className="flex-1 min-h-0 overflow-y-auto p-0 flex flex-col md:flex-row">
                    
                    {/* Left Panel: Static Details */}
                    <div className="w-full shrink-0 md:w-1/3 bg-gray-50/50 border-r border-gray-100 p-6 space-y-6 overflow-y-auto">
                        <section aria-label="Lead profile details">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <h4 className="font-bold">Lead Profile</h4>
                                {!profile && <button type="button" className="text-sm font-semibold underline"
                                    onClick={() => {
                                        setProfileError('');
                                        setProfile(Object.fromEntries(profileFields.map(([name]) => [name, lead[name] || ''])));
                                    }}>Edit Profile</button>}
                            </div>
                            {profile ? <form className="space-y-3" onSubmit={saveProfile}>
                                {profileFields.map(([name, label]) => <label key={name} className="block text-xs font-semibold">
                                    {label}
                                    <input className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                                        type={name === 'email' ? 'email' : name.endsWith('Number') ? 'tel' : 'text'}
                                        required={name === 'customerName'} value={profile[name]}
                                        onChange={event => setProfile({ ...profile, [name]: event.target.value })} />
                                </label>)}
                                {profileError && <p className="text-sm text-red-700" role="alert">{profileError}</p>}
                                <div className="flex items-center gap-3">
                                    <button type="submit" className="text-sm font-semibold underline" disabled={isSaving}>Save profile</button>
                                    <button type="button" className="text-sm" disabled={isSaving} onClick={() => setProfile(null)}>Cancel</button>
                                </div>
                            </form> : <dl className="divide-y divide-gray-100 text-sm">
                                {profileFields.map(([name, label]) => <div key={name} className="flex justify-between gap-2 py-2">
                                    <dt className="text-gray-500">{label}</dt><dd className="break-all text-right">{lead[name] || '—'}</dd>
                                </div>)}
                            </dl>}
                        </section>

                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Lead Info</h4>
                            <div className="space-y-3 text-[14px]">
                                <div className="flex justify-between"><span className="text-gray-500">Added date</span><span>{lead.date || lead.createdAt?.slice(0, 10) || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Source:</span> <span className="font-medium text-gray-800">{lead.leadSource}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Status:</span> <span className="font-medium text-[#3f3f3f] bg-[#f0f0ee] px-2 rounded">{lead.leadStatus}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Call Status:</span> <span className="font-medium text-gray-800">{lead.callStatus || 'Lead'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Value:</span> <span className="font-bold text-gray-800">₹{(lead.leadValue || 0).toLocaleString()}</span></div>
                            </div>
                        </div>
                        
                        {lead.callStatus === 'Rejected' && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                                <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center">
                                    <X size={14} className="mr-1" /> Rejected Lead
                                </h4>
                                <div className="space-y-2">
                                    <p className="text-sm text-red-800">
                                        <span className="font-semibold text-red-600">Rejected From:</span> {lead.rejectedFromStage || 'Unknown'}
                                    </p>
                                    <p className="text-sm text-red-800">
                                        <span className="font-semibold text-red-600">Reason:</span> {lead.rejectReason || 'No reason provided'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {lead.notes && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Original Notes</h4>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">{lead.notes}</p>
                            </div>
                        )}

                        {/* Callback Notes History */}
                        {[1, 2, 3, 4, 5].map(num => {
                            const desc = lead[`callback${num}Description`];
                            if (!desc) return null;
                            return (
                                <div key={`cb-${num}`}>
                                    <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center">
                                        <PhoneOutgoing size={12} className="mr-1" /> Callback ({num}) Notes
                                    </h4>
                                    <p className="text-sm text-gray-600 bg-[#f0f0ee]/50 p-3 rounded-xl border border-[#ededea] shadow-sm">{desc}</p>
                                </div>
                            );
                        })}

                        {lead.qualifiedAlertDate && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                                <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1 flex items-center">
                                    <Calendar size={12} className="mr-1.5" /> Qualified Follow-up Schedule
                                </h4>
                                <p className="text-sm font-bold text-purple-900">
                                    {lead.qualifiedAlertDate} {lead.qualifiedAlertTime ? `at ${lead.qualifiedAlertTime}` : ''}
                                </p>
                            </div>
                        )}

                        {(lead.qualifiedDetails || lead.qualifiedNotes) && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Qualified Notes</h4>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">{lead.qualifiedDetails}{lead.qualifiedNotes && lead.qualifiedNotes !== lead.qualifiedDetails && <><br />{lead.qualifiedNotes}</>}</p>
                            </div>
                        )}

                        {lead.appointmentAlertDate && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                                <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1 flex items-center">
                                    <Calendar size={12} className="mr-1.5" /> Appointment Alert Schedule
                                </h4>
                                <p className="text-sm font-bold text-orange-900">
                                    {lead.appointmentAlertDate} {lead.appointmentAlertTime ? `at ${lead.appointmentAlertTime}` : ''}
                                </p>
                            </div>
                        )}

                        {(lead.appointmentDetails || lead.appointmentNotes) && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Appointment Notes</h4>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">{lead.appointmentDetails}{lead.appointmentNotes && lead.appointmentNotes !== lead.appointmentDetails && <><br />{lead.appointmentNotes}</>}</p>
                            </div>
                        )}

                        {lead.leadStatus === 'Converted' && lead.fullAmount != null && <p className="text-sm font-semibold">Full amount ₹{lead.fullAmount.toLocaleString()}</p>}
                        {lead.advanceAmount > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Advance Amount Paid</h4>
                                <p className="text-sm font-bold text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm flex items-center">
                                    <IndianRupee size={14} className="mr-1" /> {lead.advanceAmount.toLocaleString()}
                                </p>
                            </div>
                        )}

                        {lead.paymentScreenshot && (() => {
                            const screenshotUrl = lead.paymentScreenshot.startsWith('http') 
                                ? lead.paymentScreenshot 
                                : `${API_BASE_URL}${lead.paymentScreenshot}`;
                            return (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Screenshot</h4>
                                    <a href={screenshotUrl} target="_blank" rel="noreferrer" className="block w-full rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm hover:border-blue-400 transition-colors">
                                        <img src={screenshotUrl} alt="Payment Screenshot" className="w-full h-auto object-cover max-h-40" />
                                    </a>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Right Panel: Interactive Actions */}
                    <div className="w-full md:w-2/3 flex shrink-0 flex-col md:shrink md:overflow-hidden">
                        <div className="space-y-6 overflow-y-auto p-6">
                            {!pendingStage && !['Qualified', 'Appointment', 'Converted'].includes(lead.leadStatus) && renderCallStatus()}
                            {renderPipelineStages()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
