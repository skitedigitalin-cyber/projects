import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './WorkspaceLayout.css';
import '../pages/LeadForm.css';

export default function WorkspaceEditor({ backTo, backLabel, label, title, formId, saveLabel, disabled, children }) {
    return (
        <div className="skite-workspace lead-editor">
            <header className="lead-editor-toolbar">
                <Link to={backTo}><ArrowLeft size={15} /> {backLabel}</Link>
                <div>
                    <Link to={backTo}>Cancel</Link>
                    <button type="submit" form={formId} disabled={disabled}>{saveLabel}</button>
                </div>
            </header>
            <main className="lead-editor-content">
                <div className="lead-editor-heading"><p>{label}</p><h1>{title}</h1></div>
                {children}
            </main>
        </div>
    );
}
