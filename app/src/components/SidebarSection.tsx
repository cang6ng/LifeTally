import React from 'react';
import { PlusOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import type { BaseObject } from '../types/objects';
import { ObjectCard } from './ObjectCard';
import { getTypeDisplayName } from '../utils/objectUtils';
import './SidebarSection.css';

interface SidebarSectionProps {
  type: BaseObject['type'];
  icon: React.ReactNode;
  objects: BaseObject[];
  collapsed: boolean;
  selectedObjectId: string | null;
  onToggleCollapse: () => void;
  onAddObject: () => void;
  onSelectObject: (id: string) => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
  selectedDate?: Date;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  type,
  icon,
  objects,
  collapsed,
  selectedObjectId,
  onToggleCollapse,
  onAddObject,
  onSelectObject,
  onToggleComplete,
  selectedDate,
}) => {
  const typeName = getTypeDisplayName(type);

  return (
    <div className="sidebar-section">
      <div className="sidebar-section__header" onClick={onToggleCollapse}>
        <div className="sidebar-section__left">
          <span className="sidebar-section__type-icon">{icon}</span>
          <span className="sidebar-section__type-name">{typeName}</span>
          <span className="sidebar-section__count">{objects.length}</span>
        </div>
        <div className="sidebar-section__right">
          <PlusOutlined
            className="sidebar-section__add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddObject();
            }}
          />
          <span className="sidebar-section__collapse-btn">
            {collapsed ? <DownOutlined /> : <UpOutlined />}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="sidebar-section__content">
          {objects.length === 0 ? (
            <div className="sidebar-section__empty">暂无{typeName}</div>
          ) : (
            objects.map(obj => (
              <ObjectCard
                key={obj.id}
                object={obj}
                onClick={onSelectObject}
                selected={obj.id === selectedObjectId}
                onToggleComplete={onToggleComplete}
                selectedDate={selectedDate}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
