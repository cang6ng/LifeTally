import React, { useEffect } from 'react';
import { Button, DatePicker } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useObjectStore, useUIStore } from '../stores';
import { DateCell } from '../components/DateCell';
import {
  getCalendarDays,
  isCurrentMonth,
  isDateToday,
  isSameDayAs,
  getMonthDisplay,
  getWeekdayNames,
} from '../utils/dateUtils';
import {
  getObjectsForDate,
  sortObjectsByPriority,
} from '../utils/objectUtils';
import { getHolidayForDate, HOLIDAY_UPDATED_EVENT } from '../utils/holidayUtils';
import './CalendarView.css';

export const CalendarView: React.FC = () => {
  const {
    objects,
    selectedDate,
    setSelectedDate,
    loadObjects,
  } = useObjectStore();

  const {
    currentMonth,
    goToToday,
    goToPreviousMonth,
    goToNextMonth,
    setCurrentMonth,
  } = useUIStore();

  const [monthPickerOpen, setMonthPickerOpen] = React.useState(false);
  const [, setHolidayVersion] = React.useState(0);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  useEffect(() => {
    const handleHolidayUpdated = () => setHolidayVersion(version => version + 1);
    window.addEventListener(HOLIDAY_UPDATED_EVENT, handleHolidayUpdated);
    return () => window.removeEventListener(HOLIDAY_UPDATED_EVENT, handleHolidayUpdated);
  }, []);

  const calendarDays = getCalendarDays(currentMonth);
  const weekdayNames = getWeekdayNames();

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleMonthClick = () => {
    setMonthPickerOpen(true);
  };

  const handleMonthChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setCurrentMonth(date.toDate());
      setMonthPickerOpen(false);
    }
  };

  return (
    <div className="calendar-view">
      {/* Header */}
      <div className="calendar-header">
        <div style={{ position: 'relative' }}>
          <h2 className="calendar-title" onClick={handleMonthClick}>
            {getMonthDisplay(currentMonth)}
          </h2>
          <DatePicker
            picker="month"
            open={monthPickerOpen}
            value={dayjs(currentMonth)}
            onChange={handleMonthChange}
            onOpenChange={setMonthPickerOpen}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            getPopupContainer={trigger => trigger.parentElement!}
          />
        </div>
        <div className="calendar-nav">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={goToPreviousMonth}
            className="calendar-nav-btn"
          />
          <Button type="primary" onClick={goToToday}>
            今天
          </Button>
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={goToNextMonth}
            className="calendar-nav-btn"
          />
        </div>
      </div>

      {/* Weekday headers */}
      <div className="calendar-weekdays">
        {weekdayNames.map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid">
        {calendarDays.map(date => {
          const previews = sortObjectsByPriority(
            getObjectsForDate(objects, date)
          );
          const holiday = getHolidayForDate(date);

          return (
            <DateCell
              key={date.toISOString()}
              date={date}
              isCurrentMonth={isCurrentMonth(date, currentMonth)}
              isToday={isDateToday(date)}
              isSelected={selectedDate ? isSameDayAs(date, selectedDate) : false}
              previews={previews}
              onDateClick={handleDateClick}
              holiday={holiday}
            />
          );
        })}
      </div>
    </div>
  );
};
