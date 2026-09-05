import React from 'react';
import { Tooltip } from 'antd';
import { CalendarOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons';
import { useUIStore } from '../stores';
import './VerticalNav.css';

export const VerticalNav: React.FC = () => {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <div className="vertical-nav">
      <div className="vertical-nav__items">
        <Tooltip title="日历" placement="right">
          <button className="vertical-nav__button" data-active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}>
            <CalendarOutlined />
          </button>
        </Tooltip>
        <Tooltip title="便利贴" placement="right">
          <button className="vertical-nav__button" data-active={viewMode === 'notes'} onClick={() => setViewMode('notes')}>
            <FileTextOutlined />
          </button>
        </Tooltip>
        <Tooltip title="壁纸" placement="right">
          <button className="vertical-nav__button" data-active={viewMode === 'wallpapers'} onClick={() => setViewMode('wallpapers')}>
            <PictureOutlined />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
