import React from 'react';
import type { BaseObject } from '../types/objects';
import type { ObjectPreview } from '../utils/objectUtils';
import type { HolidayInfo } from '../providers/holiday/HolidayProvider';
import './DateCell.css';

interface DateCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  previews: ObjectPreview[];
  onDateClick: (date: Date) => void;
  holiday?: HolidayInfo | null;
}

export const DateCell: React.FC<DateCellProps> = ({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  previews,
  onDateClick,
  holiday,
}) => {
  const maxDisplay = 3;
  const displayed = previews.slice(0, maxDisplay);
  const remaining = previews.length - maxDisplay;

  const cellClassName = [
    'date-cell',
    !isCurrentMonth && 'date-cell--other-month',
    isToday && 'date-cell--today',
    isSelected && 'date-cell--selected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cellClassName} onClick={() => onDateClick(date)}>
      <div className="date-cell__header">
        <span className="date-cell__number">{date.getDate()}</span>
        {holiday && holiday.type === 'festival' && (
          <span className="date-cell__festival-marker">★</span>
        )}
        {holiday && holiday.type === 'workday' && (
          <span className="date-cell__workday">班</span>
        )}
      </div>
      {holiday && holiday.type === 'festival' && (
        <div className="date-cell__festival">
          {holiday.name}
        </div>
      )}
      {holiday && holiday.type === 'holiday' && (
        <div className="date-cell__holiday-simple">休</div>
      )}
      <div className="date-cell__content">
        {displayed.map(preview => (
          <div
            key={preview.id}
            className="date-cell__item"
            style={{ borderLeftColor: preview.color }}
          >
            {preview.emoji && (
              <span className="date-cell__emoji">{preview.emoji}</span>
            )}
            <span className="date-cell__title">{preview.title}</span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="date-cell__more">+{remaining}</div>
        )}
      </div>
    </div>
  );
};
