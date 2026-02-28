import { useState, useEffect } from 'react';
import './Calendar.css';

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Calendar({ selectedDate, onDateSelect }) {
    const [viewDate, setViewDate] = useState(selectedDate);
    const [entries, setEntries] = useState(new Set());

    useEffect(() => {
        // Fetch keys from Firestore
        import('./firebase/db').then(({ getAllEntries }) => {
            getAllEntries().then(data => {
                const dates = new Set(Object.keys(data));
                setEntries(dates);
            }).catch(e => console.error("Calendar fetch error", e));
        });
    }, [viewDate]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    // Create grid
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="day-cell empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        // Use proper YYYY-MM-DD format for key
        const dateKey = [
            currentDate.getFullYear(),
            String(currentDate.getMonth() + 1).padStart(2, '0'),
            String(currentDate.getDate()).padStart(2, '0')
        ].join('-');
        const isSelected = currentDate.toDateString() === selectedDate.toDateString();
        const isToday = currentDate.toDateString() === new Date().toDateString();
        const hasEntry = entries.has(dateKey);

        days.push(
            <div
                key={dateKey}
                className={`day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasEntry ? 'has-entry' : ''}`}
                onClick={() => onDateSelect(currentDate)}
            >
                {day}
            </div>
        );
    }

    const prevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    return (
        <div className="calendar-container">
            <div className="header calendar-header">
                <button className="nav-btn" onClick={prevMonth}>&lt;</button>
                <span className="month-year">{months[month]} {year}</span>
                <button className="nav-btn" onClick={nextMonth}>&gt;</button>
            </div>
            <div className="calendar-grid">
                {weekDays.map(d => <div key={d} className="weekday">{d}</div>)}
                {days}
            </div>
        </div>
    );
}

export default Calendar;
