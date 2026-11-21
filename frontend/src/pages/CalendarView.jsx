import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import './CalendarView.css';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

export default function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        type: 'Note',
        description: ''
    });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const selectedMonth = currentDate.getMonth();
    const selectedYear = currentDate.getFullYear();
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setLoadError(false);
        setEvents([]);
        axios.get('http://localhost:5000/api/calendar', {
            params: { month: selectedMonth + 1, year: selectedYear },
            signal: controller.signal,
            headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }).then(({ data }) => {
            setEvents(Array.isArray(data) ? data : []);
        }).catch(() => {
            if (!controller.signal.aborted) setLoadError(true);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [selectedMonth, selectedYear]);

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
            setEvents(previous => [...previous, res.data]);
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
            setEvents(previous => previous.filter(ev => ev._id !== id));
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

    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
    const cells = generateCalendarCells();
    const firstDay = getFirstDayOfMonth(currentDate.getMonth(), currentDate.getFullYear());
    const eventTypes = events.reduce((counts, event) => {
        counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
        return counts;
    }, new Map());

    const renderAgenda = (items, empty, showDate = false) => items.length > 0 ? (
        <ul className="calendar-agenda-list">
            {items.map(event => (
                <li key={event._id}>
                    <time dateTime={event.date}>{showDate ? new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : event.type}</time>
                    <div><strong>{event.title}</strong>{event.description && <p>{event.description}</p>}</div>
                    <button type="button" aria-label={`Delete ${event.title}`} onClick={e => deleteEvent(e, event._id)}><X size={15} /></button>
                </li>
            ))}
        </ul>
    ) : <p className="calendar-muted">{loading ? 'Loading events…' : loadError ? 'Events are currently unavailable.' : empty}</p>;

    return (
        <Layout workspace compactTools>
            <div className="workspace-calendar">
                <header className="calendar-page-heading">
                    <div>
                        <p>Calendar</p>
                        <h1>{monthNames[currentDate.getMonth()]} <span>{currentDate.getFullYear()}</span></h1>
                    </div>
                    <div className="calendar-controls">
                        <button type="button" aria-label="Previous month" onClick={handlePrevMonth}><ChevronLeft size={17} /></button>
                        <button type="button" onClick={() => setCurrentDate(new Date())}>Today</button>
                        <button type="button" aria-label="Next month" onClick={handleNextMonth}><ChevronRight size={17} /></button>
                        <button type="button" onClick={() => handleDayClick(isCurrentMonth ? today.getDate() : 1)}><Plus size={15} /> New event</button>
                    </div>
                </header>
                <div className="calendar-page-grid">
                    <section className="calendar-month-panel" aria-label="Month calendar" aria-busy={loading}>
                        <div className="calendar-month-grid">
                            {days.map(label => <span className="calendar-weekday" key={label}>{label}</span>)}
                            {cells.map((cell, index) => {
                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), cell.day ?? index - firstDay + 1);
                                return (
                                    <div className="calendar-day" key={index} data-current={!!cell.day && cell.day === today.getDate() && isCurrentMonth}
                                        onClick={event => { if (cell.day && event.target === event.currentTarget) handleDayClick(cell.day); }}>
                                        {cell.day ? (
                                            <button className="calendar-day-number" type="button" aria-label={`Add event on ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`} onClick={() => handleDayClick(cell.day)}>{cell.day}</button>
                                        ) : <span className="calendar-adjacent-day" aria-hidden="true">{date.getDate()}</span>}
                                        {cell.events?.length > 0 && <div className="calendar-cell-events">
                                            {cell.events.map(event => (
                                                <div className="calendar-event-chip" key={event._id} data-type={event.type} title={event.description || event.title}>
                                                    <span>{event.title}</span>
                                                    <button type="button" aria-label={`Delete ${event.title}`} onClick={e => deleteEvent(e, event._id)}><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>}
                                    </div>
                                );
                            })}
                            {Array.from({ length: (7 - cells.length % 7) % 7 }, (_, index) => <span className="calendar-adjacent-day calendar-trailing-day" aria-hidden="true" key={index}>{index + 1}</span>)}
                        </div>
                    </section>
                    <aside className="calendar-side">
                        <section className="calendar-agenda">
                            <h2>Today</h2>
                            {renderAgenda(todayEvents, isCurrentMonth ? 'No events scheduled for today.' : 'Go to Today to see today’s events.')}
                        </section>
                        <section className="calendar-month-summary">
                            <p>{isCurrentMonth ? 'This month' : monthNames[currentDate.getMonth()]}</p>
                            <strong>{loading || loadError ? '—' : events.length} <span>events</span></strong>
                            {eventTypes.size > 0 && <small>{[...eventTypes].map(([type, count]) => `${count} ${type.toLowerCase()}${count === 1 ? '' : 's'}`).join(' · ')}</small>}
                        </section>
                        <section className="calendar-agenda">
                            <h2>Upcoming</h2>
                            {renderAgenda(upcomingEvents, 'No upcoming events this month.', true)}
                        </section>
                    </aside>
                </div>
            </div>

            {/* Add Event Modal */}
            {isModalOpen && (
                <dialog className="calendar-event-dialog"
                    ref={dialog => { if (dialog && !dialog.open) dialog.showModal(); }}
                    onCancel={() => setIsModalOpen(false)} aria-labelledby="calendar-event-title">
                        <header className="calendar-dialog-heading">
                            <div>
                                <h3 id="calendar-event-title">New event</h3>
                                <p>
                                    {selectedDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button type="button" aria-label="Close event dialog" onClick={() => setIsModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </header>
                        <form onSubmit={handleSubmit} className="calendar-dialog-form">
                                <label>Event title
                                    <input 
                                        autoFocus
                                        type="text" 
                                        required 
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        placeholder="E.g., Diwali, Team Offsite, Personal Reminder"
                                    />
                                </label>
                                <label>Event type
                                    <select 
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="Note">Personal Note</option>
                                        <option value="Holiday">Public Holiday</option>
                                        <option value="Meeting">Meeting / Event</option>
                                    </select>
                                </label>
                                <label>Details (optional)
                                    <textarea 
                                        rows="3"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        placeholder="Add any extra information here..."
                                    />
                                </label>
                                <button type="submit">Save to Calendar</button>
                        </form>
                </dialog>
            )}
        </Layout>
    );
}




