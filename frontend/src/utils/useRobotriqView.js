import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useRobotriqView(enabled, defaultView, allowedViews) {
    const [localView, setLocalView] = useState(defaultView);
    const [params, setParams] = useSearchParams();
    const requested = params.get('view');
    const view = enabled ? (allowedViews.includes(requested) ? requested : defaultView) : localView;

    function select(next) {
        if (!enabled) {
            setLocalView(next);
            return;
        }
        if (!allowedViews.includes(next)) return;
        setParams(current => {
            const updated = new URLSearchParams(current);
            updated.set('view', next);
            updated.delete('action');
            return updated;
        });
    }

    return [view, select, enabled ? params.get('action') : null];
}
