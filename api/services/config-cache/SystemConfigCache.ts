/**
 * 系统配置缓存服务
 */
import { query } from '../../config/database.ts';
import { CacheManager } from './CacheManager.ts';
import { CACHE_KEYS, CACHE_TTL } from './types.ts';

export class SystemConfigCache extends CacheManager {
  /**
   * 获取系统配置（带缓存）
   */
  async getSystemConfig(configKey: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.SYSTEM_CONFIG}${configKey}`;
    
    try {
      // 尝试从缓存获取
      if (this.connected) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          id, config_key, config_value, value_type, category,
          description, is_encrypted, is_active, 
          created_at, updated_at
         FROM system_configs 
         WHERE config_key = $1 AND is_active = true`,
        [configKey]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // 解析配置值
      let parsedValue = config.config_value;
      try {
        if (config.value_type === 'json') {
          parsedValue = JSON.parse(config.config_value);
        } else if (config.value_type === 'number') {
          parsedValue = Number(config.config_value);
        } else if (config.value_type === 'boolean') {
          parsedValue = config.config_value === 'true';
        }
      } catch (error) {
        console.warn(`配置值解析失败 [${configKey}]:`, error);
      }

      const configData = {
        ...config,
        parsed_value: parsedValue
      };

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, configData, CACHE_TTL.SYSTEM_CONFIG);
      }

      return configData;
    } catch (error) {
      console.error('获取系统配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取分类下的所有配置
   */
  async getConfigsByCategory(category: string): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.SYSTEM_CONFIG}category_${category}`;
    
    try {
      // 尝试从缓存获取
      if (this.connected) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          id, config_key, config_value, value_type, category,
          description, is_encrypted, is_active, 
          created_at, updated_at
         FROM system_configs 
         WHERE category = $1 AND is_active = true
         ORDER BY config_key`,
        [category]
      );

      const configs = result.rows.map(config => {
        // 解析配置值
        let parsedValue = config.config_value;
        try {
          if (config.value_type === 'json') {
            parsedValue = JSON.parse(config.config_value);
          } else if (config.value_type === 'number') {
            parsedValue = Number(config.config_value);
          } else if (config.value_type === 'boolean') {
            parsedValue = config.config_value === 'true';
          }
        } catch (error) {
          console.warn(`配置值解析失败 [${config.config_key}]:`, error);
        }

        return {
          ...config,
          parsed_value: parsedValue
        };
      });

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, configs, CACHE_TTL.SYSTEM_CONFIG);
      }

      return configs;
    } catch (error) {
      console.error('获取分类配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取所有系统配置
   */
  async getAllConfigs(): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.SYSTEM_CONFIG}all`;
    
    try {
      // 尝试从缓存获取
      if (this.connected) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          id, config_key, config_value, value_type, category,
          description, is_encrypted, is_active, 
          created_at, updated_at
         FROM system_configs 
         WHERE is_active = true
         ORDER BY category, config_key`
      );

      const configs = result.rows.map(config => {
        // 解析配置值
        let parsedValue = config.config_value;
        try {
          if (config.value_type === 'json') {
            parsedValue = JSON.parse(config.config_value);
          } else if (config.value_type === 'number') {
            parsedValue = Number(config.config_value);
          } else if (config.value_type === 'boolean') {
            parsedValue = config.config_value === 'true';
          }
        } catch (error) {
          console.warn(`配置值解析失败 [${config.config_key}]:`, error);
        }

        return {
          ...config,
          parsed_value: parsedValue
        };
      });

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, configs, CACHE_TTL.SYSTEM_CONFIG);
      }

      return configs;
    } catch (error) {
      console.error('获取所有系统配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取配置的简单值（只返回解析后的值）
   */
  async getConfigValue(configKey: string, defaultValue?: any): Promise<any> {
    try {
      const config = await this.getSystemConfig(configKey);
      return config ? config.parsed_value : defaultValue;
    } catch (error) {
      console.error(`获取配置值错误 [${configKey}]:`, error);
      return defaultValue;
    }
  }

  /**
   * 批量获取配置值
   */
  async getMultipleConfigValues(configKeys: string[]): Promise<{ [key: string]: any }> {
    const result: { [key: string]: any } = {};
    
    try {
      const promises = configKeys.map(async (key) => {
        const config = await this.getSystemConfig(key);
        return { key, value: config ? config.parsed_value : null };
      });

      const configs = await Promise.all(promises);
      
      configs.forEach(({ key, value }) => {
        result[key] = value;
      });

      return result;
    } catch (error) {
      console.error('批量获取配置值错误:', error);
      return result;
    }
  }

  /**
   * 清除系统缓存
   */
  async clearSystemCache(): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = await this.getKeys(`${CACHE_KEYS.SYSTEM_CONFIG}*`);
      
      if (keys.length > 0) {
        await this.deleteCache(...keys);
      }
      
      console.log('系统缓存已清除');
    } catch (error) {
      console.error('清除系统缓存错误:', error);
    }
  }

  /**
   * 清除特定配置缓存
   */
  async clearConfigCache(configKey: string): Promise<void> {
    if (!this.connected) return;

    try {
      const specificKey = `${CACHE_KEYS.SYSTEM_CONFIG}${configKey}`;
      const allKey = `${CACHE_KEYS.SYSTEM_CONFIG}all`;
      
      // 需要清除的键
      const keys = [specificKey, allKey];
      
      // 清除分类缓存 - 需要获取该配置的分类
      const config = await this.getSystemConfig(configKey);
      if (config && config.category) {
        keys.push(`${CACHE_KEYS.SYSTEM_CONFIG}category_${config.category}`);
      }
      
      await this.deleteCache(...keys);
      console.log(`配置缓存已清除: ${configKey}`);
    } catch (error) {
      console.error('清除配置缓存错误:', error);
    }
  }
}
