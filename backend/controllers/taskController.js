const Task = require('../models/Task');
const Employee = require('../models/Employee');
const SocialMediaProject = require('../models/SocialMediaProject');
const WebDevProject = require('../models/WebDevProject');
const SEOProject = require('../models/SEOProject');

// HR API: Create a new task
exports.createTask = async (req, res) => {
    try {
        const { employeeId, title, description, priority, dueDate } = req.body;
        
        const task = new Task({
            tenantId: req.user.tenantId,
            employeeId, // The _id of the Employee model
            assignedBy: req.user.userId,
            title,
            description,
            priority,
            dueDate
        });

        await task.save();
        res.status(201).json({ message: 'Task assigned successfully', task });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Get all tasks across the company
exports.getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ tenantId: req.user.tenantId })
            .populate('employeeId', 'firstName lastName employeeId department')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Employee API: Get My Tasks (Enriched with Project Checklists)
exports.getMyTasks = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const tasks = await Task.find({ tenantId: req.user.tenantId, employeeId: employee._id }).sort({ createdAt: -1 }).lean();

        // Fetch any Web Dev or SEO Projects assigned to this employee
        const webProjects = await WebDevProject.find({ 
            tenantId: req.user.tenantId, 
            assignedDeveloper: employee._id 
        }).select('_id businessName website websiteType checklist requirements projectStatus clientStatus').lean();

        const seoProjects = await SEOProject.find({ 
            tenantId: req.user.tenantId, 
            assignedSpecialist: employee._id 
        }).select('_id businessName website checklist customTasks projectStatus clientStatus').lean();

        // Attach linked project checklists to tasks
        const enrichedTasks = tasks.map(task => {
            const enriched = { ...task };

            // 1. Match Web Dev Project
            const matchedWeb = webProjects.find(wp => 
                (task.projectId && String(wp._id) === String(task.projectId)) ||
                (wp.businessName && task.title.toLowerCase().includes(wp.businessName.toLowerCase())) ||
                (webProjects.length === 1 && task.title.includes('[Web Dev]'))
            );
            if (matchedWeb) {
                enriched.webDevProject = matchedWeb;
            }

            // 2. Match SEO Project
            const matchedSeo = seoProjects.find(sp => 
                (task.projectId && String(sp._id) === String(task.projectId)) ||
                (sp.businessName && task.title.toLowerCase().includes(sp.businessName.toLowerCase())) ||
                (seoProjects.length === 1 && task.title.includes('[SEO Project]'))
            );
            if (matchedSeo) {
                enriched.seoProject = matchedSeo;
            }

            return enriched;
        });

        // Ensure any assigned Web Dev project with a milestone checklist shows up
        webProjects.forEach(wp => {
            // Only auto-generate project task if project actually has a milestone checklist (E-Commerce / Static)
            if (!wp.checklist || wp.checklist.length === 0) return;

            const hasExisting = enrichedTasks.some(t => 
                t.webDevProject && String(t.webDevProject._id) === String(wp._id)
            );
            if (!hasExisting) {
                const allDone = wp.checklist.length > 0 && wp.checklist.every(c => c.status === 'Completed');
                enrichedTasks.unshift({
                    _id: `web_${wp._id}`,
                    title: `[Web Dev] ${wp.businessName} (${wp.websiteType || 'Web Development'})`,
                    description: `Client: ${wp.businessName}\nWebsite: ${wp.website || 'N/A'}\nType: ${wp.websiteType || 'Website'}`,
                    priority: 'High',
                    status: allDone ? 'Completed' : 'Pending',
                    webDevProject: wp,
                    isProjectTask: true
                });
            }
        });

        // Ensure any assigned SEO project with a checklist shows up
        seoProjects.forEach(sp => {
            if (!sp.checklist || sp.checklist.length === 0) return;

            const hasExisting = enrichedTasks.some(t => 
                t.seoProject && String(t.seoProject._id) === String(sp._id)
            );
            if (!hasExisting) {
                const allDone = sp.checklist.length > 0 && sp.checklist.every(c => c.isCompleted);
                enrichedTasks.unshift({
                    _id: `seo_${sp._id}`,
                    title: `[SEO Project] ${sp.businessName}`,
                    description: `Client: ${sp.businessName}\nWebsite: ${sp.website || 'N/A'}\nStatus: ${sp.projectStatus || 'In Progress'}`,
                    priority: 'High',
                    status: allDone ? 'Completed' : 'Pending',
                    seoProject: sp,
                    isProjectTask: true
                });
            }
        });

        // Sort: Pending tasks always on top, then newest
        enrichedTasks.sort((a, b) => {
            const aPending = a.status !== 'Completed';
            const bPending = b.status !== 'Completed';
            if (aPending && !bPending) return -1;
            if (!aPending && bPending) return 1;
            return 0;
        });

        res.json(enrichedTasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Employee API: Update Task Status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.status = status;
        await task.save();

        // Sync linked Social Media Project content item status
        try {
            await SocialMediaProject.updateMany(
                { tenantId: req.user.tenantId, "contentItems.assignedTaskId": task._id },
                { $set: { "contentItems.$.status": status } }
            );
        } catch (syncErr) {
            console.error("Error syncing task status to social media project:", syncErr);
        }

        res.json({ message: 'Task updated', task });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
