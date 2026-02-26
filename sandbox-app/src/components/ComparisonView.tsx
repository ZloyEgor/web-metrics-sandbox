import { useEffect, useState } from 'react';
import { Platform, MetricsRecord } from '../types';
import { getLatestMetrics } from '../services/db';
import { Radar, Bar } from 'react-chartjs-2';

interface PlatformComparison {
  platform: Platform;
  metrics?: MetricsRecord;
}

interface ComparisonViewProps {
  platforms: Platform[];
}

export default function ComparisonView({ platforms }: ComparisonViewProps) {
  const [comparisons, setComparisons] = useState<PlatformComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComparisons();
  }, [platforms]);

  const loadComparisons = async () => {
    setIsLoading(true);
    try {
      const comparisonsData: PlatformComparison[] = [];

      for (const platform of platforms) {
        const metrics = await getLatestMetrics(platform.id);
        console.log(`📊 Loaded metrics for ${platform.name}:`, metrics);
        comparisonsData.push({
          platform,
          metrics
        });
      }

      console.log('📈 All comparisons loaded:', comparisonsData);
      setComparisons(comparisonsData);
    } catch (error) {
      console.error('Failed to load comparisons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLighthouseComparisonData = () => {
    const platformsWithMetrics = comparisons.filter(c => c.metrics?.lighthouse);
    
    return {
      labels: ['Performance', 'Accessibility', 'SEO', 'Best Practices'],
      datasets: platformsWithMetrics.map((comp, index) => {
        const colors = [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(14, 165, 233)'
        ];
        const color = colors[index % colors.length];
        
        return {
          label: comp.platform.name,
          data: [
            comp.metrics!.lighthouse!.performance,
            comp.metrics!.lighthouse!.accessibility,
            comp.metrics!.lighthouse!.seo,
            comp.metrics!.lighthouse!.bestPractices
          ],
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
          borderColor: color,
          borderWidth: 2
        };
      })
    };
  };

  const getPerformanceComparisonData = () => {
    const platformsWithMetrics = comparisons.filter(c => c.metrics?.performance);
    
    return {
      labels: platformsWithMetrics.map(c => c.platform.name),
      datasets: [
        {
          label: 'Load Time (ms)',
          data: platformsWithMetrics.map(c => c.metrics!.performance!.loadTime),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        }
      ]
    };
  };

  const getAvailabilityComparisonData = () => {
    const platformsWithMetrics = comparisons.filter(c => c.metrics?.availability);
    
    return {
      labels: platformsWithMetrics.map(c => c.platform.name),
      datasets: [
        {
          label: 'Response Time (ms)',
          data: platformsWithMetrics.map(c => c.metrics!.availability!.responseTime),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
        }
      ]
    };
  };

  const getCategoryLeaders = () => {
    const withMetrics = comparisons.filter(c => c.metrics?.lighthouse);
    if (withMetrics.length === 0) return null;

    const categories = ['performance', 'accessibility', 'seo', 'bestPractices'] as const;
    const leaders: { [key: string]: { platform: Platform; score: number } } = {};

    categories.forEach(category => {
      let best = withMetrics[0];
      let bestScore = best.metrics!.lighthouse![category] || 0;

      withMetrics.forEach(comp => {
        const score = comp.metrics!.lighthouse![category] || 0;
        if (score > bestScore) {
          bestScore = score;
          best = comp;
        }
      });

      leaders[category] = {
        platform: best.platform,
        score: bestScore
      };
    });

    return leaders;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if any platform has at least one category of metrics
  const metricsAvailable = comparisons.some(c => 
    c.metrics && (c.metrics.lighthouse || c.metrics.performance || c.metrics.availability)
  );
  
  console.log('🔍 Metrics available:', metricsAvailable, 'Total platforms:', comparisons.length);
  
  const leaders = getCategoryLeaders();

  if (!metricsAvailable) {
    return (
      <div className="card text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Недостаточно данных для сравнения</h3>
        <p className="text-gray-600 mb-4">Соберите метрики хотя бы для одной платформы</p>
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
          <p className="font-medium mb-2">💡 Для сбора метрик:</p>
          <ol className="text-left space-y-1 list-decimal list-inside">
            <li>Перейдите на вкладку "Обзор"</li>
            <li>Найдите платформу</li>
            <li>Нажмите "📊 Собрать метрики"</li>
            <li>Дождитесь завершения</li>
            <li>Вернитесь на вкладку "Сравнение"</li>
          </ol>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Платформ в системе: {comparisons.length} | С метриками: {comparisons.filter(c => c.metrics).length}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Leaders */}
      {leaders && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Лидеры по категориям</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Performance</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{leaders.performance.platform.name}</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{leaders.performance.score}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Accessibility</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{leaders.accessibility.platform.name}</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{leaders.accessibility.score}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium">SEO</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{leaders.seo.platform.name}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{leaders.seo.score}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Best Practices</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{leaders.bestPractices.platform.name}</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{leaders.bestPractices.score}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lighthouse Comparison */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-6">Сравнение Lighthouse метрик</h3>
        <div className="max-w-2xl mx-auto">
          <Radar 
            data={getLighthouseComparisonData()} 
            options={{
              scales: {
                r: {
                  beginAtZero: true,
                  max: 100
                }
              }
            }}
          />
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-6">Сравнение времени загрузки</h3>
        <Bar 
          data={getPerformanceComparisonData()} 
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Milliseconds'
                }
              }
            }
          }}
        />
      </div>

      {/* Availability Comparison */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-6">Сравнение времени отклика</h3>
        <Bar 
          data={getAvailabilityComparisonData()} 
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Milliseconds'
                }
              }
            }
          }}
        />
      </div>

      {/* Detailed Table */}
      <div className="card overflow-x-auto">
        <h3 className="text-xl font-semibold mb-6">Детальное сравнение</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Платформа</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accessibility</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SEO</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Practices</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Load Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comparisons.map((comp) => (
              <tr key={comp.platform.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {comp.platform.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {comp.metrics?.lighthouse?.performance || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {comp.metrics?.lighthouse?.accessibility || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {comp.metrics?.lighthouse?.seo || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {comp.metrics?.lighthouse?.bestPractices || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {comp.metrics?.performance ? `${Math.round(comp.metrics.performance.loadTime)}ms` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {comp.metrics?.availability ? `${comp.metrics.availability.responseTime}ms` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Conclusions */}
      <div className="card bg-primary-50 border-primary-200">
        <h3 className="text-xl font-semibold mb-4 text-primary-900">Выводы</h3>
        <div className="space-y-2 text-sm text-primary-800">
          <p>• Данные собраны для {comparisons.filter(c => c.metrics).length} из {comparisons.length} платформ</p>
          <p>• Lighthouse метрики показывают качество веб-приложения по ключевым параметрам</p>
          <p>• Performance метрики отражают скорость загрузки и отклика платформ</p>
          <p>• Для более точного сравнения рекомендуется собрать несколько измерений</p>
        </div>
      </div>
    </div>
  );
}
