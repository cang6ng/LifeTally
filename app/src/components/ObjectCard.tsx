import React from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Switch } from 'antd';
import type { BaseObject } from '../types/objects';
import { getObjectColor, getTypeDisplayName } from '../utils/objectUtils';
import { formatDate, getDaysUntilAnniversary, getAnniversaryYears, getDaysSinceTimestamp } from '../utils/dateUtils';
import './ObjectCard.css';

interface ObjectCardProps {
  object: BaseObject;
  onClick: (id: string) => void;
  selected?: boolean;
  onToggleComplete?: (id: string, completed: boolean) => void;
  selectedDate?: Date;
  readOnly?: boolean;
}

export const ObjectCard: React.FC<ObjectCardProps> = ({
  object,
  onClick,
  selected = false,
  onToggleComplete,
  selectedDate,
  readOnly = false,
}) => {
  const color = getObjectColor(object.type);
  const currentDate = selectedDate || new Date();
  const canToggleComplete = object.status === 'active' && !!onToggleComplete && !readOnly;

  const renderMetaInfo = () => {
    switch (object.type) {
      case 'anniversary':
        const anniversaryDate = (object as any).date;
        if (!anniversaryDate) return null;

        const annivDate = new Date(anniversaryDate);
        const daysUntil = getDaysUntilAnniversary(annivDate, currentDate);
        const years = getAnniversaryYears(annivDate, currentDate);
        const daysPassed = getDaysSinceTimestamp(annivDate.getTime(), currentDate);

        return (
          <span className="object-card__meta">
            {daysUntil === 0
              ? `已经过去${daysPassed}天了 · 今天 · ${years > 0 ? `${years}周年` : '纪念日'}`
              : `已经过去${daysPassed}天了 · 还有${daysUntil}天纪念！${years > 0 ? ` · ${years}周年` : ''}`
            }
          </span>
        );

      case 'event':
        const eventDate = (object as any).startDate ?? (object as any).date;
        return eventDate ? (
          <span className="object-card__meta">
            <ClockCircleOutlined /> {formatDate(new Date(eventDate), 'MM-dd HH:mm')}
          </span>
        ) : null;

      case 'deadline':
        const deadlineDate = (object as any).dueDate ?? (object as any).date;
        return deadlineDate ? (
          <span className="object-card__meta object-card__meta--urgent">
            截止 {formatDate(new Date(deadlineDate), 'MM-dd HH:mm')}
          </span>
        ) : null;

      case 'note':
        return (
          <span className="object-card__meta">
            {formatDate(new Date(object.updatedAt), 'MM-dd')}
          </span>
        );

      case 'todo':
        const isCompleted = (object as any).isCompleted || false;
        const todoDate = (object as any).date;
        return (
          <div className="object-card__meta-group">
            {todoDate && (
              <span className="object-card__meta">
                {formatDate(new Date(todoDate), 'MM-dd')}
              </span>
            )}
            {canToggleComplete && (
              <Switch
                size="small"
                checked={isCompleted}
                onChange={(checked) => onToggleComplete(object.id, checked)}
                onClick={(_, event) => event.stopPropagation()}
              />
            )}
          </div>
        );

      case 'dailyTodo':
        const isDailyCompleted = (object as any).isCompleted || false;
        return (
          <div className="object-card__meta-group">
            {canToggleComplete && (
              <Switch
                size="small"
                checked={isDailyCompleted}
                onChange={(checked) => onToggleComplete(object.id, checked)}
                onClick={(_, event) => event.stopPropagation()}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`object-card ${selected ? 'object-card--selected' : ''} ${readOnly ? 'object-card--readonly' : ''}`}
      onClick={() => onClick(object.id)}
      style={{ borderLeftColor: color }}
    >
      <div className="object-card__header">
        <span className="object-card__title">{object.title}</span>
        {readOnly && <span className="object-card__status">已删除</span>}
      </div>
      <div className="object-card__footer">{renderMetaInfo()}</div>
    </div>
  );
};
