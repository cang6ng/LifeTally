import React, { useMemo, useState } from 'react';
import { Button, Empty, message } from 'antd';
import { PlusOutlined, DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import { ObjectCard } from '../components/ObjectCard';
import { useObjectStore, useUIStore } from '../stores';
import { conversionRecordService } from '../services/conversionRecordService';
import { trashService } from '../services/trashService';
import type { AnyObject, ConversionRecord, ObjectType } from '../types/objects';
import { getObjectColor, getTypeDisplayName } from '../utils/objectUtils';
import './NotesView.css';

type NoteFilter = 'inbox' | 'converted' | 'trash';

const filters: Array<{ id: NoteFilter; label: string }> = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'converted', label: '已转换' },
  { id: 'trash', label: '回收站' },
];

const convertTargets: Array<{ type: Exclude<ObjectType, 'note'>; label: string }> = [
  { type: 'todo', label: 'To Do' },
  { type: 'dailyTodo', label: 'Daily To Do' },
  { type: 'event', label: '事件' },
  { type: 'anniversary', label: '纪念日' },
  { type: 'deadline', label: 'Deadline' },
];

interface ConversionRecordCardProps {
  record: ConversionRecord;
  exists: boolean;
  onOpen: (id: string) => void;
}

const ConversionRecordCard: React.FC<ConversionRecordCardProps> = ({ record, exists, onOpen }) => {
  const fromLabel = getTypeDisplayName(record.fromType);
  const toLabel = getTypeDisplayName(record.toType);
  const targetColor = getObjectColor(record.toType);
  const title = record.titleSnapshot?.trim() || '无标题对象';

  return (
    <button
      type="button"
      className={`conversion-record-card ${exists ? '' : 'conversion-record-card--disabled'}`}
      onClick={() => exists && onOpen(record.objectId)}
      disabled={!exists}
      style={{ ['--conversion-color' as string]: targetColor }}
    >
      <span className="conversion-record-card__marker" />
      <span className="conversion-record-card__body">
        <span className="conversion-record-card__title">{title}</span>
        <span className="conversion-record-card__meta">
          <span className="conversion-record-card__pill">{fromLabel} → {toLabel}</span>
          {!exists && <span className="conversion-record-card__deleted">对象已删除</span>}
        </span>
      </span>
      <time className="conversion-record-card__time" dateTime={new Date(record.convertedAt).toISOString()}>
        {new Date(record.convertedAt).toLocaleString()}
      </time>
    </button>
  );
};

export const NotesView: React.FC = () => {
  const { objects, selectedDate, selectedObjectId, createObject, setSelectedObjectId, getNotes, convertObjectType, restoreObject, loadObjects } = useObjectStore();
  const { setViewMode } = useUIStore();
  const [filter, setFilter] = useState<NoteFilter>('inbox');
  const [conversionRecords, setConversionRecords] = useState<ConversionRecord[]>([]);
  const [trashItems, setTrashItems] = useState<AnyObject[]>([]);

  const loadConverted = async () => setConversionRecords(await conversionRecordService.getLatest(5));
  const loadTrash = async () => setTrashItems(await trashService.list());

  const grouped = useMemo(() => ({
    inbox: getNotes().filter(item => item.status === 'active').sort((a, b) => b.updatedAt - a.updatedAt),
    trash: trashItems,
  }), [conversionRecords, getNotes, trashItems]);

  const activeObjectIds = useMemo(() => new Set(objects.map(object => object.id)), [objects]);

  React.useEffect(() => {
    void loadConverted();
    void loadTrash();
  }, []);

  const visibleItems = filter === 'converted' ? [] : grouped[filter];
  const openObject = (id: string) => {
    setSelectedObjectId(id);
    setViewMode('editor');
  };

  const handleCreateNote = async () => {
    try {
      const note = await createObject({
        type: 'note',
        title: '新的便利贴',
        content: '',
        contentFormat: 'plain',
        status: 'active',
        noteStage: 'inbox',
      } as any);
      openObject(note.id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建便利贴失败');
    }
  };

  const handleConvert = async (object: AnyObject, targetType: ObjectType) => {
    try {
      const converted = await convertObjectType(object.id, targetType, {
        date: (selectedDate ?? new Date()).toISOString(),
        noteStage: 'inbox',
      });
      message.success(targetType === 'note' ? '已转回便利贴' : '已转换');
      openObject(converted.id);
      await loadConverted();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '转换失败');
    }
  };

  const handleRestore = async (object: AnyObject) => {
    try {
      await restoreObject(object.id);
      await loadTrash();
      await loadObjects();
      message.success('已恢复');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '恢复失败');
    }
  };

  const handlePermanentDelete = async (object: AnyObject) => {
    try {
      await trashService.permanentlyDelete(object.id);
      await loadTrash();
      message.success('已彻底删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  return (
    <div className="notes-view notes-view--sticky">
      <aside className="sticky-note-groups">
        <div className="sticky-note-groups__header">
          <h3>便利贴</h3>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateNote}>新建</Button>
        </div>
        {filters.map(item => (
          <button key={item.id} type="button" className={`sticky-note-groups__item ${filter === item.id ? 'sticky-note-groups__item--active' : ''}`} onClick={() => setFilter(item.id)}>
            <span>{item.label}</span>
            <strong>{item.id === 'converted' ? conversionRecords.length : grouped[item.id].length}</strong>
          </button>
        ))}
      </aside>

      <section className="sticky-note-list">
        <div className="sticky-note-list__header">
          <h3>{filters.find(item => item.id === filter)?.label}</h3>
          <span>{filter === 'inbox' ? '所有便利贴都放在这里' : filter === 'converted' ? '最近 5 次转换记录' : '可恢复或彻底删除'}</span>
        </div>

        {filter === 'converted' ? (
          conversionRecords.length === 0 ? (
            <Empty description="暂无转换记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div className="sticky-note-list__items">
              {conversionRecords.map(record => (
                <ConversionRecordCard
                  key={record.id}
                  record={record}
                  exists={activeObjectIds.has(record.objectId)}
                  onOpen={openObject}
                />
              ))}
            </div>
          )
        ) : visibleItems.length === 0 ? (
          <Empty description="暂无内容" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            {filter === 'inbox' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNote}>创建第一个便利贴</Button>
            )}
          </Empty>
        ) : (
          <div className="sticky-note-list__items">
            {visibleItems.map(object => (
              <div key={object.id} className="sticky-note-list__row">
                <ObjectCard
                  object={object as AnyObject}
                  selected={filter !== 'trash' && object.id === selectedObjectId}
                  onClick={filter === 'trash' ? () => undefined : () => openObject(object.id)}
                  selectedDate={selectedDate ?? new Date()}
                  readOnly={filter === 'trash'}
                />
                <div className="sticky-note-list__actions">
                  {filter === 'inbox' ? (
                    convertTargets.map(target => (
                      <Button key={target.type} size="small" onClick={() => handleConvert(object, target.type)}>
                        转为{target.label}
                      </Button>
                    ))
                  ) : filter === 'trash' ? (
                    <>
                      <Button size="small" icon={<UndoOutlined />} onClick={() => handleRestore(object)}>恢复</Button>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handlePermanentDelete(object)}>彻底删除</Button>
                    </>
                  ) : (
                    <Button size="small" onClick={() => handleConvert(object, 'note')}>
                      转回便利贴
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
