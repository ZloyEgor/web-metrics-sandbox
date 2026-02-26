import { useEffect, useState } from 'react';
import { MetricsRecord, Platform } from '../types';
import { getMetricsByPlatform } from '../services/db';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MetricsDashboardProps {
  platform: Platform;
}

export default function MetricsDashboard({ platform }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'lighthouse' | 'performance' | 'availability'>('lighthouse');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [platform.id]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await getMetricsByPlatform(platform.id, 10);
      setMetrics(data.reverse()); // Oldest first for timeline
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLighthouseData = () => {
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleDateString('ru-RU', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));

    return {
      labels,
      datasets: [
        {
          label: 'Performance',
          data: metrics.map(m => m.lighthouse?.performance || 0),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Accessibility',
          data: metrics.map(m => m.lighthouse?.accessibility || 0),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        },
        {
          label: 'SEO',
          data: metrics.map(m => m.lighthouse?.seo || 0),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        },
        {
          label: 'Best Practices',
          data: metrics.map(m => m.lighthouse?.bestPractices || 0),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  const getLatestLighthouseRadar = () => {
    const latest = metrics[metrics.length - 1];
    if (!latest?.lighthouse) return null;

    return {
      labels: ['Performance', 'Accessibility', 'SEO', 'Best Practices'],
      datasets: [
        {
          label: platform.name,
          data: [
            latest.lighthouse.performance,
            latest.lighthouse.accessibility,
            latest.lighthouse.seo,
            latest.lighthouse.bestPractices
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2
        }
      ]
    };
  };

  const getPerformanceData = () => {
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleDateString('ru-RU', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));

    return {
      labels,
      datasets: [
        {
          label: 'Load Time (ms)',
          data: metrics.map(m => m.performance?.loadTime || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
        {
          label: 'FCP (ms)',
          data: metrics.map(m => m.performance?.fcp || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
        }
      ]
    };
  };

  const getAvailabilityData = () => {
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleDateString('ru-RU', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));

    return {
      labels,
      datasets: [
        {
          label: 'Response Time (ms)',
          data: metrics.map(m => m.availability?.responseTime || 0),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">Нет данных для отображения</p>
        <p className="text-sm text-gray-500 mt-2">Соберите метрики для этой платформы</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('lighthouse')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'lighthouse'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Lighthouse
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'performance'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('availability')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'availability'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Availability
        </button>
      </div>

      {/* Content */}
      {activeTab === 'lighthouse' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Lighthouse Scores Over Time</h3>
            <Line 
              data={getLighthouseData()} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100
                  }
                }
              }}
            />
          </div>
          
          {getLatestLighthouseRadar() && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Latest Lighthouse Scores</h3>
              <div className="max-w-md mx-auto">
                <Radar 
                  data={getLatestLighthouseRadar()!} 
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
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <Bar 
            data={getPerformanceData()} 
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Response Time</h3>
          <Line 
            data={getAvailabilityData()} 
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
