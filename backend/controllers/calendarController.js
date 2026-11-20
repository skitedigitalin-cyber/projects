const CalendarEvent = require('../models/CalendarEvent');

exports.getEvents = async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = { tenantId: req.user.tenantId };
        
        let reqYear = parseInt(year) || new Date().getFullYear();
        let reqMonth = parseInt(month) || new Date().getMonth() + 1;

        if (month && year) {
            const startDate = new Date(reqYear, reqMonth - 1, 1);
            const endDate = new Date(reqYear, reqMonth, 0, 23, 59, 59);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const dbEvents = await CalendarEvent.find(query).sort({ date: 1 });
        res.status(200).json(dbEvents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching calendar events' });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, date, type, description } = req.body;
        const newEvent = new CalendarEvent({
            tenantId: req.user.tenantId,
            title,
            date: new Date(date),
            type,
            description,
            createdBy: req.user.userId
        });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating calendar event' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting event' });
    }
};
