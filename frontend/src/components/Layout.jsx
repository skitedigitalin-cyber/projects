import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, Users, UserRound, Briefcase, FileText, CalendarClock, 
    LogOut, FolderKanban, Settings, CalendarDays, PanelLeftClose, PanelLeftOpen, Landmark, GraduationCap,
    Search, Bell
} from 'lucide-react';
import './WorkspaceLayout.css';

export default function Layout({ children, noPadding = false, workspace = false, pendingCount = 0, compactTools = false }) {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Sidebar collapse state persisted in localStorage
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('sidebar-collapsed') === 'true';
        } catch {
            return false;
        }
    });

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('sidebar-collapsed', String(next));
            } catch (e) {}
            return next;
        });
    };

    // Keyboard shortcut: Ctrl + B or Cmd + B to toggle sidebar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const rawStored = typeof window !== 'undefined' ? (localStorage.getItem('user') || '') : '';
    const isSkite = 
        user?.isSkiteTenant === true ||
        String(user?.tenantId?._id || user?.tenantId || '').includes('6af2c94a9d29730751ed2d01') ||
        (user?.companyName && user.companyName.toLowerCase().includes('skite')) ||
        (user?.email && user.email.toLowerCase().includes('skite')) ||
        rawStored.toLowerCase().includes('skite');

    const isRobotriq = 
        user?.subDomain === 'robotriq' ||
        String(user?.tenantId?._id || user?.tenantId || '').includes('6afd35731172da4b0de9a48e') ||
        (user?.companyName && user.companyName.toLowerCase().includes('robotriq')) ||
        (user?.name && user.name.toLowerCase().includes('robotriq')) ||
        (user?.email && user.email.toLowerCase().includes('robotriq')) ||
        rawStored.toLowerCase().includes('robotriq');

    const allNavItems = [
        { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'calendar', name: 'Calendar', path: '/calendar', icon: <CalendarDays size={20} /> },
        { id: 'sales', name: 'Sales & Leads', path: '/sales', icon: <Briefcase size={20} /> },
        { id: 'students', name: 'Students', path: '/students', icon: <GraduationCap size={20} /> },
        { id: 'finance', name: isRobotriq ? 'Quotations' : 'Finance', path: '/finance', icon: <FileText size={20} /> },
        { id: 'accounts', name: 'Accounts', path: '/accounts', icon: <Landmark size={20} /> },
        { id: 'hr', name: 'Attendance & HR', path: '/hr', icon: <CalendarClock size={20} /> },
        { id: 'projects', name: 'Team Management', path: '/team-management', icon: <FolderKanban size={20} /> },
    ];

    // Filter nav items strictly based on user permissions
    let navItems = [];
    if (user?.role === 'Admin' || user?.role === 'CEO') {
        // Admin and CEO get tenant modules + calendar + accounts + settings (Team Management only for Skite, Students for Robotriq/education)
        navItems = allNavItems.filter(item => {
            if (item.id === 'projects') return isSkite;
            if (item.id === 'students') return isRobotriq || user?.activeModules?.includes('students');
            return item.id === 'calendar' || item.id === 'accounts' || !user?.activeModules || user.activeModules.includes(item.id);
        });
        navItems.push({ id: 'settings', name: 'Settings', path: '/settings', icon: <Settings size={20} /> });
    } else {
        // Regular Employees: ONLY show modules explicitly assigned in their activeModules
        const userModules = user?.activeModules || [];
        navItems = allNavItems.filter(item => {
            if (item.id === 'projects') return isSkite && userModules.includes('projects');
            if (item.id === 'students') return isRobotriq || userModules.includes('students');
            return userModules.includes(item.id) || (userModules.includes('finance') && item.id === 'accounts');
        });
        
        // Add link back to Employee Portal for convenience
        navItems.unshift({
            id: 'employee-portal',
            name: 'Employee Portal',
            path: '/employee-dashboard',
            icon: <LayoutDashboard size={20} className="text-indigo-600" />
        });
    }

    if (workspace) {
        const navLabels = { sales: 'Sales', hr: 'HR', projects: 'Team' };
        const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

        return (
            <div className="skite-workspace" data-workspace-theme={user?.theme}>
                <header className="skite-workspace-header">
                    <Link to="/dashboard" className="skite-workspace-brand">
                        <span aria-hidden="true" /> skite
                    </Link>
                    <nav className="skite-workspace-nav" aria-label="Main navigation" hidden={isCollapsed}>
                        {navItems.map(item => (
                            <Link key={item.id} to={item.path} aria-current={location.pathname === item.path ? 'page' : undefined}>
                                {navLabels[item.id] || item.name}
                            </Link>
                        ))}
                    </nav>
                    <div className="skite-workspace-tools">
                        {!compactTools && <details>
                            <summary aria-label="Find a workspace page"><Search size={18} /></summary>
                            <div className="skite-workspace-menu">
                                <strong>Workspace pages</strong>
                                {navItems.map(item => <Link key={item.id} to={item.path}>{item.name}</Link>)}
                                <button type="button" onClick={toggleSidebar}> {isCollapsed ? 'Show' : 'Hide'} main navigation</button>
                            </div>
                        </details>}
                        {!compactTools && <details>
                            <summary className="skite-workspace-notice" aria-label={`Follow-ups (${pendingCount} pending)`}>
                                <Bell size={18} />
                                {pendingCount > 0 && <span aria-hidden="true" />}
                            </summary>
                            <div className="skite-workspace-menu">
                                <strong>{pendingCount} pending follow-ups</strong>
                                {navItems.some(item => item.id === 'sales') && <Link to="/sales">Open Sales &amp; Leads</Link>}
                            </div>
                        </details>}
                        <details>
                            <summary className="skite-workspace-avatar" aria-label="Account menu">{initials || <UserRound size={18} />}</summary>
                            <div className="skite-workspace-menu">
                                <strong>{user?.name}</strong>
                                <span>{user?.role}</span>
                                <small>Tenant ID: {user?.tenantId?._id ?? user?.tenantId}</small>
                                {compactTools && <button type="button" onClick={toggleSidebar}>{isCollapsed ? 'Show' : 'Hide'} main navigation</button>}
                                <button type="button" onClick={handleLogout}><LogOut size={16} /> Log out</button>
                            </div>
                        </details>
                    </div>
                </header>
                <main className={noPadding ? undefined : 'skite-workspace-main'}>{children}</main>
            </div>
        );
    }

    return (
        <div className="flex h-screen relative overflow-hidden layout-wrapper" style={{ background: "linear-gradient(to bottom right, var(--app-bg-grad), var(--app-bg))" }}>
            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] opacity-40 rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none bg-blobs" style={{ backgroundColor: "var(--app-blob-1)" }}></div>
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] opacity-20 rounded-full blur-[150px] translate-x-1/4 translate-y-1/4 pointer-events-none bg-blobs" style={{ backgroundColor: "var(--app-blob-2)" }}></div>

            {/* Sidebar with smooth collapse animation */}
            <aside 
                className={`bg-white/60 backdrop-blur-3xl border-r border-slate-200/60 flex flex-col relative z-20 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
                    isCollapsed ? 'w-0 border-r-0 opacity-0 pointer-events-none' : 'w-64 opacity-100'
                }`}
            >
                <div className="w-64 flex flex-col h-full">
                    {/* Header with Skite Prime & Close Toggle */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200/60">
                        <h1 className="text-xl font-bold text-blue-700 tracking-tight">Skite Prime</h1>
                        <button
                            onClick={toggleSidebar}
                            title="Close Sidebar (Ctrl+B)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                            <PanelLeftClose size={18} />
                        </button>
                    </div>
                    
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    location.pathname === item.path || (item.path === '/team-management' && location.pathname.startsWith('/projects'))
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center space-x-3 px-4 py-2 mb-2">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-700 tracking-tight">
                                <UserRound size={20} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
                <header className="h-16 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 flex items-center justify-between px-6 shadow-sm relative z-10 shrink-0">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={toggleSidebar}
                            title={isCollapsed ? "Open Sidebar (Ctrl+B)" : "Close Sidebar (Ctrl+B)"}
                            className="p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/80 transition-all cursor-pointer border border-slate-200/60 hover:border-blue-200 active:scale-95 shadow-sm"
                        >
                            {isCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
                        </button>
                        <h2 className="text-lg font-bold text-gray-800 tracking-tight">
                            {navItems.find(item => item.path === location.pathname)?.name || 'Skite Prime'}
                        </h2>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 font-medium">
                        Tenant ID: <span className="font-semibold text-slate-700">{user?.tenantId}</span>
                    </div>
                </header>
                
                <main className={`flex-1 overflow-y-auto overflow-x-hidden ${noPadding ? '' : 'p-8'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}




