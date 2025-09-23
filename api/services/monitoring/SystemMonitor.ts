/**
 * 系统监控模块
 * 负责CPU、内存、磁盘等系统资源监控
 */
import * as si from 'systeminformation';
import { logger } from '../../utils/logger.ts';
import type { DiskUsage, MemoryUsage, Performance, SystemInfo } from './types/monitoring.types.ts';

export class SystemMonitor {
  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const [osInfo, time] = await Promise.all([
        si.osInfo(),
        si.time()
      ]);

      return {
        platform: osInfo.platform,
        arch: osInfo.arch,
        nodeVersion: process.version,
        uptime: time.uptime
      };
    } catch (error) {
      logger.error('获取系统信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能数据
   */
  async getPerformanceData(): Promise<Performance> {
    try {
      const [cpu, memory, disk, load] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.currentLoad()
      ]);

      // 计算内存使用情况
      // 在macOS等系统中，available字段更准确地反映了实际可用内存
      // used字段包含了缓存和缓冲区，这些实际上是可以释放的内存
      const actualUsed = memory.total - memory.available;
      const memoryUsage: MemoryUsage = {
        used: actualUsed,
        total: memory.total,
        percentage: parseFloat(((actualUsed / memory.total) * 100).toFixed(2))
      };

      // 获取主磁盘信息（通常是第一个磁盘）
      const mainDisk = disk[0] || { size: 0, used: 0, use: 0 };
      const diskUsage: DiskUsage = {
        used: mainDisk.used,
        total: mainDisk.size,
        percentage: parseFloat(mainDisk.use.toFixed(2))
      };

      return {
        cpuUsage: parseFloat(load.currentLoad.toFixed(2)),
        memoryUsage,
        diskUsage
      };
    } catch (error) {
      logger.error('获取性能数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统负载
   */
  async getSystemLoad(): Promise<string> {
    try {
      const load = await si.currentLoad();
      return load.avgLoad.toFixed(2);
    } catch (error) {
      logger.error('获取系统负载失败:', error);
      throw error;
    }
  }

  /**
   * 获取详细的CPU信息
   */
  async getCpuInfo() {
    try {
      const [cpuInfo, currentLoad] = await Promise.all([
        si.cpu(),
        si.currentLoad()
      ]);

      return {
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        speed: cpuInfo.speed,
        cores: cpuInfo.cores,
        physicalCores: cpuInfo.physicalCores,
        processors: cpuInfo.processors,
        currentLoad: currentLoad.currentLoad,
        avgLoad: currentLoad.avgLoad,
        cpus: currentLoad.cpus
      };
    } catch (error) {
      logger.error('获取CPU信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取详细的内存信息
   */
  async getMemoryInfo() {
    try {
      const memory = await si.mem();
      
      return {
        total: memory.total,
        free: memory.free,
        used: memory.used,
        active: memory.active,
        available: memory.available,
        buffers: memory.buffers,
        cached: memory.cached,
        slab: memory.slab,
        buffcache: memory.buffcache,
        swaptotal: memory.swaptotal,
        swapused: memory.swapused,
        swapfree: memory.swapfree
      };
    } catch (error) {
      logger.error('获取内存信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取磁盘信息
   */
  async getDiskInfo() {
    try {
      const [fsSize, diskLayout, blockDevices] = await Promise.all([
        si.fsSize(),
        si.diskLayout(),
        si.blockDevices()
      ]);

      return {
        filesystems: fsSize,
        disks: diskLayout,
        blockDevices
      };
    } catch (error) {
      logger.error('获取磁盘信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取网络信息
   */
  async getNetworkInfo() {
    try {
      const [networkInterfaces, networkStats] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats()
      ]);

      return {
        interfaces: networkInterfaces,
        stats: networkStats
      };
    } catch (error) {
      logger.error('获取网络信息失败:', error);
      throw error;
    }
  }
}
