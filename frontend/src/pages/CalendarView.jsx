import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X, Flag, Bookmark, Clock, Sparkles } from 'lucide-react';

export default function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        type: 'Note',
        description: ''
    });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        fetchEvents();
    }, [currentDate.getMonth(), currentDate.getFullYear()]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/calendar?month=' + (currentDate.getMonth() + 1) + '&year=' + currentDate.getFullYear(), {
                headers: { Authorization: 'Bearer ' + token }
            });
            setEvents(res.data);
        } catch (error) {
            console.error('Error fetching calendar events', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDayClick = (day) => {
        if (!day) return;
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(clickedDate);
        setFormData({ title: '', type: 'Note', description: '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/calendar', {
                ...formData,
                date: selectedDate
            }, {
                headers: { Authorization: 'Bearer ' + token }
            });
            setEvents([...events, res.data]);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving event', error);
            alert('Failed to save calendar event');
        }
    };

    const deleteEvent = async (e, id) => {
        e.stopPropagation();
        if(!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete('http://localhost:5000/api/calendar/' + id, {
                headers: { Authorization: 'Bearer ' + token }
            });
            setEvents(events.filter(ev => ev._id !== id));
        } catch (error) {
            console.error('Error deleting event', error);
        }
    };

    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const generateCalendarCells = () => {
        const daysInMonth = getDaysInMonth(currentDate.getMonth(), currentDate.getFullYear());
        const firstDay = getFirstDayOfMonth(currentDate.getMonth(), currentDate.getFullYear());
        
        let cells = [];
        for (let i = 0; i < firstDay; i++) {
            cells.push({ day: null });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const cellDateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
            const dayEvents = events.filter(e => new Date(e.date).toDateString() === cellDateStr);
            cells.push({ day: d, events: dayEvents });
        }
        return cells;
    };

    const todayStr = new Date().toDateString();
    const todayEvents = events.filter(e => new Date(e.date).toDateString() === todayStr);
    const upcomingEvents = events.filter(e => {
        const d = new Date(e.date);
        d.setHours(0,0,0,0);
        const t = new Date();
        t.setHours(0,0,0,0);
        return d > t;
    }).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

    return (
        <Layout>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes calendarPop {
                    0% { opacity: 0; transform: scale(0.9) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                .calendar-cell-animate {
                    animation: calendarPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
            `}} />
            <div className="max-w-[90rem] mx-auto pt-4 pb-12 animate-fade-up">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center">
                            <CalendarIcon size={32} className="mr-3 text-blue-600" />
                            Workspace Calendar
                        </h1>
                        <p className="text-slate-500 font-medium">Manage holidays, team events, and personal notes.</p>
                    </div>
                    <div className="flex items-center space-x-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ChevronLeft size={20} className="text-slate-600" />
                        </button>
                        <span className="text-lg font-bold text-slate-900 w-40 text-center">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ChevronRight size={20} className="text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col xl:flex-row gap-8">
                    
                    {/* Left Column: Calendar Grid */}
                    <div className="flex-1">
                        <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-[2rem] border border-slate-200 shadow-inner overflow-hidden p-3">
                            <div className="bg-slate-200/50 rounded-[1.5rem] p-2 border border-slate-300/50 shadow-inner">
                                {/* Days Header */}
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {days.map(d => (
                                        <div key={d} className="text-center py-2.5 mb-2 mx-1 rounded-xl bg-slate-200/50 text-xs font-extrabold text-slate-500 uppercase tracking-wider shadow-sm">
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Calendar Body */}
                                <div className="grid grid-cols-7 gap-1">
                                    {generateCalendarCells().map((cell, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleDayClick(cell.day)}
                                            style={{ animationDelay: `${idx * 15}ms` }}
                                            className={"calendar-cell-animate min-h-[120px] p-2 rounded-2xl border relative group transition-all " + (cell.day ? 'bg-white border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'bg-slate-50/30 border-dashed border-slate-200/50')}
                                        >
                                            {cell.day && (
                                                <>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={"text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full " + (
                                                            todayStr === new Date(currentDate.getFullYear(), currentDate.getMonth(), cell.day).toDateString()
                                                            ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-600/20'
                                                            : 'text-slate-700 group-hover:text-blue-600 group-hover:bg-blue-50'
                                                        )}>
                                                            {cell.day}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-1.5 overflow-y-auto max-h-[80px] custom-scrollbar">
                                                        {cell.events?.map(ev => (
                                                            <div 
                                                                key={ev._id} 
                                                                onClick={(e) => e.stopPropagation()}
                                                                className={"text-xs px-2 py-1.5 rounded-lg border flex justify-between items-center group/ev relative " + (
                                                                    ev.type === 'Holiday' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                                                                    ev.type === 'Meeting' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                    'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                )}
                                                                title={ev.description || ev.title}
                                                            >
                                                                <div className="flex items-center truncate mr-1">
                                                                    {ev.type === 'Holiday' ? <Flag size={10} className="mr-1.5 flex-shrink-0" /> : <Bookmark size={10} className="mr-1.5 flex-shrink-0" />}
                                                                    <span className="font-semibold truncate">{ev.title}</span>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        deleteEvent(e, ev._id);
                                                                    }}
                                                                    className="opacity-0 group-hover/ev:opacity-100 hover:bg-red-100 p-0.5 rounded text-slate-400 hover:text-red-600 transition-all flex-shrink-0 cursor-pointer"
                                                                    title="Delete event"
                                                                >
                                                                    <X size={12} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Today & Upcoming Sidebar */}
                    <div className="w-full xl:w-96 flex-shrink-0 flex flex-col space-y-6">
                        
                        {/* Today's Agenda */}
                        <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100">
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
                                        <Sparkles size={18} className="mr-2 text-blue-600" />
                                        Today's Agenda
                                    </h2>
                                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                                        {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                
                                {todayEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {todayEvents.map(ev => (
                                            <div key={ev._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-blue-200 transition-all group flex items-start justify-between">
                                                <div className="flex items-start">
                                                    <div className={"w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0 " + (ev.type === 'Holiday' ? 'bg-rose-500' : ev.type === 'Meeting' ? 'bg-amber-500' : 'bg-emerald-500')}></div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{ev.title}</h4>
                                                        <p className="text-xs text-slate-500 mt-1 font-medium">{ev.description || ev.type}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => deleteEvent(e, ev._id)} 
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                    title="Delete event"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CalendarIcon size={20} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500">No events scheduled for today.</p>
                                        <p className="text-xs text-slate-400 mt-1">Enjoy your day!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100">
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
                                        <Clock size={18} className="mr-2 text-slate-600" />
                                        Upcoming
                                    </h2>
                                </div>

                                {upcomingEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingEvents.map(ev => (
                                            <div key={ev._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-blue-200 transition-all group flex items-start justify-between">
                                                <div className="flex items-start">
                                                    <div className={"w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0 " + (ev.type === 'Holiday' ? 'bg-rose-500' : ev.type === 'Meeting' ? 'bg-amber-500' : 'bg-emerald-500')}></div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{ev.title}</h4>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
                                                                {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 font-medium">{ev.type}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => deleteEvent(e, ev._id)} 
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                    title="Delete event"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-sm font-medium text-slate-500">No upcoming events this month.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[var(--app-bg)]">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Add Calendar Note</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {selectedDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
                                <X size={18} className="text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Title</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-4 py-3 bg-[var(--app-bg)] border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                                        placeholder="E.g., Diwali, Team Offsite, Personal Reminder"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Type</label>
                                    <select 
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                        className="w-full px-4 py-3 bg-[var(--app-bg)] border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                                    >
                                        <option value="Note">Personal Note</option>
                                        <option value="Holiday">Public Holiday</option>
                                        <option value="Meeting">Meeting / Event</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Details (Optional)</label>
                                    <textarea 
                                        rows="3"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-4 py-3 bg-[var(--app-bg)] border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium resize-none"
                                        placeholder="Add any extra information here..."
                                    />
                                </div>
                            </div>
                            <div className="mt-8">
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98]">
                                    Save to Calendar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}




