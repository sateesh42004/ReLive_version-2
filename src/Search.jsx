import { useState, useEffect, useRef, useMemo, memo } from 'react';
import './Search.css';

const MOODS = [
    { val: 'mood-1', icon: '😶' },
    { val: 'mood-2', icon: '🙂' },
    { val: 'mood-3', icon: '😔' },
    { val: 'mood-4', icon: '😲' },
    { val: 'mood-5', icon: '😌' }
];

function Search({ onSelect, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [allEntries, setAllEntries] = useState([]);
    const inputRef = useRef(null);

    // Constants outside useEffect to avoid re-calculation if query changes but entries don't
    const dateOptions = useMemo(() => ({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);

    useEffect(() => {
        import('./firebase/db').then(({ getAllEntries }) => {
            getAllEntries().then(fetchedData => {
                const loaded = [];
                Object.entries(fetchedData).forEach(([key, val]) => {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
                    const entry = val || {};
                    const text = entry.text || '';
                    const tags = entry.tags || [];
                    const mood = entry.mood || null;
                    const images = entry.images || [];
                    const audioNotes = entry.audioNotes || [];

                    const hasContent = text.trim() || images.length || audioNotes.length || tags.length || mood;

                    if (hasContent) {
                        const [y, m, d] = key.split('-').map(Number);
                        loaded.push({
                            date: key,
                            text, tags, mood, images, audioNotes,
                            dateObj: new Date(y, m - 1, d)
                        });
                    }
                });
                loaded.sort((a, b) => b.dateObj - a.dateObj);
                setAllEntries(loaded);
            }).catch(e => console.error("Search fetch error", e));
        });

        if (inputRef.current) inputRef.current.focus();

        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        // Optimization: filtering large datasets is potentially heavy if called on every keystroke
        // but React effects already handle the character-at-a-time updates efficiently.
        const matches = allEntries.filter(entry => {
            const dateMatch = entry.date.includes(lowerQuery);
            const formattedDate = entry.dateObj.toLocaleDateString('en-US', dateOptions).toLowerCase();
            const formattedMatch = formattedDate.includes(lowerQuery);
            const tagMatch = entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
            return dateMatch || formattedMatch || tagMatch;
        });

        // Stability: Limit the number of search results to prevent DOM bloat
        setResults(matches.slice(0, 50));
    }, [query, allEntries, dateOptions]);

    // Highlighting is a common bottleneck.
    // We compute it once per result item during render.
    const getHighlightedText = (text, highlight) => {
        if (!highlight.trim() || !text) return text;
        const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedHighlight})`, 'gi');

        // Performance: Preview logic
        let firstLine = text.split('\n')[0];
        if (firstLine.length > 150) firstLine = firstLine.substring(0, 150) + '...';

        const parts = firstLine.split(regex);
        return (
            <span>
                {parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className="highlight">{part}</span>
                ) : part)}
            </span>
        );
    };

    const formatDate = (d) => {
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return d.toLocaleDateString('en-US', options);
    };

    return (
        <div className="search-container">
            <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder="Search dates or tags..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            {query && results.length === 0 ? (
                <div className="no-results">No matches.</div>
            ) : (
                <ul className="search-results">
                    {results.map(entry => (
                        <li key={entry.date} className="search-result-item" onClick={() => onSelect(entry.date)}>
                            <div className="search-result-header">
                                <div className="search-result-meta">
                                    <span className="search-result-date">{formatDate(entry.dateObj)}</span>
                                    {entry.mood && (
                                        <span className="search-result-mood">
                                            {MOODS.find(m => m.val === entry.mood)?.icon}
                                        </span>
                                    )}
                                </div>
                                {entry.tags && entry.tags.length > 0 && (
                                    <span className="search-result-tags">
                                        {entry.tags.map(tag => (
                                            <span key={tag} className="tag-pill tiny">#{tag}</span>
                                        ))}
                                    </span>
                                )}
                            </div>
                            <div className="search-result-preview">
                                {entry.text && entry.text.trim()
                                    ? getHighlightedText(entry.text, query)
                                    : (entry.images && entry.images.length > 0 ? '📷 [Image Entry]' :
                                        (entry.audioNotes && entry.audioNotes.length > 0 ? '🎙 [Audio Entry]' :
                                            (entry.mood ? `Mood: ${MOODS.find(m => m.val === entry.mood)?.icon || ''}` : '(No text)')))}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default memo(Search);
