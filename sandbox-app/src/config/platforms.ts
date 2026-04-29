import type { Platform } from '../types';

export const platforms: Platform[] = [
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

export const getPlatformById = (id: string): Platform | undefined => {
  return platforms.find(p => p.id === id);
};

export const getPlatformsByCategory = (category: string): Platform[] => {
  return platforms.filter(p => p.category === category);
};
