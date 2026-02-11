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
                            isFavorite, mood,
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

    const getPreview = (entry) => {
        if (entry.text && entry.text.trim().length > 0) {
            const firstLine = entry.text.split('\n')[0];
            return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
        }
        if (entry.images && entry.images.length > 0) return '📷 [Image Entry]';
        if (entry.audioNotes && entry.audioNotes.length > 0) return '🎙 [Audio Entry]';
        if (entry.mood) {
            const m = MOODS.find(x => x.val === entry.mood);
            return m ? `Mood: ${m.icon}` : 'Mood Entry';
        }
        return '(No content)';
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
                                {formatDate(entry.date)}
                                {entry.mood && (
                                    <span className="timeline-mood" title="Mood">
                                        {MOODS.find(m => m.val === entry.mood)?.icon}
                                    </span>
                                )}
                                {entry.tags && entry.tags.length > 0 && (
                                    <span className="timeline-tags">
                                        {entry.tags.map(tag => (
                                            <span key={tag} className="timeline-tag">#{tag}</span>
                                        ))}
                                    </span>
                                )}
                            </div>
                            <div className="timeline-preview">{getPreview(entry)}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Timeline;
