import { query, getClient } from './index';

export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    try {
      return await query(sql, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient(): Promise<any> {
    try {
      return await getClient();
    } catch (error) {
      console.error('Database getClient error:', error);
      throw error;
    }
  }
}

export default DatabaseService;


