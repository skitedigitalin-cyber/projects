const SocialMediaProject = require('../models/SocialMediaProject');
const WebDevProject = require('../models/WebDevProject');
const SEOProject = require('../models/SEOProject');
const Employee = require('../models/Employee');
const Task = require('../models/Task');

// Master Checklists
const ECOMM_CHECKLIST = [
    'Domain purchasing & Hosting',
    'Client requirements',
    'Design approval',
    'Colour code',
    'Typography',
    'UI development',
    'Logo',
    'Contact details',
    'About us details',
    'Social links',
    'Website development',
    'Mobile friendly development',
    'Payment integration',
    'Email integration',
    'Admin panel development',
    'Project overview',
    'Project handover'
];

const STATIC_CHECKLIST = [
    'Requirements',
    'Design approval',
    'Logo',
    'Colour code',
    'Typography',
    'UI development',
    'Contents updated',
    'Images',
    'Contact details',
    'Email integration',
    'Website complete'
];

const SEO_MASTER_CATEGORIES = [
    {
        category: 'Keyword Research & Technical SEO',
        tasks: [
            'Identify primary keyword (main topic)',
            'Find secondary and long-tail keywords',
            'Analyze search intent',
            'Check keyword difficulty and search volume',
            'Perform competitor keyword analysis',
            'Website loads fast (<3 seconds)',
            'Mobile-friendly',
            'HTTPS enabled (SSL)',
            'Fix broken links (404)',
            'Create XML sitemap',
            'Submit sitemap in GSC',
            'Create Google Search Console',
            'Use robots.txt correctly',
            'Canonical tags',
            'Structured data (Schema)',
            'Integrate GSC and GA',
            'Index all pages'
        ]
    },
    {
        category: 'Content & On-Page SEO',
        tasks: [
            'Target one main keyword per page',
            'Write for user intent',
            'Use short paragraphs & headings (H2, H3)',
            'Add internal links',
            'Add external links to trusted sources',
            'Match content length with competitors',
            'Optimize meta title & description',
            'Use short, clean URLs',
            'Avoid numbers/special chars in URL',
            'Descriptive file names',
            'Add ALT text with keywords',
            'Compress images',
            'Publish 4 blog posts/month'
        ]
    },
    {
        category: 'Off-Page SEO Tasks',
        tasks: [
            'Build high-quality backlinks',
            'Perform guest posting',
            'Submit to directories',
            'Do social bookmarking',
            'Conduct influencer outreach',
            'Avoid spammy links',
            'Track traffic and behavior',
            'Monitor keyword rankings',
            'Continually create backlinks'
        ]
    },
    {
        category: 'Local SEO Tasks',
        tasks: [
            'Create/Optimize Google Business Profile',
            'Maintain NAP consistency',
            'Collect customer reviews',
            'Use location-based keywords',
            'List in local directories',
            'Publish 2 posts per week',
            'Monitor Performance'
        ]
    }
];

// 1. STATS OVERVIEW
exports.getStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const [smCount, webCount, seoCount, tasks] = await Promise.all([
            SocialMediaProject.countDocuments({ tenantId }),
            WebDevProject.countDocuments({ tenantId }),
            SEOProject.countDocuments({ tenantId }),
            Task.find({ tenantId })
        ]);

        const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;

        res.json({
            socialMediaProjects: smCount,
            webDevProjects: webCount,
            seoProjects: seoCount,
            totalTasks: tasks.length,
            pendingTasks,
            completedTasks
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
};

// 2. GET ELIGIBLE EMPLOYEES
exports.getTeamEmployees = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const employees = await Employee.find({ tenantId, status: 'Active' })
            .select('firstName lastName employeeId role designation department email phone')
            .lean();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching team employees', error: err.message });
    }
};

/* =========================================================================
   SOCIAL MEDIA MARKETING CONTROLLERS
========================================================================= */

