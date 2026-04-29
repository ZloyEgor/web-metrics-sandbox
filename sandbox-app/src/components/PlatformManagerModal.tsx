import { useState, useEffect } from 'react';
import type { Platform } from '../types';

interface PlatformManagerModalProps {
  platform?: Platform; // If provided, edit mode; otherwise, add mode
  onSave: (platform: Platform) => void;
  onClose: () => void;
}

export default function PlatformManagerModal({ platform, onSave, onClose }: PlatformManagerModalProps) {
  const [formData, setFormData] = useState<Platform>({
    id: '',
    name: '',
    description: '',
    dockerService: null,
    port: null,
    externalUrl: '',
    healthCheck: null,
    repoUrl: '',
    category: 'Other'
  });

  const [useDocker, setUseDocker] = useState(false);
  const [useExternalUrl, setUseExternalUrl] = useState(false);

  useEffect(() => {
    if (platform) {
      setFormData(platform);
      setUseDocker(!!platform.dockerService);
      setUseExternalUrl(!!platform.externalUrl);
    }
  }, [platform]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate ID from name if new platform
    const platformData: Platform = {
      ...formData,
      id: formData.id || formData.name.toLowerCase().replace(/\s+/g, '-'),
      dockerService: useDocker ? formData.dockerService : null,
      port: useExternalUrl ? null : formData.port,
      externalUrl: useExternalUrl ? formData.externalUrl : undefined,
      healthCheck: useDocker ? formData.healthCheck : null
    };

    onSave(platformData);
  };

  const categories = [
    'Autonomous Code Generation',
    'Less-code Hybrid Approach',
    'Domain Structure Modeling',
    'Microservices Integration',
    'Microservices Architecture',
    'SDK and API Extension',
    'Other'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {platform ? '✏️ Редактировать платформу' : '➕ Добавить платформу'}
          </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Основная информация</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название платформы <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Например, Jmix Bookstore"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Краткое описание платформы..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Категория <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL репозитория
                </label>
                <input
                  type="url"
                  value={formData.repoUrl}
                  onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
          </section>

          {/* Deployment Type */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Тип развертывания</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useExternalUrl}
                    onChange={(e) => {
                      setUseExternalUrl(e.target.checked);
                      if (e.target.checked) setUseDocker(false);
                    }}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Внешний URL</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDocker}
                    onChange={(e) => {
                      setUseDocker(e.target.checked);
                      if (e.target.checked) setUseExternalUrl(false);
                    }}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Docker сервис</span>
                </label>
              </div>

              {useExternalUrl && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL внешней платформы <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required={useExternalUrl}
                    value={formData.externalUrl || ''}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://demo.example.com/"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Для внешних URL не требуется Docker или локальный порт
                  </p>
                </div>
              )}

              {useDocker && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Docker сервис <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={useDocker}
                      value={formData.dockerService || ''}
                      onChange={(e) => setFormData({ ...formData, dockerService: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Например, jmix"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Имя сервиса в docker-compose.yml
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Порт <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required={useDocker}
                      value={formData.port || ''}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="8080"
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Health Check Endpoint
                    </label>
                    <input
                      type="text"
                      value={formData.healthCheck || ''}
                      onChange={(e) => setFormData({ ...formData, healthCheck: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="/health"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Путь для проверки доступности (необязательно)
                    </p>
                  </div>
                </div>
              )}

              {!useExternalUrl && !useDocker && (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Локальный порт
                    </label>
                    <input
                      type="number"
                      value={formData.port || ''}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="8000"
                      min="1"
                      max="65535"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Для платформ, запущенных локально (необязательно)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            {platform ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
