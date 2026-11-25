import { useState } from 'react';
import './RobotriqWorkspace.css';

const pageSize = 25;

export default function RobotriqPagedTable({ rows, children }) {
    const [page, setPage] = useState(0);
    const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
    if (page > lastPage) setPage(lastPage);
    const start = Math.min(page, lastPage) * pageSize;
    const end = Math.min(start + pageSize, rows.length);

    return <div className="robotriq-table-card">
        <div className="robotriq-table-scroll">{children(rows.slice(start, end))}</div>
        {lastPage > 0 && <nav className="robotriq-pagination" aria-label="Table pagination">
            <span aria-live="polite">{start + 1}–{end} of {rows.length}</span>
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</button>
        </nav>}
    </div>;
}