exports.getSocialMediaProjects = async (req, res) => {
    try {
        const projects = await SocialMediaProject.find({ tenantId: req.user.tenantId })
            .populate('contentItems.assignedEmployee', 'firstName lastName role designation department')
            .populate('contentItems.assignedTaskId', 'status title priority dueDate')
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.createSocialMediaProject = async (req, res) => {
    try {
        const { clientName, businessName, phone, email, month } = req.body;
        if (!clientName) return res.status(400).json({ message: 'Client name is required' });

        const project = new SocialMediaProject({
            tenantId: req.user.tenantId,
            clientName,
            businessName,
            phone,
            email,
            month: month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
        });
        await project.save();
        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getSocialMediaProjectById = async (req, res) => {
    try {
        const project = await SocialMediaProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
            .populate('contentItems.assignedEmployee', 'firstName lastName role designation department')
            .populate('contentItems.assignedTaskId', 'status title priority dueDate');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.updateSocialMediaProject = async (req, res) => {
    try {
        const project = await SocialMediaProject.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            req.body,
            { new: true }
        )
        .populate('contentItems.assignedEmployee', 'firstName lastName role designation department')
        .populate('contentItems.assignedTaskId', 'status title priority dueDate');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteSocialMediaProject = async (req, res) => {
    try {
        const project = await SocialMediaProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Delete all linked tasks
        const taskIds = project.contentItems
            .map(i => i.assignedTaskId)
            .filter(Boolean);
        if (taskIds.length > 0) {
            await Task.deleteMany({ _id: { $in: taskIds } });
        }

        await SocialMediaProject.findByIdAndDelete(project._id);
        res.json({ message: 'Project and linked tasks deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

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

exports.addSocialMediaContentItem = async (req, res) => {
    try {
        const { 
            type, 
            date, 
            startTime, 
            endTime, 
            details, 
            assignedEmployee,
            // Multi-role production pipeline fields
            scriptWriterId,
            scriptDate,
            shooterId,
            shootDate,
            editorId,
            editDate,
            posterId
        } = req.body;

        const project = await SocialMediaProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const businessNameStr = project.businessName || project.clientName || '-';
        const clientContactStr = project.clientName || project.businessName || '-';
        const clientLabel = (project.businessName && project.clientName && project.businessName !== project.clientName)
            ? `${project.businessName} (${project.clientName})`
            : (project.businessName || project.clientName || 'General Client');

        // 12-Hour formatted times (no railway time)
        const start12 = formatTo12Hour(startTime);
        const end12 = formatTo12Hour(endTime);
        const formattedTime = start12 ? (end12 ? `${start12} - ${end12}` : start12) : '-';

        // Helper to create task
        const createTaskAndItem = async (pType, pDate, pEmployeeId, priority, customTitle) => {
            let taskId = null;
            if (pEmployeeId) {
                const titleStr = customTitle || `[${clientLabel}] - ${pType} Content Task`;
                const newTask = new Task({
                    tenantId: req.user.tenantId,
                    employeeId: pEmployeeId,
                    assignedBy: req.user.userId,
                    title: titleStr,
                    description: `Business Name: ${businessNameStr}\nClient Contact Name: ${clientContactStr}\nStage: ${pType}\nTarget Date: ${formatDateClean(pDate)}\nTime: ${formattedTime}\nDetails & Instructions: ${details || 'No additional notes'}`,
                    priority: priority || 'Normal',
                    dueDate: pDate,
                    status: 'Pending'
                });
                const savedTask = await newTask.save();
                taskId = savedTask._id;
            }

            return {
                type: pType,
                date: pDate,
                startTime: start12 || '',
                endTime: end12 || '',
                details: details || '',
                status: 'Pending',
                assignedEmployee: pEmployeeId || null,
                assignedTaskId: taskId || null
            };
        };

        // When adding a Post with multi-role assignments:
        if (type === 'Post' && (scriptWriterId || shooterId || editorId || posterId)) {
            const postDateObj = new Date(date);

            // 1. Script Writer Task
            if (scriptWriterId) {
                const sDate = scriptDate ? new Date(scriptDate) : new Date(new Date(postDateObj).getTime() - 10 * 24 * 60 * 60 * 1000);
                const scriptItem = await createTaskAndItem(
                    'Script', 
                    sDate, 
                    scriptWriterId, 
                    'Normal', 
                    `[${clientLabel}] - Reel Script Writing`
                );
                project.contentItems.push(scriptItem);
            }

            // 2. Shoot Task
            if (shooterId) {
                const shDate = shootDate ? new Date(shootDate) : new Date(new Date(postDateObj).getTime() - 5 * 24 * 60 * 60 * 1000);
                const shootItem = await createTaskAndItem(
                    'Shoot', 
                    shDate, 
                    shooterId, 
                    'Normal', 
                    `[${clientLabel}] - Reel Video Shooting`
                );
                project.contentItems.push(shootItem);
            }

            // 3. Edit Task
            if (editorId) {
                const eDate = editDate ? new Date(editDate) : new Date(new Date(postDateObj).getTime() - 2 * 24 * 60 * 60 * 1000);
                const editItem = await createTaskAndItem(
                    'Edit', 
                    eDate, 
                    editorId, 
                    'High', 
                    `[${clientLabel}] - Reel Video Editing`
                );
                project.contentItems.push(editItem);
            }

            // 4. Post Task
            const targetPoster = posterId || assignedEmployee;
            if (targetPoster) {
                const postItem = await createTaskAndItem(
                    'Post', 
                    postDateObj, 
                    targetPoster, 
                    'High', 
                    `[${clientLabel}] - Reel Social Media Publishing`
                );
                project.contentItems.push(postItem);
            }
        } else {
            // Standard single item addition (for Script, Shoot, Edit, Post, Design)
            const singleItem = await createTaskAndItem(type, date, assignedEmployee, 'Normal');
            project.contentItems.push(singleItem);
        }

        await project.save();
        const updated = await SocialMediaProject.findById(project._id)
            .populate('contentItems.assignedEmployee', 'firstName lastName role designation department')
            .populate('contentItems.assignedTaskId', 'status title priority dueDate');
        res.status(201).json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.updateSocialMediaContentItemStatus = async (req, res) => {
    try {
        const { status, date, startTime, endTime, details, assignedEmployee } = req.body;
        const project = await SocialMediaProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const item = project.contentItems.id(req.params.itemId);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const businessNameStr = project.businessName || project.clientName || '-';
        const clientContactStr = project.clientName || project.businessName || '-';
        const clientLabel = (project.businessName && project.clientName && project.businessName !== project.clientName)
            ? `${project.businessName} (${project.clientName})`
            : (project.businessName || project.clientName || 'General Client');

        if (status !== undefined) item.status = status;
        if (date !== undefined && date !== '') item.date = date;
        if (startTime !== undefined) item.startTime = formatTo12Hour(startTime);
        if (endTime !== undefined) item.endTime = formatTo12Hour(endTime);
        if (details !== undefined) item.details = details;

        // If assigned employee is provided / changed
        if (assignedEmployee !== undefined) {
            item.assignedEmployee = assignedEmployee || null;

            const start12 = formatTo12Hour(item.startTime);
            const end12 = formatTo12Hour(item.endTime);
            const itemFormattedTime = start12 ? (end12 ? `${start12} - ${end12}` : start12) : '-';

            if (item.assignedTaskId) {
                if (assignedEmployee) {
                    await Task.findByIdAndUpdate(item.assignedTaskId, {
                        employeeId: assignedEmployee,
                        dueDate: item.date,
                        status: item.status,
                        title: `[${clientLabel}] - ${item.type} Content Task`,
                        description: `Business Name: ${businessNameStr}\nClient Contact Name: ${clientContactStr}\nStage: ${item.type}\nTarget Date: ${formatDateClean(item.date)}\nTime: ${itemFormattedTime}\nDetails & Instructions: ${item.details || 'No additional notes'}`
                    });
                } else {
                    await Task.findByIdAndDelete(item.assignedTaskId);
                    item.assignedTaskId = null;
                }
            } else if (assignedEmployee) {
                const newTask = new Task({
                    tenantId: req.user.tenantId,
                    employeeId: assignedEmployee,
                    assignedBy: req.user.userId,
                    title: `[${clientLabel}] - ${item.type} Content Task`,
                    description: `Business Name: ${businessNameStr}\nClient Contact Name: ${clientContactStr}\nStage: ${item.type}\nTarget Date: ${formatDateClean(item.date)}\nTime: ${itemFormattedTime}\nDetails & Instructions: ${item.details || 'No additional notes'}`,
                    priority: item.type === 'Edit' || item.type === 'Post' ? 'High' : 'Normal',
                    dueDate: item.date,
                    status: item.status || 'Pending'
                });
                const savedTask = await newTask.save();
                item.assignedTaskId = savedTask._id;
            }
        } else if (status !== undefined && item.assignedTaskId) {
            await Task.findByIdAndUpdate(item.assignedTaskId, { status });
        }

        await project.save();

        const updated = await SocialMediaProject.findById(project._id)
            .populate('contentItems.assignedEmployee', 'firstName lastName role designation department')
            .populate('contentItems.assignedTaskId', 'status title priority dueDate');

        res.json({ message: 'Item updated successfully', project: updated, item });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteSocialMediaContentItem = async (req, res) => {
    try {
        const project = await SocialMediaProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const item = project.contentItems.id(req.params.itemId);
        if (item && item.assignedTaskId) {
            await Task.findByIdAndDelete(item.assignedTaskId);
        }

        project.contentItems.pull(req.params.itemId);
        await project.save();
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/* =========================================================================
   WEBSITE DEVELOPMENT CONTROLLERS
========================================================================= */

exports.getWebDevProjects = async (req, res) => {
    try {
        const projects = await WebDevProject.find({ tenantId: req.user.tenantId })
            .populate('assignedDeveloper', 'firstName lastName role designation')
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.createWebDevProject = async (req, res) => {
    try {
        const { clientName, businessName, phone, email, website, websiteType, assignedDeveloper } = req.body;
        if (!clientName || !businessName) return res.status(400).json({ message: 'Client and Business names are required' });

        let checklist = [];
        if (websiteType === 'E-Commerce') {
            checklist = ECOMM_CHECKLIST.map(item => ({ item, status: 'Pending' }));
        } else if (websiteType === 'Static') {
            checklist = STATIC_CHECKLIST.map(item => ({ item, status: 'Pending' }));
        }

        const project = new WebDevProject({
            tenantId: req.user.tenantId,
            clientName,
            businessName,
            phone,
            email,
            website,
            websiteType: websiteType || 'Normal',
            assignedDeveloper: assignedDeveloper || null,
            checklist
        });

        await project.save();

        if (assignedDeveloper) {
            try {
                const projectTask = new Task({
                    tenantId: req.user.tenantId,
                    employeeId: assignedDeveloper,
                    assignedBy: req.user.userId,
                    title: `[Web Dev] ${businessName} (${websiteType || 'Normal'})`,
                    description: `Assigned as developer for ${businessName}.\nClient: ${clientName}\nWebsite: ${website || 'N/A'}\nType: ${websiteType || 'Normal'}`,
                    priority: 'High',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'Pending'
                });
                await projectTask.save();
            } catch (tErr) {
                console.error('Error auto-creating dev task:', tErr);
            }
        }

        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getWebDevProjectById = async (req, res) => {
    try {
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
            .populate('assignedDeveloper', 'firstName lastName role designation phone email')
            .populate('requirements.assignedEmployee', 'firstName lastName role designation')
            .populate('requirements.assignedTaskId', 'status title priority dueDate');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.updateWebDevProject = async (req, res) => {
    try {
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Completion guard
        if (req.body.projectStatus === 'Completed') {
            if (project.clientStatus !== 'Completed' && req.body.clientStatus !== 'Completed') {
                return res.status(400).json({ message: "Cannot complete project! Please set Client Status to 'Completed' first." });
            }
            if (project.websiteType === 'E-Commerce' || project.websiteType === 'Static') {
                const allDone = project.checklist.every(item => item.status === 'Completed');
                if (!allDone) {
                    return res.status(400).json({ message: `Cannot complete project! All ${project.websiteType} checklist items must be 'Completed'.` });
                }
            } else {
                const allReqsDone = project.requirements.every(r => r.status === 'Completed');
                if (!allReqsDone && project.requirements.length > 0) {
                    return res.status(400).json({ message: "Cannot complete project! All Requirements and Changes must be 'Completed'." });
                }
            }
        }

        // If websiteType is modified, initialize or migrate checklist
        if (req.body.websiteType && req.body.websiteType !== project.websiteType) {
            if (req.body.websiteType === 'E-Commerce') {
                const existingMap = {};
                (project.checklist || []).forEach(c => { existingMap[c.item] = c.status; });
                project.checklist = ECOMM_CHECKLIST.map(item => ({ 
                    item, 
                    status: existingMap[item] || 'Pending' 
                }));
            } else if (req.body.websiteType === 'Static') {
                const existingMap = {};
                (project.checklist || []).forEach(c => { existingMap[c.item] = c.status; });
                project.checklist = STATIC_CHECKLIST.map(item => ({ 
                    item, 
                    status: existingMap[item] || 'Pending' 
                }));
            }
        }

        Object.assign(project, req.body);
        await project.save();
        const updated = await WebDevProject.findById(project._id)
            .populate('assignedDeveloper', 'firstName lastName role designation phone email')
            .populate('requirements.assignedEmployee', 'firstName lastName role designation');
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteWebDevProject = async (req, res) => {
    try {
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const taskIds = project.requirements.map(r => r.assignedTaskId).filter(Boolean);
        if (taskIds.length > 0) {
            await Task.deleteMany({ _id: { $in: taskIds } });
        }

        await WebDevProject.findByIdAndDelete(project._id);
        res.json({ message: 'Web dev project and linked tasks deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.addWebDevRequirement = async (req, res) => {
    try {
        const { type, description, assignedEmployee } = req.body;
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const devId = assignedEmployee || project.assignedDeveloper;
        if (!devId) {
            return res.status(400).json({ message: 'Please select an assigned developer for this requirement!' });
        }

        const clientLabel = project.businessName || project.clientName;

        // Auto-create Task for the developer
        const task = new Task({
            tenantId: req.user.tenantId,
            employeeId: devId,
            assignedBy: req.user.userId,
            title: `[${clientLabel}] - ${type}: ${description.substring(0, 35)}`,
            description: `Project: ${clientLabel}\nType: ${type}\nWebsite: ${project.website || 'N/A'}\nDescription: ${description}`,
            priority: 'High',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days default
            status: 'Pending'
        });
        const savedTask = await task.save();

        project.requirements.push({
            type: type || 'Requirement',
            description,
            assignedEmployee: devId,
            assignedTaskId: savedTask._id,
            status: 'Pending'
        });

        await project.save();
        const updated = await WebDevProject.findById(project._id)
            .populate('requirements.assignedEmployee', 'firstName lastName role designation')
            .populate('requirements.assignedTaskId', 'status title priority dueDate');
        res.status(201).json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.updateWebDevRequirementStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const reqItem = project.requirements.id(req.params.reqId);
        if (!reqItem) return res.status(404).json({ message: 'Requirement not found' });

        reqItem.status = status;
        if (reqItem.assignedTaskId) {
            await Task.findByIdAndUpdate(reqItem.assignedTaskId, { status });
        }

        await project.save();
        res.json({ message: 'Requirement status updated', reqItem });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteWebDevRequirement = async (req, res) => {
    try {
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const reqItem = project.requirements.id(req.params.reqId);
        if (reqItem && reqItem.assignedTaskId) {
            await Task.findByIdAndDelete(reqItem.assignedTaskId);
        }

        project.requirements.pull(req.params.reqId);
        await project.save();
        res.json({ message: 'Requirement deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.toggleWebDevChecklist = async (req, res) => {
    try {
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const item = project.checklist.id(req.params.itemId);
        if (!item) return res.status(404).json({ message: 'Checklist item not found' });

        item.status = item.status === 'Completed' ? 'Pending' : 'Completed';
        item.completedAt = item.status === 'Completed' ? new Date() : null;

        await project.save();

        // Check if all items are completed
        const allCompleted = project.checklist.length > 0 && project.checklist.every(c => c.status === 'Completed');
        if (allCompleted) {
            await Task.updateMany(
                { tenantId: req.user.tenantId, employeeId: project.assignedDeveloper, title: new RegExp(project.businessName, 'i') },
                { status: 'Completed' }
            );
        } else {
            await Task.updateMany(
                { tenantId: req.user.tenantId, employeeId: project.assignedDeveloper, title: new RegExp(project.businessName, 'i') },
                { status: 'Pending' }
            );
        }

        res.json({ message: 'Checklist updated', item, checklist: project.checklist, allCompleted });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.addWebDevChecklistItem = async (req, res) => {
    try {
        const { item } = req.body;
        if (!item) return res.status(400).json({ message: 'Item text required' });

        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        project.checklist.push({ item, status: 'Pending' });
        await project.save();
        res.status(201).json(project.checklist);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteWebDevChecklistItem = async (req, res) => {
    try {
        const project = await WebDevProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        project.checklist.pull(req.params.itemId);
        await project.save();
        res.json({ message: 'Checklist item deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/* =========================================================================
   SEO PROJECTS CONTROLLERS
========================================================================= */

exports.getSEOProjects = async (req, res) => {
    try {
        const projects = await SEOProject.find({ tenantId: req.user.tenantId })
            .populate('assignedSpecialist', 'firstName lastName role designation')
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.createSEOProject = async (req, res) => {
    try {
        const { clientName, businessName, phone, email, website, assignedSpecialist } = req.body;
        if (!clientName || !businessName) return res.status(400).json({ message: 'Client and Business names are required' });

        // Initialize 46 master checklist tasks
        const checklist = [];
        SEO_MASTER_CATEGORIES.forEach(cat => {
            cat.tasks.forEach(taskName => {
                checklist.push({
                    category: cat.category,
                    taskName,
                    isCompleted: false
                });
            });
        });

        const project = new SEOProject({
            tenantId: req.user.tenantId,
            clientName,
            businessName,
            phone,
            email,
            website,
            assignedSpecialist: assignedSpecialist || null,
            checklist
        });

        await project.save();

        if (assignedSpecialist) {
            try {
                const projectTask = new Task({
                    tenantId: req.user.tenantId,
                    employeeId: assignedSpecialist,
                    assignedBy: req.user.userId,
                    title: `[SEO Project] ${businessName}`,
                    description: `Assigned as lead SEO Specialist for ${businessName}.\nClient: ${clientName}\nWebsite: ${website || 'N/A'}`,
                    priority: 'High',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'Pending'
                });
                await projectTask.save();
            } catch (tErr) {
                console.error('Error auto-creating SEO task:', tErr);
            }
        }

        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getSEOProjectById = async (req, res) => {
    try {
        const project = await SEOProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
            .populate('assignedSpecialist', 'firstName lastName role designation phone email')
            .populate('customTasks.assignedEmployee', 'firstName lastName role designation')
            .populate('customTasks.assignedTaskId', 'status title priority dueDate');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.updateSEOProject = async (req, res) => {
    try {
        const project = await SEOProject.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            req.body,
            { new: true }
        ).populate('assignedSpecialist', 'firstName lastName role designation phone email');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteSEOProject = async (req, res) => {
    try {
        const project = await SEOProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const taskIds = project.customTasks.map(t => t.assignedTaskId).filter(Boolean);
        if (taskIds.length > 0) {
            await Task.deleteMany({ _id: { $in: taskIds } });
        }

        await SEOProject.findByIdAndDelete(project._id);
        res.json({ message: 'SEO Project and linked tasks deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.addSEOCustomTask = async (req, res) => {
    try {
        const { type, description, assignedEmployee } = req.body;
        const project = await SEOProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const specId = assignedEmployee || project.assignedSpecialist;
        if (!specId) {
            return res.status(400).json({ message: 'Please select an SEO Specialist for this task!' });
        }

        const clientLabel = project.businessName || project.clientName;

        // Auto-create Task in Task collection
        const task = new Task({
            tenantId: req.user.tenantId,
            employeeId: specId,
            assignedBy: req.user.userId,
            title: `[${clientLabel}] - ${type} SEO Task`,
            description: `Project: ${clientLabel}\nCategory: ${type}\nWebsite: ${project.website || 'N/A'}\nDetails: ${description}`,
            priority: 'High',
            dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            status: 'Pending'
        });
        const savedTask = await task.save();

        project.customTasks.push({
            type: type || 'OnPage',
            description,
            assignedEmployee: specId,
            assignedTaskId: savedTask._id,
            status: 'Pending'
        });

        await project.save();
        const updated = await SEOProject.findById(project._id)
            .populate('customTasks.assignedEmployee', 'firstName lastName role designation')
            .populate('customTasks.assignedTaskId', 'status title priority dueDate');
        res.status(201).json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.updateSEOCustomTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const project = await SEOProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const taskItem = project.customTasks.id(req.params.taskId);
        if (!taskItem) return res.status(404).json({ message: 'Task item not found' });

        taskItem.status = status;
        if (taskItem.assignedTaskId) {
            await Task.findByIdAndUpdate(taskItem.assignedTaskId, { status });
        }

        await project.save();
        res.json({ message: 'Task status updated', taskItem });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteSEOCustomTask = async (req, res) => {
    try {
        const project = await SEOProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const taskItem = project.customTasks.id(req.params.taskId);
        if (taskItem && taskItem.assignedTaskId) {
            await Task.findByIdAndDelete(taskItem.assignedTaskId);
        }

        project.customTasks.pull(req.params.taskId);
        await project.save();
        res.json({ message: 'Custom SEO task deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.toggleSEOChecklistTask = async (req, res) => {
    try {
        const project = await SEOProject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const item = project.checklist.id(req.params.itemId);
        if (!item) return res.status(404).json({ message: 'Checklist task not found' });

        item.isCompleted = !item.isCompleted;
        item.completedAt = item.isCompleted ? new Date() : null;

        await project.save();

        const allCompleted = project.checklist.length > 0 && project.checklist.every(c => c.isCompleted);
        if (allCompleted) {
            await Task.updateMany(
                { tenantId: req.user.tenantId, employeeId: project.assignedSpecialist, title: new RegExp(project.businessName, 'i') },
                { status: 'Completed' }
            );
        } else {
            await Task.updateMany(
                { tenantId: req.user.tenantId, employeeId: project.assignedSpecialist, title: new RegExp(project.businessName, 'i') },
                { status: 'Pending' }
            );
        }

        res.json({ message: 'Checklist task updated', item, checklist: project.checklist, allCompleted });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
