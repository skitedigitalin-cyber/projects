import { useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchPicker({ label, placeholder, selectedLabel, options, onSelect, allowManualEntry }) {
    const id = useId();
    const inputRef = useRef(null);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const terms = search.trim().toLowerCase().split(/\s+/);
    const matches = open ? options?.filter(option => terms.every(term => option.searchText.includes(term))) ?? [] : [];

    function choose(value) {
        onSelect(value);
        inputRef.current.focus();
        setSearch('');
        setOpen(false);
    }

    return <div className="relative" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setSearch('');
            setOpen(false);
        }
    }} onKeyDown={event => {
        if (event.key === 'Escape' && open) {
            inputRef.current.focus();
            setSearch('');
            setOpen(false);
            event.stopPropagation();
        }
    }}>
        <label htmlFor={id} className="mb-1 block text-[11px] font-bold uppercase text-slate-500">{label}</label>
        <div className="relative">
            <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} id={id} type="text" autoComplete="off" disabled={!options}
                aria-controls={open ? `${id}-results` : undefined}
                className="w-full rounded-xl border border-[#e6e6e3] bg-[#f5f5f3] py-2.5 pl-9 pr-4 text-xs font-medium outline-none transition-colors focus:border-[#111111] focus:bg-white"
                placeholder={placeholder} value={open ? search : selectedLabel || ''}
                onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
                onChange={event => { setSearch(event.target.value); setOpen(true); }}
                onKeyDown={event => {
                    if (event.key === 'Enter' && open) {
                        event.preventDefault();
                        if (matches.length) choose(matches[0].id);
                    }
                }} />
        </div>
        {open && <div id={`${id}-results`} className="workspace-scroll-list absolute inset-x-0 top-full z-30 mt-1 max-h-52 rounded-xl border border-[#e6e6e3] bg-white shadow-xl">
            {allowManualEntry && <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-[#f0f0ee] focus:bg-[#f0f0ee]"
                onClick={() => choose('')}>Enter client details manually</button>}
            {matches.map(option => <button key={option.id} type="button"
                className="block w-full border-t border-[#f0f0ee] px-3 py-2 text-left text-xs hover:bg-[#f0f0ee] focus:bg-[#f0f0ee]"
                onClick={() => choose(option.id)}>
                <span className="block font-semibold text-[#111111]">{option.label}</span>
                {option.detail && <span className="text-slate-500">{option.detail}</span>}
            </button>)}
            {!matches.length && <p role="status" className="px-3 py-2 text-xs text-slate-500">No matches found</p>}
        </div>}
    </div>;
}
