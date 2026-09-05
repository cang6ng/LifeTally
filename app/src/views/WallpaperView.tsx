import React, { useEffect, useRef, useState } from 'react';
import { Button, Empty, Input, Modal, message } from 'antd';
import { DeleteOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../stores';
import { DEFAULT_WALLPAPER_URL, wallpaperService } from '../services/wallpaperService';
import type { Wallpaper } from '../types/objects';
import './WallpaperView.css';

export const WallpaperView: React.FC = () => {
  const { wallpaperId, setWallpaperId } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [renamingWallpaper, setRenamingWallpaper] = useState<Wallpaper | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const loadWallpapers = async () => {
    const items = await wallpaperService.getAll();
    setWallpapers(items);
  };

  useEffect(() => {
    void loadWallpapers();
  }, []);

  useEffect(() => {
    const urls: Record<string, string> = {};
    wallpapers.forEach(wallpaper => {
      urls[wallpaper.id] = URL.createObjectURL(wallpaper.blob);
    });
    setPreviews(urls);

    return () => {
      Object.values(urls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [wallpapers]);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const wallpaper = await wallpaperService.saveFile(file);
      setWallpaperId(wallpaper.id);
      await loadWallpapers();
      message.success('壁纸已保存到本地');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '壁纸上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await wallpaperService.delete(id);
    if (wallpaperId === id) {
      setWallpaperId(undefined);
    }
    await loadWallpapers();
    message.success('壁纸已删除');
  };

  const openRenameModal = (wallpaper: Wallpaper) => {
    setRenamingWallpaper(wallpaper);
    setRenameValue(wallpaper.name);
  };

  const closeRenameModal = () => {
    setRenamingWallpaper(null);
    setRenameValue('');
    setRenaming(false);
  };

  const handleRename = async () => {
    if (!renamingWallpaper) return;
    setRenaming(true);
    try {
      await wallpaperService.rename(renamingWallpaper.id, renameValue);
      await loadWallpapers();
      message.success('壁纸名称已更新');
      closeRenameModal();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '壁纸重命名失败');
      setRenaming(false);
    }
  };

  return (
    <div className="wallpaper-view">
      <section className="wallpaper-panel">
        <div className="wallpaper-panel__header">
          <div>
            <h2>壁纸库</h2>
            <p>壁纸保存在本地浏览器数据中，不使用外部 URL。</p>
          </div>
          <div className="wallpaper-panel__actions">
            <Button onClick={() => setWallpaperId(undefined)}>使用默认壁纸</Button>
            <Button type="primary" icon={<UploadOutlined />} loading={loading} onClick={() => fileInputRef.current?.click()}>
              上传壁纸
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={event => event.target.files?.[0] && handleUpload(event.target.files[0])}
            />
          </div>
        </div>

        <div className="wallpaper-grid">
          <article
            className={`wallpaper-card wallpaper-card--default ${!wallpaperId ? 'wallpaper-card--active' : ''}`}
            onClick={() => setWallpaperId(undefined)}
          >
            <div className="wallpaper-card__preview">
              <img src={DEFAULT_WALLPAPER_URL} alt="默认壁纸" />
            </div>
            <div className="wallpaper-card__meta">
              <div className="wallpaper-card__title-row">
                <strong>默认壁纸</strong>
                {!wallpaperId && <span className="wallpaper-card__badge">当前</span>}
              </div>
              <span>远山 · 晨雾 · 宁静</span>
              <span className="wallpaper-card__date">随应用内置</span>
            </div>
            <div className="wallpaper-card__actions wallpaper-card__actions--placeholder" aria-hidden="true" />
          </article>

          {wallpapers.map(wallpaper => (
            <article
              key={wallpaper.id}
              className={`wallpaper-card ${wallpaperId === wallpaper.id ? 'wallpaper-card--active' : ''}`}
              onClick={() => setWallpaperId(wallpaper.id)}
            >
              <div className="wallpaper-card__preview">
                {previews[wallpaper.id] ? (
                  <img src={previews[wallpaper.id]} alt={wallpaper.name} />
                ) : (
                  <span className="wallpaper-card__preview-placeholder" />
                )}
              </div>
              <div className="wallpaper-card__meta">
                <div className="wallpaper-card__title-row">
                  <strong title={wallpaper.name}>{wallpaper.name}</strong>
                  {wallpaperId === wallpaper.id && <span className="wallpaper-card__badge">当前</span>}
                </div>
                <span className="wallpaper-card__date">{new Date(wallpaper.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="wallpaper-card__actions">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={event => {
                    event.stopPropagation();
                    openRenameModal(wallpaper);
                  }}
                >
                  重命名
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={event => {
                    event.stopPropagation();
                    void handleDelete(wallpaper.id);
                  }}
                >
                  删除
                </Button>
              </div>
            </article>
          ))}
        </div>

        {wallpapers.length === 0 && (
          <div className="wallpaper-empty">
            <Empty description="还没有自定义壁纸" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
      </section>
      <Modal
        title="重命名壁纸"
        open={!!renamingWallpaper}
        okText="保存"
        cancelText="取消"
        confirmLoading={renaming}
        onOk={handleRename}
        onCancel={closeRenameModal}
        destroyOnHidden
      >
        <Input
          value={renameValue}
          maxLength={80}
          showCount
          autoFocus
          placeholder="输入壁纸名称"
          onChange={event => setRenameValue(event.target.value)}
          onPressEnter={() => void handleRename()}
        />
      </Modal>
    </div>
  );
};
