const mongoose = require('mongoose');
require('dotenv').config();
const Task = require('./models/Task');
const SocialMediaProject = require('./models/SocialMediaProject');

const formatTo12Hour = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) return timeStr;
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
        let hour = parseInt(parts[0], 10);
        const minute = parts[1].slice(0, 2);
        if (isNaN(hour)) return timeStr;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        if (hour === 0) hour = 12;
        const paddedHour = String(hour).padStart(2, '0');
        return `${paddedHour}:${minute} ${ampm}`;
    }
    return timeStr;
};

const formatDateClean = (d) => {
    if (!d) return '-';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

async function syncExisting() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const projects = await SocialMediaProject.find({});
        
        for (const proj of projects) {
            const business = proj.businessName || proj.clientName || '-';
            const contact = proj.clientName || proj.businessName || '-';
            const label = (proj.businessName && proj.clientName && proj.businessName !== proj.clientName) 
                ? `${proj.businessName} (${proj.clientName})`
                : (proj.businessName || proj.clientName);

            for (const item of proj.contentItems) {
                if (item.assignedTaskId) {
                    const t = await Task.findById(item.assignedTaskId);
                    if (t) {
                        const time12 = formatTo12Hour(item.startTime);
                        const end12 = formatTo12Hour(item.endTime);
                        const formattedTime = time12 ? (end12 ? `${time12} - ${end12}` : time12) : '-';
                        const dStr = formatDateClean(item.date);
                        
                        const newDesc = `Business Name: ${business}\nClient Contact Name: ${contact}\nStage: ${item.type}\nTarget Date: ${dStr}\nTime: ${formattedTime}\nDetails & Instructions: ${item.details || 'No additional notes'}`;
                        
                        let newTitle = t.title;
                        if (newTitle.startsWith('[Trading]')) {
                            newTitle = newTitle.replace('[Trading]', `[${label}]`);
                        }

                        t.title = newTitle;
                        t.description = newDesc;
                        await t.save();
                        console.log('Updated Task:', t.title, 'Time:', formattedTime);
                    }
                }
            }
        }
        console.log('Done syncing tasks successfully.');
    } catch (e) {
        console.error('Error syncing:', e);
    } finally {
        await mongoose.disconnect();
    }
}

syncExisting();
