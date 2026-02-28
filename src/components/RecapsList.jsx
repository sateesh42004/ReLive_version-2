import { useState, useEffect } from 'react';
import '../Timeline.css'; // Reuse timeline styles for the list

function RecapsList({ onRecapSelect, onCreateNew }) {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        import('../firebase/db').then(({ getAllEntries }) => {
            getAllEntries().then(fetchedData => {
                const loadedEntries = [];
                Object.entries(fetchedData).forEach(([key, entry]) => {
                    // Only match recaps
                    if (!key.startsWith('recap_')) return;

                    entry = entry || {};
                    const title = entry.recapTitle || (entry.text || '').split('\n')[0].substring(0, 30) || 'Untitled Experience';
                    const updatedAt = entry.updatedAt || null;

                    loadedEntries.push({
                        id: key,
                        title,
                        updatedAt,
                        timestamp: parseInt(key.split('_')[1] || 0)
                    });
                });
                loadedEntries.sort((a, b) => b.timestamp - a.timestamp);
                setEntries(loadedEntries);
            }).catch(e => console.error("Recaps logic error", e));
        });
    }, []);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="timeline-container" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-primary)' }}>Previous Experiences</h3>
                <button
                    onClick={onCreateNew}
                    style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid #c5a065',
                        color: '#c5a065',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-primary)'
                    }}
                >
                    + Log New Experience
                </button>
            </div>

            {entries.length === 0 ? (
                <div className="timeline-empty" style={{ opacity: 0.6 }}>No previous experiences logged yet.</div>
            ) : (
                <ul className="timeline-list">
                    {entries.map(entry => (
                        <li key={entry.id} className="timeline-item" onClick={() => onRecapSelect(entry.id)} style={{ cursor: 'pointer', marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                            <div className="timeline-date">
                                <span style={{ fontWeight: 600, fontSize: '1.2em', color: 'var(--ink-color)' }}>{entry.title}</span>
                                {entry.updatedAt && (
                                    <div style={{ fontSize: '0.85em', opacity: 0.6, marginTop: '4px' }}>
                                        Saved: {formatTime(entry.updatedAt)}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default RecapsList;
