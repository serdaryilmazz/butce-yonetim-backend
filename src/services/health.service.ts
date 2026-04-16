import { getDatabaseStatus } from '../config/db';

class HealthService {
  getStatus(): { message: string; uptime: number; ready: boolean; database: { ready: boolean; state: number } } {
    const database = getDatabaseStatus();

    return {
      message: 'Budget management API is running.',
      uptime: process.uptime(),
      ready: database.ready,
      database,
    };
  }
}

export const healthService = new HealthService();
