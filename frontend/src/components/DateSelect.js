'use client';

import { useState, useEffect } from 'react';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DateSelect({ value, onChange, required = false, disabled = false, className = '' }) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setYear(y || '');
      setMonth(m || '');
      setDay(d ? d.padStart(2, '0') : '');
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  function handleDayChange(newDay) {
    setDay(newDay);
    tryEmit(newDay, month, year);
  }

  function handleMonthChange(newMonth) {
    setMonth(newMonth);
    tryEmit(day, newMonth, year);
  }

  function handleYearChange(newYear) {
    setYear(newYear);
    tryEmit(day, month, newYear);
  }

  function tryEmit(d, m, y) {
    if (d && m && y) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
  }

  const selectClass = "border border-[#1B2A4A]/20 rounded-lg p-3 text-[#2A2E35] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition disabled:bg-[#1B2A4A]/5 disabled:text-[#2A2E35]/40";

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      <select
        value={day}
        onChange={(e) => handleDayChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={selectClass}
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>{Number(d)}</option>
        ))}
      </select>

      <select
        value={month}
        onChange={(e) => handleMonthChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={selectClass}
      >
        <option value="">Month</option>
        {months.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => handleYearChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={selectClass}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}