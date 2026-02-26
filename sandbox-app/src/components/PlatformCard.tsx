import { useState } from 'react';
import { PlatformStatus, MetricsRecord } from '../types';
import { collectAllMetrics } from '../services/metricsCollector';
import { saveMetrics } from '../services/db';
import MetricBadge from './MetricBadge';
import MetricsModal from './MetricsModal';

interface PlatformCardProps {
  platformStatus: PlatformStatus;
  onStart: (platformId: string) => void;
  onStop: (platformId: string) => void;
  onCollectMetrics: (platformId: string) => void;
  onRefresh: () => void;
  onEdit: (platform: Platform) => void;
  onDelete: (platformId: string) => void;
}

export default function PlatformCard({
  platformStatus,
  onStart,
  onStop,
  onCollectMetrics,
  onRefresh,
  onEdit,
  onDelete
}: PlatformCardProps) {
  const { platform, status, lastMetrics } = platformStatus;
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState({ step: '', progress: 0 });
  const [showDetails, setShowDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMetrics, setModalMetrics] = useState<MetricsRecord | null>(null);

  const handleCollectMetrics = async () => {
    setIsCollecting(true);
    setCollectProgress({ step: 'Инициализация...', progress: 0 });
    
    try {
      const metrics = await collectAllMetrics(platform, (step, progress) => {
        setCollectProgress({ step, progress });
      });
      
      const metricsRecord: MetricsRecord = {
        platformId: platform.id,
        timestamp: Date.now(),
        ...metrics
      };
      
      await saveMetrics(metricsRecord);
      
      onCollectMetrics(platform.id);
      onRefresh();
      
      // Show modal with results
      setModalMetrics(metricsRecord);
      setShowModal(true);
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    } finally {
      setIsCollecting(false);
      setCollectProgress({ step: '', progress: 0 });
    }
  };

  const handleShowModal = () => {
    if (lastMetrics) {
      setModalMetrics(lastMetrics);
      setShowModal(true);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Запущен';
      case 'stopped':
        return 'Остановлен';
      default:
        return 'Неизвестно';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900">{platform.name}</h3>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(platform)}
                className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                title="Редактировать"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(platform.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Удалить"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">{platform.description}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className={`h-3 w-3 rounded-full ${getStatusColor()} animate-pulse`}></span>
          <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">
            {platform.externalUrl ? 'URL:' : 'Порт:'}
          </span>
          <span className="ml-2 font-medium">
            {platform.externalUrl ? (
              <a href={platform.externalUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                Открыть →
              </a>
            ) : (
              platform.port
            )}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Категория:</span>
          <span className="ml-2 font-medium text-xs">{platform.category}</span>
        </div>
      </div>

      {/* Collection Progress */}
      {isCollecting && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">{collectProgress.step}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${collectProgress.progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-700 mt-1 text-right">{collectProgress.progress}%</div>
        </div>
      )}

      {/* Last Metrics */}
      {lastMetrics && !isCollecting && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Последние метрики</h4>
            <div className="flex gap-2">
              <button
                onClick={handleShowModal}
                className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                📋 Детальный отчет
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {showDetails ? '▲ Свернуть' : '▼ Развернуть'}
              </button>
            </div>
          </div>
          
          {showDetails && (
            <div className="space-y-4">
              {/* Lighthouse Metrics */}
              {lastMetrics.lighthouse && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Lighthouse</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricBadge
                      label="Performance"
                      value={lastMetrics.lighthouse.performance}
                      description="Скорость загрузки и отклик страницы. Оценивает FCP, LCP, TTI, TBT, CLS."
                      good={90}
                      fair={50}
                    />
                    <MetricBadge
                      label="Accessibility"
                      value={lastMetrics.lighthouse.accessibility}
                      description="Доступность сайта для людей с ограниченными возможностями. Проверяет ARIA, контрастность, навигацию с клавиатуры."
                      good={90}
                      fair={50}
                    />
                    <MetricBadge
                      label="SEO"
                      value={lastMetrics.lighthouse.seo}
                      description="Оптимизация для поисковых систем. Проверяет meta-теги, robots.txt, структурированные данные."
                      good={90}
                      fair={50}
                    />
                    <MetricBadge
                      label="Best Practices"
                      value={lastMetrics.lighthouse.bestPractices}
                      description="Соответствие веб-стандартам и лучшим практикам разработки. Проверяет HTTPS, консольные ошибки, устаревшие API."
                      good={90}
                      fair={50}
                    />
                  </div>
                </div>
              )}
              
              {/* Performance Metrics */}
              {lastMetrics.performance && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Performance API</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricBadge
                      label="Load Time"
                      value={Math.round(lastMetrics.performance.loadTime)}
                      unit="ms"
                      description="Общее время загрузки страницы от начала запроса до полной загрузки."
                      good={1000}
                      fair={3000}
                      inverse
                    />
                    {lastMetrics.performance.fcp && (
                      <MetricBadge
                        label="FCP"
                        value={Math.round(lastMetrics.performance.fcp)}
                        unit="ms"
                        description="First Contentful Paint - время до первой отрисовки контента на странице."
                        good={1800}
                        fair={3000}
                        inverse
                      />
                    )}
                    {lastMetrics.performance.domContentLoaded > 0 && (
                      <MetricBadge
                        label="DOM Ready"
                        value={Math.round(lastMetrics.performance.domContentLoaded)}
                        unit="ms"
                        description="Время загрузки и парсинга HTML-документа (DOMContentLoaded)."
                        good={1000}
                        fair={2000}
                        inverse
                      />
                    )}
                  </div>
                </div>
              )}
              
              {/* Availability Metrics */}
              {lastMetrics.availability && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Availability</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`
                      px-3 py-1.5 rounded-lg border-2
                      ${lastMetrics.availability.status === 'online' 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : lastMetrics.availability.status === 'offline'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-gray-100 text-gray-800 border-gray-300'}
                    `}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium opacity-70">Status:</span>
                        <span className="font-bold">
                          {lastMetrics.availability.status === 'online' ? '✓ Online' : 
                           lastMetrics.availability.status === 'offline' ? '✗ Offline' : '? Unknown'}
                        </span>
                      </div>
                    </div>
                    <MetricBadge
                      label="Response"
                      value={lastMetrics.availability.responseTime}
                      unit="ms"
                      description="Время отклика сервера на запрос проверки доступности."
                      good={200}
                      fair={1000}
                      inverse
                    />
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                📅 Собрано: {formatDate(lastMetrics.timestamp)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {/* Docker management buttons - only for platforms with dockerService */}
        {platform.dockerService && (
          <>
            {status === 'stopped' || status === 'unknown' ? (
              <button
                onClick={() => onStart(platform.id)}
                className="btn-primary flex-1"
              >
                Запустить
              </button>
            ) : (
              <button
                onClick={() => onStop(platform.id)}
                className="btn-danger flex-1"
              >
                Остановить
              </button>
            )}
          </>
        )}
        
        {/* Collect metrics button - always available for external URLs and running platforms */}
        <button
          onClick={handleCollectMetrics}
          disabled={isCollecting || (!platform.externalUrl && status !== 'running')}
          className={`btn-secondary ${platform.dockerService ? 'flex-1' : 'flex-[2]'} ${
            (isCollecting || (!platform.externalUrl && status !== 'running')) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isCollecting ? '📊 Сбор метрик...' : '📊 Собрать метрики'}
        </button>
        
        {/* Repository link */}
        <a
          href={platform.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          title="Открыть репозиторий"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </div>

      {/* Metrics Modal */}
      {showModal && modalMetrics && (
        <MetricsModal
          platform={platform}
          metrics={modalMetrics}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
