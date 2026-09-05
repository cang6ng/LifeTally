import React, { useMemo } from 'react';
import {
  HeartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useObjectStore, useUIStore } from '../stores';
import { SidebarSection } from '../components/SidebarSection';
import { DataSettingsModal } from './DataSettingsModal';
import { formatDate, isSameDayAs, getDaysUntilAnniversary } from '../utils/dateUtils';
import { getHolidayForDate, getNextHoliday, HOLIDAY_UPDATED_EVENT } from '../utils/holidayUtils';
import type { BaseObject } from '../types/objects';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const {
    objects,
    selectedDate,
    selectedObjectId,
    setSelectedObjectId,
    createObject,
    updateObject,
  } = useObjectStore();

  const { sidebarSections, toggleSidebarSection, setViewMode } = useUIStore();
  const [dataSettingsVisible, setDataSettingsVisible] = React.useState(false);
  const [, setHolidayVersion] = React.useState(0);

  React.useEffect(() => {
    const handleHolidayUpdated = () => setHolidayVersion(version => version + 1);
    window.addEventListener(HOLIDAY_UPDATED_EVENT, handleHolidayUpdated);
    return () => window.removeEventListener(HOLIDAY_UPDATED_EVENT, handleHolidayUpdated);
  }, []);

  // Filter objects based on selected date
  const filteredObjects = useMemo(() => {
    const grouped: Record<BaseObject['type'], BaseObject[]> = {
      anniversary: [],
      event: [],
      deadline: [],
      note: [],
      todo: [],
      dailyTodo: [],
    };

    const dateToFilter = selectedDate || new Date();
    const dateToFilterStart = new Date(dateToFilter);
    dateToFilterStart.setHours(0, 0, 0, 0);

    objects.forEach(obj => {
      if (obj.type === 'anniversary') {
        // Show all anniversaries
        grouped[obj.type].push(obj);
      } else if (obj.type === 'event' || obj.type === 'todo') {
        // Date-specific objects
        if (obj.date && isSameDayAs(new Date(obj.date), dateToFilter)) {
          grouped[obj.type].push(obj);
        }
      } else if (obj.type === 'deadline') {
        // Show deadlines from selected date onwards
        const dueDate = (obj as any).dueDate;
        if (dueDate) {
          const dueDateTime = new Date(dueDate);
          if (dueDateTime >= dateToFilterStart) {
            grouped[obj.type].push(obj);
          }
        }
      } else if (obj.type === 'dailyTodo') {
        // Show all daily todos regardless of date
        grouped[obj.type].push(obj);
      }
    });

    // Sort anniversary by countdown (closest first)
    grouped.anniversary.sort((a, b) => {
      const aDate = new Date((a as any).date);
      const bDate = new Date((b as any).date);
      const aDays = getDaysUntilAnniversary(aDate, dateToFilterStart);
      const bDays = getDaysUntilAnniversary(bDate, dateToFilterStart);
      return aDays - bDays;
    });

    // Sort deadline by date (most urgent first)
    grouped.deadline.sort((a, b) => {
      const aDate = (a as any).dueDate;
      const bDate = (b as any).dueDate;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    return grouped;
  }, [objects, selectedDate]);

  const handleAddObject = async (type: BaseObject['type']) => {
    const newObject = await createObject({
      type,
      title: `新建${type === 'anniversary' ? '纪念日' : type === 'event' ? '事件' : type === 'deadline' ? 'Deadline' : type === 'note' ? '便利贴' : 'To Do'}`,
      content: '',
      date: selectedDate?.toISOString(),
      completed: false,
    });

    // Switch to editor view
    setSelectedObjectId(newObject.id);
    setViewMode('editor');
  };

  const handleSelectObject = (id: string) => {
    setSelectedObjectId(id);
    setViewMode('editor');
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await updateObject(id, { isCompleted: completed });
    } catch (error) {
      console.error('Toggle complete failed:', error);
    }
  };

  const getSectionCollapsed = (type: BaseObject['type']) => {
    const section = sidebarSections.find(s => s.type === type);
    return section?.collapsed ?? false;
  };

  const getHeaderText = () => {
    const dateToShow = selectedDate || new Date();
    return {
      title: formatDate(dateToShow, 'yyyy年M月d日'),
      subtitle: formatDate(dateToShow, 'EEEE'),
    };
  };

  const headerText = getHeaderText();

  const selectedDateObj = selectedDate || new Date();
  const todayHoliday = getHolidayForDate(selectedDateObj);
  const nextHoliday = getNextHoliday(selectedDateObj);

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__title-row">
          <div className="sidebar__title">Overview</div>
          <SettingOutlined
            className="sidebar__settings-icon"
            onClick={() => setDataSettingsVisible(true)}
          />
        </div>
        <div className="sidebar__subtitle">{formatDate(selectedDateObj, 'yyyy年MM月dd日')}</div>

        {todayHoliday && (
          <div className="sidebar__today-status">
            {todayHoliday.type === 'holiday' || todayHoliday.type === 'festival'
              ? `🎉 ${todayHoliday.name}`
              : `⚠️ 调休工作日`
            }
          </div>
        )}

        {nextHoliday && (
          <div className="sidebar__next-holiday">
            距离{nextHoliday.holiday.name}还有{nextHoliday.daysUntil}天
          </div>
        )}
      </div>

      <div className="sidebar__content">
        <SidebarSection
          type="anniversary"
          icon={<HeartOutlined />}
          objects={filteredObjects.anniversary}
          collapsed={getSectionCollapsed('anniversary')}
          selectedObjectId={selectedObjectId}
          onToggleCollapse={() => toggleSidebarSection('anniversary')}
          onAddObject={() => handleAddObject('anniversary')}
          onSelectObject={handleSelectObject}
          selectedDate={selectedDate ?? new Date()}
        />

        <SidebarSection
          type="event"
          icon={<CalendarOutlined />}
          objects={filteredObjects.event}
          collapsed={getSectionCollapsed('event')}
          selectedObjectId={selectedObjectId}
          onToggleCollapse={() => toggleSidebarSection('event')}
          onAddObject={() => handleAddObject('event')}
          onSelectObject={handleSelectObject}
          selectedDate={selectedDate ?? new Date()}
        />

        <SidebarSection
          type="deadline"
          icon={<ClockCircleOutlined />}
          objects={filteredObjects.deadline}
          collapsed={getSectionCollapsed('deadline')}
          selectedObjectId={selectedObjectId}
          onToggleCollapse={() => toggleSidebarSection('deadline')}
          onAddObject={() => handleAddObject('deadline')}
          onSelectObject={handleSelectObject}
          selectedDate={selectedDate ?? new Date()}
        />

        <SidebarSection
          type="todo"
          icon={<CheckSquareOutlined />}
          objects={filteredObjects.todo}
          collapsed={getSectionCollapsed('todo')}
          selectedObjectId={selectedObjectId}
          onToggleCollapse={() => toggleSidebarSection('todo')}
          onAddObject={() => handleAddObject('todo')}
          onSelectObject={handleSelectObject}
          onToggleComplete={handleToggleComplete}
          selectedDate={selectedDate ?? new Date()}
        />

        <SidebarSection
          type="dailyTodo"
          icon={<CheckSquareOutlined />}
          objects={filteredObjects.dailyTodo}
          collapsed={getSectionCollapsed('dailyTodo')}
          selectedObjectId={selectedObjectId}
          onToggleCollapse={() => toggleSidebarSection('dailyTodo')}
          onAddObject={() => handleAddObject('dailyTodo')}
          onSelectObject={handleSelectObject}
          onToggleComplete={handleToggleComplete}
          selectedDate={selectedDate ?? new Date()}
        />
      </div>

      <DataSettingsModal visible={dataSettingsVisible} onClose={() => setDataSettingsVisible(false)} />
    </div>
  );
};
