import React from 'react';
import { Button, DatePicker, Input, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import { useObjectStore } from '../stores';
import { DB_NAME, DB_VERSION } from '../db';
import { getObjectDiagnostics } from '../db/operations';
import type { HolidayDataset, HolidayInfo } from '../providers/holiday/HolidayProvider';
import { downloadBackup, uploadBackup } from '../utils/backup';
import {
  checkHolidayUpdate,
  getHolidayDatasetStatus,
  importHolidayDataset,
  setHolidayOverride,
} from '../utils/holidayUtils';
import './DataSettingsModal.css';

interface DataSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

type Diagnostics = Awaited<ReturnType<typeof getObjectDiagnostics>>;

const formatHealth = (value?: boolean) => value ? '正常' : '缺失';

const formatRecord = (record?: Record<string, number>) => {
  if (!record || Object.keys(record).length === 0) return '无';
  return Object.entries(record).map(([key, value]) => `${key} ${value}`).join('，');
};

const formatBooleanRecord = (record?: Record<string, boolean>) => {
  if (!record || Object.keys(record).length === 0) return '无';
  return Object.entries(record).map(([name, ok]) => `${name}: ${formatHealth(ok)}`).join('，');
};

export const DataSettingsModal: React.FC<DataSettingsModalProps> = ({ visible, onClose }) => {
  const selectedDate = useObjectStore(state => state.selectedDate);
  const holidayFileInputRef = React.useRef<HTMLInputElement>(null);
  const [holidayYear, setHolidayYear] = React.useState(new Date().getFullYear());
  const [overrideDate, setOverrideDate] = React.useState(selectedDate ?? new Date());
  const [overrideType, setOverrideType] = React.useState<'normal' | HolidayInfo['type']>('normal');
  const [overrideName, setOverrideName] = React.useState('');
  const [checkingHoliday, setCheckingHoliday] = React.useState(false);
  const [importingBackup, setImportingBackup] = React.useState(false);
  const [diagnostics, setDiagnostics] = React.useState<Diagnostics | null>(null);

  const holidayStatus = getHolidayDatasetStatus(holidayYear);

  const refreshDiagnostics = React.useCallback(async () => {
    setDiagnostics(await getObjectDiagnostics());
  }, []);

  React.useEffect(() => {
    if (visible) void refreshDiagnostics();
  }, [refreshDiagnostics, visible]);

  const handleCheckHolidayUpdate = async () => {
    setCheckingHoliday(true);
    try {
      const updated = await checkHolidayUpdate(holidayYear);
      message[updated ? 'success' : 'warning'](
        updated ? '假期数据已更新' : '没有获取到可用的远程数据，已保留本地数据'
      );
    } finally {
      setCheckingHoliday(false);
    }
  };

  const handleHolidayFileSelect = async (file: File) => {
    try {
      const dataset = JSON.parse(await file.text()) as HolidayDataset;
      await importHolidayDataset(dataset);
      setHolidayYear(dataset._meta.year);
      message.success('假期 JSON 已导入');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '假期 JSON 导入失败');
    }
  };

  const handleApplyOverride = () => {
    const dateKey = dayjs(overrideDate).format('YYYY-MM-DD');
    if (overrideType === 'normal') {
      setHolidayOverride(dateKey, null);
      message.success('已标记为普通日');
      return;
    }

    setHolidayOverride(dateKey, {
      date: dateKey,
      name: overrideName.trim() || (overrideType === 'workday' ? '调休补班' : '节假日'),
      type: overrideType,
      source: '用户覆盖',
    });
    message.success('假期覆盖已保存');
  };

  const handleImportBackup = async () => {
    setImportingBackup(true);
    try {
      const result = await uploadBackup();
      await useObjectStore.getState().loadObjects();
      await refreshDiagnostics();
      const summary = `已校验并合并：${result.objects} 个对象、${result.wallpapers} 张壁纸、${result.conversionRecords} 条转换记录`;
      if (result.warnings.length > 0) {
        message.warning(`${summary}；${result.warnings.join('；')}`);
      } else {
        message.success(summary);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '备份导入失败');
    } finally {
      setImportingBackup(false);
    }
  };

  const statusText = diagnostics
    ? `active ${diagnostics.byStatus.active ?? 0} / trashed ${diagnostics.byStatus.trashed ?? 0} / archived ${diagnostics.byStatus.archived ?? 0}`
    : '-';

  return (
    <Modal
      title="数据设置"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      <div className="data-settings">
        <div className="data-settings__section">
          <h4>v0 数据诊断</h4>
          <div className="holiday-settings__meta">
            <div>数据库：{DB_NAME} v{DB_VERSION}</div>
            <div>当前地址：{typeof window === 'undefined' ? 'unknown' : window.location.origin}</div>
            <div>对象总数：{diagnostics?.total ?? '-'}</div>
            <div>状态：{statusText}</div>
            <div>类型：{formatRecord(diagnostics?.byType)}</div>
            <div>Stores：{formatBooleanRecord(diagnostics?.stores)}</div>
            <div>Indexes：{formatBooleanRecord(diagnostics?.indexes)}</div>
            <div>最近更新：{diagnostics?.latestUpdatedAt ? new Date(diagnostics.latestUpdatedAt).toLocaleString() : '-'}</div>
          </div>
          <div className="holiday-settings__actions">
            <Button onClick={refreshDiagnostics}>刷新诊断</Button>
            <Button type="primary" loading={importingBackup} onClick={handleImportBackup}>导入并合并备份</Button>
            <Button onClick={() => void downloadBackup()}>导出备份</Button>
          </div>
        </div>

        <div className="data-settings__section">
          <h4>假期数据</h4>
          <div className="holiday-settings">
            <div className="holiday-settings__row">
              <span>年份</span>
              <Select value={holidayYear} style={{ width: 120 }} onChange={setHolidayYear}>
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(year => (
                  <Select.Option key={year} value={year}>{year}</Select.Option>
                ))}
              </Select>
            </div>
            <div className="holiday-settings__meta">
              <div>来源：{holidayStatus.source}</div>
              <div>状态：{holidayStatus.status} · {holidayStatus.count} 条</div>
              <div>校验：{holidayStatus.verifiedAt}</div>
            </div>
            <div className="holiday-settings__actions">
              <Button loading={checkingHoliday} onClick={handleCheckHolidayUpdate}>检查更新</Button>
              <Button onClick={() => holidayFileInputRef.current?.click()}>导入假期 JSON</Button>
              <input
                ref={holidayFileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={event => event.target.files?.[0] && handleHolidayFileSelect(event.target.files[0])}
              />
            </div>
          </div>
        </div>

        <div className="data-settings__section">
          <h4>修正某一天</h4>
          <div className="holiday-settings">
            <DatePicker value={dayjs(overrideDate)} onChange={value => value && setOverrideDate(value.toDate())} />
            <Select value={overrideType} onChange={setOverrideType}>
              <Select.Option value="normal">普通日</Select.Option>
              <Select.Option value="festival">节日本日</Select.Option>
              <Select.Option value="holiday">放假日</Select.Option>
              <Select.Option value="workday">调休补班</Select.Option>
            </Select>
            <Input value={overrideName} onChange={event => setOverrideName(event.target.value)} placeholder="名称，可选" />
            <Button onClick={handleApplyOverride}>保存覆盖</Button>
          </div>
        </div>

        <div className="data-settings__actions">
          <Button type="primary" onClick={onClose}>完成</Button>
        </div>
      </div>
    </Modal>
  );
};
