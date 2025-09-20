import { query } from './index';

export class DatabaseService {
  async query(sql: string, params?: any[]): Promise<any> {
    try {
      return await query(sql, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}

export default DatabaseService;


