import React, { useCallback, useEffect, useState } from 'react';
import { Button, DatePicker, Modal, Select, Switch, message } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, DeleteOutlined, LoadingOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAutoSave } from '../hooks/useAutoSave';
import { useObjectStore, useSettingsStore, useUIStore } from '../stores';
import type { BaseObject, NoteStage, ObjectType } from '../types/objects';
import { getObjectColor, getTypeDisplayName } from '../utils/objectUtils';
import './ObjectEditorView.css';

const noteTargets: Array<{ value: Exclude<ObjectType, 'note'>; label: string }> = [
  { value: 'todo', label: 'To Do' },
  { value: 'dailyTodo', label: 'Daily To Do' },
  { value: 'event', label: '事件' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'deadline', label: 'Deadline' },
];

const objectDate = (object: BaseObject): string | undefined => {
  if (object.type === 'event') return (object as any).startDate ?? (object as any).date;
  if (object.type === 'deadline') return (object as any).dueDate ?? (object as any).date;
  if (object.type === 'anniversary' || object.type === 'todo') return (object as any).date;
  return undefined;
};

export const ObjectEditorView: React.FC = () => {
  const { selectedObjectId, selectedDate, getObjectById, updateObject, deleteObject, convertObjectType, setSelectedObjectId } = useObjectStore();
  const { setViewMode } = useUIStore();
  const { autoSaveInterval } = useSettingsStore();

  const [object, setObject] = useState<BaseObject | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState<string | undefined>();
  const [completed, setCompleted] = useState(false);
  const [noteStage, setNoteStage] = useState<NoteStage>('inbox');
  const [convertTarget, setConvertTarget] = useState<Exclude<ObjectType, 'note'>>('todo');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    if (!selectedObjectId) {
      setObject(null);
      setIsLoading(false);
      return;
    }
    const nextObject = getObjectById(selectedObjectId);
    if (!nextObject) {
      setObject(null);
      setIsLoading(false);
      return;
    }
    setObject(nextObject);
    setTitle(nextObject.title);
    setContent(nextObject.content || '');
    setDate(objectDate(nextObject));
    setCompleted('isCompleted' in nextObject ? Boolean((nextObject as any).isCompleted) : false);
    setNoteStage('inbox');
    setSaveStatus('idle');
    setIsLoading(false);
  }, [selectedObjectId, getObjectById]);

  const validateForm = useCallback((): string | null => {
    if (!title.trim()) return '标题不能为空';
    if (object && ['anniversary', 'event', 'deadline', 'todo'].includes(object.type) && !date) {
      return '日期不能为空';
    }
    return null;
  }, [date, object, title]);

  const buildUpdates = useCallback((): Partial<BaseObject> => {
    if (!object) return {};
    const updates: any = { title, content };
    if (object.type === 'event') {
      updates.startDate = date;
      updates.date = date;
    } else if (object.type === 'deadline') {
      updates.dueDate = date;
      updates.date = date;
      updates.isCompleted = completed;
    } else if (object.type === 'anniversary' || object.type === 'todo') {
      updates.date = date;
    }
    if (object.type === 'todo' || object.type === 'dailyTodo') {
      updates.isCompleted = completed;
    }
    if (object.type === 'note') {
      updates.noteStage = noteStage;
    }
    return updates;
  }, [completed, content, date, noteStage, object, title]);

  const handleAutoSave = useCallback(async () => {
    if (!object || saveStatus === 'saving') return;
    const validationError = validateForm();
    if (validationError) {
      message.warning(validationError);
      return;
    }
    setSaveStatus('saving');
    try {
      await updateObject(object.id, buildUpdates());
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setSaveStatus('error');
      message.error(`保存失败: ${errorMsg}`);
      window.setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [buildUpdates, object, saveStatus, updateObject, validateForm]);

  useAutoSave({ title, content, date, completed, noteStage }, handleAutoSave, autoSaveInterval * 1000);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleAutoSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAutoSave]);

  const handleBack = () => {
    setSelectedObjectId(null);
    setViewMode(object?.type === 'note' ? 'notes' : 'calendar');
  };

  const handleConfirmDelete = async () => {
    if (!object) return;
    setShowDeleteConfirm(false);
    try {
      await deleteObject(object.id);
      message.success('已移入回收站');
      handleBack();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      message.error(`删除失败: ${errorMsg}`);
    }
  };

  const handleConvert = async (targetType: ObjectType) => {
    if (!object) return;
    try {
      const validationError = validateForm();
      if (validationError) {
        message.warning(validationError);
        return;
      }
      await updateObject(object.id, buildUpdates());
      const converted = await convertObjectType(object.id, targetType, {
        date: (selectedDate ?? new Date()).toISOString(),
        noteStage: 'inbox',
      });
      setObject(converted);
      setSelectedObjectId(converted.id);
      message.success(targetType === 'note' ? '已转回便利贴' : '已转换');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '转换失败');
    }
  };

  if (isLoading) {
    return (
      <div className="object-editor">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <LoadingOutlined style={{ fontSize: 32, color: '#1890ff' }} />
          <div style={{ marginTop: 16 }}>加载中...</div>
        </div>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="object-editor">
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--glass-text-tertiary)' }}>
          请选择一个对象进行编辑
        </div>
      </div>
    );
  }

  const typeName = object.type === 'note' ? '便利贴' : getTypeDisplayName(object.type);
  const typeColor = getObjectColor(object.type);

  return (
    <div className="object-editor">
      <div className="object-editor__header">
        <div className="object-editor__back" onClick={handleBack}>
          <ArrowLeftOutlined />
          {object.type === 'note' ? '返回便利贴' : '返回日历'}
        </div>
        <div className={`object-editor__status object-editor__status--${saveStatus}`}>
          {saveStatus === 'saving' && <><LoadingOutlined /> 保存中...</>}
          {saveStatus === 'saved' && <><CheckCircleOutlined /> 已保存</>}
          {saveStatus === 'error' && <>保存失败</>}
        </div>
      </div>

      <div className="object-editor__type-badge" style={{ color: typeColor }}>{typeName}</div>

      <input className="object-editor__title-input" placeholder="输入标题..." value={title} onChange={event => setTitle(event.target.value)} />

      <div className="object-editor__meta">
        {object.type === 'note' && (
          <div className="object-editor__meta-item">
            <div className="object-editor__meta-label">位置</div>
            <Select style={{ width: 200 }} value={noteStage} onChange={setNoteStage}>
              <Select.Option value="inbox">Inbox</Select.Option>
            </Select>
          </div>
        )}
        {['anniversary', 'event', 'deadline', 'todo'].includes(object.type) && (
          <div className="object-editor__meta-item">
            <div className="object-editor__meta-label">日期</div>
            <DatePicker
              value={date ? dayjs(date) : null}
              onChange={value => setDate(value?.toISOString())}
              showTime={object.type === 'deadline' || object.type === 'event'}
              format={object.type === 'deadline' || object.type === 'event' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'}
            />
          </div>
        )}
        {['todo', 'deadline', 'dailyTodo'].includes(object.type) && (
          <div className="object-editor__meta-item">
            <div className="object-editor__meta-label">完成状态</div>
            <Switch checked={completed} onChange={setCompleted} />
          </div>
        )}
      </div>

      <div className="object-editor__content">
        <div className="object-editor__content-label">内容</div>
        <textarea className="object-editor__textarea" placeholder="在这里输入详细内容..." value={content} onChange={event => setContent(event.target.value)} />
      </div>

      <div className="object-editor__actions">
        {object.type === 'note' ? (
          <>
            <Select value={convertTarget} style={{ width: 150 }} onChange={setConvertTarget}>
              {noteTargets.map(target => <Select.Option key={target.value} value={target.value}>{target.label}</Select.Option>)}
            </Select>
            <Button onClick={() => handleConvert(convertTarget)}>转为</Button>
          </>
        ) : (
          <Button onClick={() => handleConvert('note')}>转回便利贴</Button>
        )}
        <Button icon={<SaveOutlined />} type="primary" onClick={handleAutoSave}>立即保存</Button>
        <Button icon={<DeleteOutlined />} danger onClick={() => setShowDeleteConfirm(true)}>删除</Button>
      </div>

      <Modal
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onOk={handleConfirmDelete}
        title="确认删除"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除“{title || '无标题'}”吗？删除后可以在回收站中恢复。</p>
      </Modal>
    </div>
  );
};
