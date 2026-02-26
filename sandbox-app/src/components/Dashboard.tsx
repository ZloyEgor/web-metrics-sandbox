import { useState, useEffect } from 'react';
import { Platform, PlatformStatus } from '../types';
import { 
  getAllPlatforms, 
  getLatestMetrics, 
  initializeDefaultPlatforms,
  savePlatform,
  deletePlatform 
} from '../services/db';
import PlatformCard from './PlatformCard';
import PlatformManagerModal from './PlatformManagerModal';
import ComparisonView from './ComparisonView';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Dashboard() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'comparison'>('overview');
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | undefined>();

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      // Initialize default platforms if database is empty
      await initializeDefaultPlatforms();
      
      // Load platforms from database
      await loadPlatforms();
    } catch (error) {
      console.error('Failed to initialize data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlatforms = async () => {
    const loadedPlatforms = await getAllPlatforms();
    console.log('🔧 Dashboard: Loaded platforms from DB:', loadedPlatforms);
    setPlatforms(loadedPlatforms);
    console.log('🔧 Dashboard: Set platforms state, count:', loadedPlatforms.length);
    await loadPlatformStatuses(loadedPlatforms);
  };

  const loadPlatformStatuses = async (platformsList: Platform[]) => {
    const statuses: PlatformStatus[] = [];
    
    for (const platform of platformsList) {
      const lastMetrics = await getLatestMetrics(platform.id);
      const status = await checkPlatformStatus(platform);
      
      statuses.push({
        platform,
        status,
        lastMetrics
      });
    }
    
    setPlatformStatuses(statuses);
  };

  const checkPlatformStatus = async (platform: Platform): Promise<'running' | 'stopped' | 'unknown'> => {
    try {
      const response = await fetch(`${API_URL}/api/docker/status`);
      if (!response.ok) return 'unknown';
      
      const data = await response.json();
      const container = data.containers?.find((c: any) => 
        c.Service === platform.dockerService || c.Name?.includes(platform.dockerService)
      );
      
      if (container) {
        return container.State === 'running' ? 'running' : 'stopped';
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  };

  const handleStartPlatform = async (platformId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/docker/start/${platformId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadPlatformStatuses();
      }
    } catch (error) {
      console.error(`Failed to start ${platformId}:`, error);
    }
  };

  const handleStopPlatform = async (platformId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/docker/stop/${platformId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadPlatformStatuses();
      }
    } catch (error) {
      console.error(`Failed to stop ${platformId}:`, error);
    }
  };

  const handleCollectMetrics = async (platformId: string) => {
    // This will be handled by PlatformCard component
    await loadPlatforms();
  };

  const handleAddPlatform = () => {
    setEditingPlatform(undefined);
    setShowPlatformModal(true);
  };

  const handleEditPlatform = (platform: Platform) => {
    setEditingPlatform(platform);
    setShowPlatformModal(true);
  };

  const handleSavePlatform = async (platform: Platform) => {
    try {
      await savePlatform(platform);
      await loadPlatforms();
      setShowPlatformModal(false);
      setEditingPlatform(undefined);
    } catch (error) {
      console.error('Failed to save platform:', error);
      alert('Ошибка при сохранении платформы');
    }
  };

  const handleDeletePlatform = async (platformId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту платформу? Все связанные метрики также будут удалены.')) {
      return;
    }

    try {
      await deletePlatform(platformId);
      await loadPlatforms();
    } catch (error) {
      console.error('Failed to delete platform:', error);
      alert('Ошибка при удалении платформы');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка платформ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Low-Code Platforms Sandbox
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Мониторинг и сравнение open-source low-code платформ
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPlatform}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Добавить платформу
              </button>
              <button
                onClick={() => setSelectedView('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedView === 'overview'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Обзор
              </button>
              <button
                onClick={() => setSelectedView('comparison')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedView === 'comparison'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Сравнение
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedView === 'overview' ? (
          <>
            {/* Stats */}
            {console.log('🔧 Dashboard Overview: platforms count:', platforms.length, platforms)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="card">
                <p className="text-sm text-gray-600">Всего платформ</p>
                <p className="text-3xl font-bold text-gray-900">{platforms.length}</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-600">С метриками</p>
                <p className="text-3xl font-bold text-primary-600">
                  {platformStatuses.filter(p => p.lastMetrics).length}
                </p>
              </div>
            </div>

            {/* Platform Cards */}
            {platformStatuses.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет платформ</h3>
                <p className="text-gray-600 mb-4">Добавьте первую платформу для начала работы</p>
                <button
                  onClick={handleAddPlatform}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить платформу
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {platformStatuses.map((platformStatus) => (
                  <PlatformCard
                    key={platformStatus.platform.id}
                    platformStatus={platformStatus}
                    onStart={handleStartPlatform}
                    onStop={handleStopPlatform}
                    onCollectMetrics={handleCollectMetrics}
                    onRefresh={loadPlatforms}
                    onEdit={handleEditPlatform}
                    onDelete={handleDeletePlatform}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {console.log('🔧 Dashboard: Rendering ComparisonView with platforms:', platforms)}
            <ComparisonView platforms={platforms} />
          </>
        )}
      </main>

      {/* Platform Manager Modal */}
      {showPlatformModal && (
        <PlatformManagerModal
          platform={editingPlatform}
          onSave={handleSavePlatform}
          onClose={() => {
            setShowPlatformModal(false);
            setEditingPlatform(undefined);
          }}
        />
      )}
    </div>
  );
}
