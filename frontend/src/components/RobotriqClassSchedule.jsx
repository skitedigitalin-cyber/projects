import './RobotriqWorkspace.css';
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const courses = [
    'ABB PROCESS AUTOMATION',
    'INDUSTRIAL AUTOMATION 4.0',
    'ALLEN BRADLEY – ROCKWELL AUTOMATION',
    'SCHNEIDER ELECTRIC INDUSTRIAL AUTOMATION',
    'SIEMENS INDUSTRIAL AUTOMATION',
    'DELTA INDUSTRIAL AUTOMATION',
    'MITSUBISHI ELECTRIC FACTORY AUTOMATION'
];
const fields = ['topic', 'trainer', 'link'];
const emptySlot = () => ({ topic: '', trainer: '', link: '' });
const scheduleUrl = course => `${API_BASE_URL}/api/robotriq/schedules/${encodeURIComponent(course)}`;

export default function RobotriqClassSchedule() {
    const [course, setCourse] = useState(courses[0]);
    const [slots, setSlots] = useState(null);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(scheduleUrl(course), { signal: controller.signal }).then(({ data }) => {
            setSlots(data?.weeklySchedule?.length ? data.weeklySchedule : Array.from({ length: 6 }, emptySlot));
        }).catch(() => {
            if (!controller.signal.aborted) setMessage('Could not load the class schedule.');
        });
        return () => controller.abort();
    }, [course]);

    async function save(event) {
        event.preventDefault();
        const weeklySchedule = slots.filter(slot => slot.topic?.trim()).map(slot => ({
            topic: slot.topic,
            trainer: slot.trainer || '',
            link: slot.link || ''
        }));
        if (!weeklySchedule.length) {
            setMessage('Enter at least one class topic.');
            return;
        }
        setSaving(true);
        setMessage('');
        try {
            const { data } = await axios.put(scheduleUrl(course), { weeklySchedule });
            setSlots(data.weeklySchedule);
            setMessage('Class schedule saved.');
        } catch {
            setMessage('Could not save the class schedule.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="robotriq-schedule">
            <header className="student-tab-header"><h2>Class schedule</h2></header>
            <form onSubmit={save}>
                <label className="student-tab-panel">
                    Course
                    <select value={course} disabled={saving} onChange={event => {
                        setSlots(null);
                        setMessage('');
                        setCourse(event.target.value);
                    }}>
                        {courses.map(name => <option key={name}>{name}</option>)}
                    </select>
                </label>
                {!slots && !message && <p role="status">Loading class schedule…</p>}
                {slots && <fieldset className="robotriq-schedule-days" disabled={saving}>
                    {slots.map((slot, index) => <fieldset className="robotriq-schedule-day" key={index}>
                        <legend>Day {index + 1}</legend>
                        {fields.map(field => <label key={field}>
                            {field[0].toUpperCase() + field.slice(1)}
                            <input value={slot[field] || ''} onChange={event => {
                                const value = event.target.value;
                                setSlots(current => current.map((row, rowIndex) =>
                                    rowIndex === index ? { ...row, [field]: value } : row));
                            }} />
                        </label>)}
                        <button type="button" onClick={() => setSlots(current => current.filter((_, rowIndex) => rowIndex !== index))}>
                            Remove day
                        </button>
                    </fieldset>)}
                    <div className="robotriq-schedule-actions">
                        <button type="button" onClick={() => setSlots(current => [...current, emptySlot()])}>Add day</button>
                        <button type="submit" className="student-tab-primary">{saving ? 'Saving…' : 'Save schedule'}</button>
                    </div>
                </fieldset>}
                {message && <p role="status">{message}</p>}
            </form>
        </section>
    );
}
