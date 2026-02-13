import React from 'react';
import './Themes.css';

const Themes = ({ themes, currentTheme, onSelect, onClose }) => {
    return (
        <div className="themes-container">
            <div className="themes-header">
                <div style={{ width: 32 }}></div> {/* Spacer */}
                <h2>Ambiance</h2>
                <button className="close-btn" onClick={onClose} title="Close">×</button>
            </div>

            <p className="themes-description">
                Select a background to set the mood for your journaling session.
            </p>

            <div className="themes-grid">
                {themes.map(theme => (
                    <div
                        key={theme.id}
                        className={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}
                        onClick={() => onSelect(theme.id)}
                    >
                        {currentTheme === theme.id && <div className="theme-check">✓</div>}
                        <div
                            className="theme-preview"
                            style={{ backgroundImage: `url(${theme.url})` }}
                        />
                        <div className="theme-name">{theme.name}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Themes;
