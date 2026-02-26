import Dexie, { Table } from 'dexie';
import { MetricsRecord, Platform } from '../types';

export class MetricsDatabase extends Dexie {
  platforms!: Table<Platform, string>;
  metrics!: Table<MetricsRecord, number>;

  constructor() {
    super('LowCodeMetricsDB');
    
    this.version(1).stores({
      platforms: 'id, name, category',
      metrics: '++id, platformId, timestamp, [platformId+timestamp]'
    });
  }
}

export const db = new MetricsDatabase();

// Platform operations
export const savePlatform = async (platform: Platform): Promise<string> => {
  return await db.platforms.put(platform);
};

export const getAllPlatforms = async (): Promise<Platform[]> => {
  return await db.platforms.toArray();
};

export const getPlatformById = async (id: string): Promise<Platform | undefined> => {
  return await db.platforms.get(id);
};

export const deletePlatform = async (id: string): Promise<void> => {
  await db.platforms.delete(id);
  // Also delete all metrics for this platform
  await db.metrics.where('platformId').equals(id).delete();
};

export const updatePlatform = async (platform: Platform): Promise<string> => {
  return await db.platforms.put(platform);
};

// Metrics operations
export const saveMetrics = async (metrics: MetricsRecord): Promise<number> => {
  return await db.metrics.add(metrics);
};

export const getMetricsByPlatform = async (
  platformId: string,
  limit?: number
): Promise<MetricsRecord[]> => {
  let query = db.metrics
    .where('platformId')
    .equals(platformId)
    .reverse()
    .sortBy('timestamp');
  
  const results = await query;
  return limit ? results.slice(0, limit) : results;
};

export const getAllMetrics = async (): Promise<MetricsRecord[]> => {
  return await db.metrics.orderBy('timestamp').reverse().toArray();
};

export const getLatestMetrics = async (platformId: string): Promise<MetricsRecord | undefined> => {
  return await db.metrics
    .where('platformId')
    .equals(platformId)
    .reverse()
    .sortBy('timestamp')
    .then(results => results[0]);
};

export const getMetricsInTimeRange = async (
  platformId: string,
  startTime: number,
  endTime: number
): Promise<MetricsRecord[]> => {
  return await db.metrics
    .where('[platformId+timestamp]')
    .between([platformId, startTime], [platformId, endTime])
    .toArray();
};

export const deleteMetrics = async (id: number): Promise<void> => {
  await db.metrics.delete(id);
};

export const deleteOldMetrics = async (daysToKeep: number = 30): Promise<number> => {
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  return await db.metrics.where('timestamp').below(cutoffTime).delete();
};

export const clearAllMetrics = async (): Promise<void> => {
  await db.metrics.clear();
};

export const getMetricsCount = async (platformId?: string): Promise<number> => {
  if (platformId) {
    return await db.metrics.where('platformId').equals(platformId).count();
  }
  return await db.metrics.count();
};

// Initialize default platforms
export const initializeDefaultPlatforms = async (): Promise<void> => {
  const count = await db.platforms.count();
  
  // Only initialize if database is empty
  if (count === 0) {
    const defaultPlatforms: Platform[] = [
      {
        id: 'jmix-demo',
        name: 'Jmix Bookstore (Demo)',
        description: 'Official Jmix demo - Online bookstore with full CRUD, authentication, and business logic. Production deployment at demo.jmix.io',
        dockerService: null,
        port: null,
        externalUrl: 'https://demo.jmix.io/bookstore/',
        healthCheck: null,
        repoUrl: 'https://github.com/jmix-framework/jmix-bookstore-2',
        category: 'Less-code Hybrid Approach'
      }
    ];
    
    await db.platforms.bulkPut(defaultPlatforms);
    console.log('✅ Default platforms initialized');
  }
};

// Initialize platforms in DB (for bulk operations)
export const initializePlatforms = async (platforms: Platform[]): Promise<void> => {
  await db.platforms.bulkPut(platforms);
};

// Export/Import functionality
export const exportMetrics = async (): Promise<string> => {
  const allMetrics = await getAllMetrics();
  return JSON.stringify(allMetrics, null, 2);
};

export const importMetrics = async (jsonData: string): Promise<number> => {
  try {
    const metrics: MetricsRecord[] = JSON.parse(jsonData);
    await db.metrics.bulkAdd(metrics);
    return metrics.length;
  } catch (error) {
    console.error('Failed to import metrics:', error);
    throw new Error('Invalid metrics data format');
  }
};
