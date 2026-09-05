import { useEffect, useState, type CSSProperties } from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useUIStore, useSettingsStore } from './stores';
import { useTheme } from './hooks/useTheme';
import { CalendarView } from './views/CalendarView';
import { ObjectEditorView } from './views/ObjectEditorView';
import { NotesView } from './views/NotesView';
import { WallpaperView } from './views/WallpaperView';
import { Sidebar } from './views/Sidebar';
import { VerticalNav } from './components/VerticalNav';
import { DEFAULT_WALLPAPER_URL, wallpaperService } from './services/wallpaperService';
import './styles/theme.css';

function App() {
  const { viewMode } = useUIStore();
  const { wallpaperId } = useSettingsStore();
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER_URL);
  useTheme();

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadWallpaper = async () => {
      if (!wallpaperId) {
        setWallpaperUrl(DEFAULT_WALLPAPER_URL);
        return;
      }

      const wallpaper = await wallpaperService.getById(wallpaperId);
      if (!wallpaper) {
        setWallpaperUrl(DEFAULT_WALLPAPER_URL);
        return;
      }

      objectUrl = URL.createObjectURL(wallpaper.blob);
      if (cancelled) {
        URL.revokeObjectURL(objectUrl);
      } else {
        setWallpaperUrl(objectUrl);
      }
    };

    void loadWallpaper();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [wallpaperId]);

  const bgStyle = {
    backgroundImage: `url("${wallpaperUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as CSSProperties;

  const isWideMain = viewMode === 'wallpapers';
  const showSidebar = viewMode !== 'wallpapers';
  const mainClassName = `app-main ${isWideMain ? 'app-main--wallpapers' : 'app-main--panel'}`;

  const renderView = () => {
    switch (viewMode) {
      case 'calendar':
        return <CalendarView />;
      case 'editor':
        return <ObjectEditorView />;
      case 'notes':
        return <NotesView />;
      case 'wallpapers':
        return <WallpaperView />;
      default:
        return <CalendarView />;
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
          colorBgContainer: 'rgba(255, 255, 255, 0.08)',
          colorBorder: 'rgba(255, 255, 255, 0.15)',
        },
        components: {
          Modal: {
            contentBg: 'rgba(255, 255, 255, 0.08)',
            headerBg: 'rgba(255, 255, 255, 0.08)',
            footerBg: 'rgba(255, 255, 255, 0.08)',
            colorBgMask: 'rgba(0, 0, 0, 0.5)',
          },
        },
      }}
    >
      <div className={`app-container app-container--${viewMode}`} style={bgStyle}>
        {viewMode !== 'editor' && <VerticalNav />}
        <div className="app-content-frame">
          <div className={mainClassName}>
            {renderView()}
          </div>
          {showSidebar && <Sidebar />}
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;
