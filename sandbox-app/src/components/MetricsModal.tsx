import type { MetricsRecord, Platform } from '../types';
import MetricBadge from './MetricBadge';

interface MetricsModalProps {
  platform: Platform;
  metrics: MetricsRecord;
  onClose: () => void;
}

export default function MetricsModal({ platform, metrics, onClose }: MetricsModalProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatMs = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{platform.name}</h2>
            <p className="text-sm opacity-90 mt-1">Детальный отчет по метрикам</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Timestamp */}
          <div className="text-sm text-gray-500 pb-4 border-b border-gray-200">
            📅 Данные собраны: <span className="font-medium text-gray-700">{formatDate(metrics.timestamp)}</span>
          </div>

          {/* Lighthouse Metrics */}
          {metrics.lighthouse && (
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                🔍 Lighthouse Audit
              </h3>

              {/* Overall Scores */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Общие оценки
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricBadge
                    label="Performance"
                    value={metrics.lighthouse.performance}
                    description="Общая оценка производительности"
                    good={90}
                    fair={50}
                  />
                  <MetricBadge
                    label="Accessibility"
                    value={metrics.lighthouse.accessibility}
                    description="Общая оценка доступности"
                    good={90}
                    fair={50}
                  />
                  <MetricBadge
                    label="SEO"
                    value={metrics.lighthouse.seo}
                    description="Общая оценка SEO"
                    good={90}
                    fair={50}
                  />
                  <MetricBadge
                    label="Best Practices"
                    value={metrics.lighthouse.bestPractices}
                    description="Общая оценка лучших практик"
                    good={90}
                    fair={50}
                  />
                </div>
              </div>

              {/* Detailed Performance Metrics */}
              {metrics.lighthouse.detailed && (
                <div className="space-y-6">
                  {/* Performance Details */}
                  <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                    <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                      ⚡ Performance - Детальные метрики
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {metrics.lighthouse.detailed.firstContentfulPaint && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-xs text-gray-500 font-semibold uppercase mb-1">
                            First Contentful Paint (FCP)
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatMs(metrics.lighthouse.detailed.firstContentfulPaint)}
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            Время до первой отрисовки контента
                          </div>
                        </div>
                      )}
                      
                      {metrics.lighthouse.detailed.largestContentfulPaint && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-xs text-gray-500 font-semibold uppercase mb-1">
                            Largest Contentful Paint (LCP)
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatMs(metrics.lighthouse.detailed.largestContentfulPaint)}
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            Время до отрисовки основного контента
                          </div>
                        </div>
                      )}
                      
                      {metrics.lighthouse.detailed.totalBlockingTime !== undefined && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-xs text-gray-500 font-semibold uppercase mb-1">
                            Total Blocking Time (TBT)
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatMs(metrics.lighthouse.detailed.totalBlockingTime)}
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            Время блокировки главного потока
                          </div>
                        </div>
                      )}
                      
                      {metrics.lighthouse.detailed.cumulativeLayoutShift !== undefined && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-xs text-gray-500 font-semibold uppercase mb-1">
                            Cumulative Layout Shift (CLS)
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {metrics.lighthouse.detailed.cumulativeLayoutShift.toFixed(3)}
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            Стабильность визуального отображения
                          </div>
                        </div>
                      )}
                      
                      {metrics.lighthouse.detailed.speedIndex && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-xs text-gray-500 font-semibold uppercase mb-1">
                            Speed Index
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatMs(metrics.lighthouse.detailed.speedIndex)}
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            Скорость визуального наполнения
                          </div>
                        </div>
                      )}
                      
                      {metrics.lighthouse.detailed.timeToInteractive && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-xs text-gray-500 font-semibold uppercase mb-1">
                            Time to Interactive (TTI)
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatMs(metrics.lighthouse.detailed.timeToInteractive)}
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            Время до интерактивности
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accessibility Issues */}
                  {metrics.lighthouse.detailed.accessibilityIssues && metrics.lighthouse.detailed.accessibilityIssues.length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                      <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                        ♿ Accessibility - Найденные проблемы
                      </h4>
                      <ul className="space-y-2">
                        {metrics.lighthouse.detailed.accessibilityIssues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 shadow-sm">
                            <span className="text-purple-600 mt-0.5">⚠</span>
                            <span className="text-sm text-gray-700">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* SEO Issues */}
                  {metrics.lighthouse.detailed.seoIssues && metrics.lighthouse.detailed.seoIssues.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                      <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                        🔎 SEO - Найденные проблемы
                      </h4>
                      <ul className="space-y-2">
                        {metrics.lighthouse.detailed.seoIssues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 shadow-sm">
                            <span className="text-green-600 mt-0.5">⚠</span>
                            <span className="text-sm text-gray-700">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Best Practices Issues */}
                  {metrics.lighthouse.detailed.bestPracticesIssues && metrics.lighthouse.detailed.bestPracticesIssues.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
                      <h4 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                        ⚙️ Best Practices - Найденные проблемы
                      </h4>
                      <ul className="space-y-2">
                        {metrics.lighthouse.detailed.bestPracticesIssues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 shadow-sm">
                            <span className="text-orange-600 mt-0.5">⚠</span>
                            <span className="text-sm text-gray-700">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Performance API Metrics */}
          {metrics.performance && (
            <section className="bg-indigo-50 rounded-xl p-6 border-2 border-indigo-200">
              <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                📊 Performance API
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Load Time</div>
                  <div className="text-2xl font-bold text-gray-900">{formatMs(metrics.performance.loadTime)}</div>
                  <div className="text-xs text-gray-600 mt-2">Время полной загрузки</div>
                </div>
                
                {metrics.performance.fcp && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">FCP</div>
                    <div className="text-2xl font-bold text-gray-900">{formatMs(metrics.performance.fcp)}</div>
                    <div className="text-xs text-gray-600 mt-2">First Contentful Paint</div>
                  </div>
                )}
                
                {metrics.performance.domContentLoaded > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">DOM Ready</div>
                    <div className="text-2xl font-bold text-gray-900">{formatMs(metrics.performance.domContentLoaded)}</div>
                    <div className="text-xs text-gray-600 mt-2">DOMContentLoaded</div>
                  </div>
                )}
                
                {metrics.performance.memoryUsage && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Memory Usage</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {(metrics.performance.memoryUsage / 1024 / 1024).toFixed(1)} MB
                    </div>
                    <div className="text-xs text-gray-600 mt-2">Использование памяти</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Availability Metrics */}
          {metrics.availability && (
            <section className="bg-teal-50 rounded-xl p-6 border-2 border-teal-200">
              <h3 className="text-xl font-bold text-teal-900 mb-4 flex items-center gap-2">
                🌐 Availability
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-lg p-4 shadow-sm ${
                  metrics.availability.status === 'online' ? 'bg-green-100' :
                  metrics.availability.status === 'offline' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Status</div>
                  <div className="text-2xl font-bold">
                    {metrics.availability.status === 'online' ? '✓ Online' :
                     metrics.availability.status === 'offline' ? '✗ Offline' : '? Unknown'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Response Time</div>
                  <div className="text-2xl font-bold text-gray-900">{metrics.availability.responseTime}ms</div>
                  <div className="text-xs text-gray-600 mt-2">Время отклика</div>
                </div>
                
                {metrics.availability.httpStatus && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">HTTP Status</div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.availability.httpStatus}</div>
                    <div className="text-xs text-gray-600 mt-2">Код ответа</div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
