import { useState, useEffect } from 'react';
import './Timeline.css';

const MOODS = [
    { val: 'mood-1', icon: '😶' },
    { val: 'mood-2', icon: '🙂' },
    { val: 'mood-3', icon: '😔' },
    { val: 'mood-4', icon: '😲' },
    { val: 'mood-5', icon: '😌' }
];

function Timeline({ onEntrySelect, onlyFavorites = false }) {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        import('./firebase/db').then(({ getAllEntries }) => {
            getAllEntries().then(fetchedData => {
                const loadedEntries = [];
                Object.entries(fetchedData).forEach(([key, val]) => {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;

                    const entry = val || {};
                    const text = entry.text || '';
                    const tags = entry.tags || [];
                    const isFavorite = !!entry.isFavorite;
                    const mood = entry.mood || null;
                    const images = entry.images || [];
                    const audioNotes = entry.audioNotes || [];

                    const updatedAt = entry.updatedAt || null;

                    if (onlyFavorites && !isFavorite) return;

                    const hasContent = (text && text.trim().length > 0) ||
                        (images && images.length > 0) ||
                        (audioNotes && audioNotes.length > 0) ||
                        (tags && tags.length > 0) ||
                        (mood !== null);

                    if (hasContent) {
                        const [y, m, d] = key.split('-').map(Number);
                        loadedEntries.push({
                            date: key,
                            text, tags, images, audioNotes,
                            isFavorite, mood, updatedAt,
                            dateObj: new Date(y, m - 1, d)
                        });
                    }
                });
                loadedEntries.sort((a, b) => b.dateObj - a.dateObj);
                setEntries(loadedEntries);
            }).catch(e => console.error("Timeline error", e));
        });
    }, [onlyFavorites]);

    const formatDate = (dateStr) => {
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return new Date(dateStr).toLocaleDateString('en-US', options);
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="timeline-container">
            {entries.length === 0 ? (
                <div className="timeline-empty">No entries yet.</div>
            ) : (
                <ul className="timeline-list">
                    {entries.map(entry => (
                        <li key={entry.date} className="timeline-item" onClick={() => onEntrySelect(entry.date)}>
                            <div className="timeline-date">
                                <span style={{ fontWeight: 600 }}>{formatDate(entry.date)}</span>
                                {entry.updatedAt && (
                                    <span style={{ fontSize: '0.9em', opacity: 0.7, marginLeft: '10px' }}>
                                        {formatTime(entry.updatedAt)}
                                    </span>
                                )}
                                {entry.isFavorite && <span style={{ marginLeft: '10px', color: '#f1c40f' }}>★</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Timeline;
