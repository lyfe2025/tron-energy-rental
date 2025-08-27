/**
 * 能量包业务逻辑服务
 * 
 * 提供能量包相关的核心业务逻辑
 * 协调数据访问层和验证层，实现完整的业务流程
 */

import { EnergyPackagesValidation } from '../controllers/energyPackagesValidation.js';
import type {
    BatchOperationResult,
    BatchPriceUpdateRequest,
    CreateEnergyPackageRequest,
    DuplicatePackageRequest,
    EnergyPackage,
    EnergyPackageOverview,
    EnergyPackageQuery,
    EnergyPackageWithStats,
    PaginatedEnergyPackages,
    UpdateEnergyPackageRequest,
    UpdatePackageStatusRequest
} from '../types/energyPackages.types.js';
import { EnergyPackagesRepository } from './energyPackagesRepository.js';

export class EnergyPackagesService {
  private repository: EnergyPackagesRepository;

  constructor() {
    this.repository = new EnergyPackagesRepository();
  }

  /**
   * 获取能量包列表
   */
  async getEnergyPackages(params: EnergyPackageQuery): Promise<PaginatedEnergyPackages> {
    // 验证查询参数
    const paginationValidation = EnergyPackagesValidation.validatePaginationParams(params.page, params.limit);
    if (!paginationValidation.valid) {
      throw new Error(paginationValidation.errors.join(', '));
    }

    if (params.search) {
      const searchValidation = EnergyPackagesValidation.validateSearchParams(params.search);
      if (!searchValidation.valid) {
        throw new Error(searchValidation.errors.join(', '));
      }
    }

    const energyValidation = EnergyPackagesValidation.validateEnergyRange(params.min_energy, params.max_energy);
    if (!energyValidation.valid) {
      throw new Error(energyValidation.errors.join(', '));
    }

    const priceValidation = EnergyPackagesValidation.validatePriceRange(params.min_price, params.max_price);
    if (!priceValidation.valid) {
      throw new Error(priceValidation.errors.join(', '));
    }

    return await this.repository.getEnergyPackages(params);
  }

  /**
   * 获取单个能量包详情
   */
  async getPackageById(id: number): Promise<EnergyPackage> {
    const idValidation = EnergyPackagesValidation.validateId(id);
    if (!idValidation.valid) {
      throw new Error(idValidation.errors.join(', '));
    }

    const energyPackage = await this.repository.getPackageById(id);
    if (!energyPackage) {
      throw new Error('能量包不存在');
    }

    return energyPackage;
  }

  /**
   * 获取能量包详情（包含统计信息）
   */
  async getPackageWithStats(id: number): Promise<EnergyPackageWithStats> {
    const idValidation = EnergyPackagesValidation.validateId(id);
    if (!idValidation.valid) {
      throw new Error(idValidation.errors.join(', '));
    }

    const packageWithStats = await this.repository.getPackageWithStats(id);
    if (!packageWithStats) {
      throw new Error('能量包不存在');
    }

    return packageWithStats;
  }

  /**
   * 创建新能量包
   */
  async createPackage(packageData: CreateEnergyPackageRequest): Promise<EnergyPackage> {
    // 验证请求数据
    const validation = EnergyPackagesValidation.validateCreateRequest(packageData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // 检查名称是否已存在
    const nameConflict = await this.repository.checkNameConflict(packageData.name);
    if (nameConflict.hasConflict) {
      throw new Error('该能量包名称已存在');
    }

    return await this.repository.createPackage(packageData);
  }

  /**
   * 更新能量包信息
   */
  async updatePackage(id: number, updateData: UpdateEnergyPackageRequest): Promise<EnergyPackage> {
    // 验证ID和更新数据
    const idValidation = EnergyPackagesValidation.validateId(id);
    if (!idValidation.valid) {
      throw new Error(idValidation.errors.join(', '));
    }

    const validation = EnergyPackagesValidation.validateUpdateRequest(updateData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // 检查能量包是否存在
    const existenceCheck = await this.repository.checkPackageExists(id);
    if (!existenceCheck.exists) {
      throw new Error('能量包不存在');
    }

    // 检查名称冲突（如果更新了名称）
    if (updateData.name) {
      const nameConflict = await this.repository.checkNameConflict(updateData.name, id);
      if (nameConflict.hasConflict) {
        throw new Error('该名称已被其他能量包使用');
      }
    }

    // 检查是否有实际更新
    if (Object.keys(updateData).length === 0) {
      throw new Error('没有提供要更新的字段');
    }

    return await this.repository.updatePackage(id, updateData);
  }

  /**
   * 更新能量包状态
   */
  async updatePackageStatus(id: number, statusData: UpdatePackageStatusRequest): Promise<EnergyPackage> {
    // 验证ID和状态值
    const idValidation = EnergyPackagesValidation.validateId(id);
    if (!idValidation.valid) {
      throw new Error(idValidation.errors.join(', '));
    }

    const statusValidation = EnergyPackagesValidation.validateStatus(statusData.is_active);
    if (!statusValidation.valid) {
      throw new Error(statusValidation.errors.join(', '));
    }

    // 检查能量包是否存在
    const existenceCheck = await this.repository.checkPackageExists(id);
    if (!existenceCheck.exists) {
      throw new Error('能量包不存在');
    }

    return await this.repository.updatePackageStatus(id, statusData.is_active);
  }

  /**
   * 批量更新能量包价格
   */
  async batchUpdatePrices(batchData: BatchPriceUpdateRequest): Promise<BatchOperationResult> {
    // 验证批量更新请求
    const validation = EnergyPackagesValidation.validateBatchPriceUpdateRequest(batchData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const updatedPackages = await this.repository.batchUpdatePrices(batchData.updates);
    const successCount = updatedPackages.length;

    // 构建结果
    const results = batchData.updates.map(update => {
      const updated = updatedPackages.find(pkg => pkg.id === update.id);
      return {
        id: update.id,
        success: !!updated,
        package: updated,
        error: updated ? undefined : '更新失败或能量包不存在'
      };
    });

    return {
      results,
      summary: {
        total: batchData.updates.length,
        success: successCount,
        failed: batchData.updates.length - successCount
      }
    };
  }

  /**
   * 删除能量包
   */
  async deletePackage(id: number): Promise<void> {
    // 验证ID
    const idValidation = EnergyPackagesValidation.validateId(id);
    if (!idValidation.valid) {
      throw new Error(idValidation.errors.join(', '));
    }

    // 检查能量包是否存在
    const existenceCheck = await this.repository.checkPackageExists(id);
    if (!existenceCheck.exists) {
      throw new Error('能量包不存在');
    }

    // 检查是否有关联订单
    const hasOrders = await this.repository.checkPackageHasOrders(id);
    if (hasOrders) {
      throw new Error('该能量包有关联的订单，不能删除。请先处理相关订单或将能量包设为禁用状态。');
    }

    await this.repository.deletePackage(id);
  }

  /**
   * 复制能量包
   */
  async duplicatePackage(id: number, duplicateData: DuplicatePackageRequest): Promise<EnergyPackage> {
    // 验证ID
    const idValidation = EnergyPackagesValidation.validateId(id);
    if (!idValidation.valid) {
      throw new Error(idValidation.errors.join(', '));
    }

    // 检查原能量包是否存在
    const existenceCheck = await this.repository.checkPackageExists(id);
    if (!existenceCheck.exists) {
      throw new Error('原能量包不存在');
    }

    const nameSuffix = duplicateData.name_suffix || '_副本';
    const newName = existenceCheck.package!.name + nameSuffix;

    // 检查新名称是否已存在
    const nameConflict = await this.repository.checkNameConflict(newName);
    if (nameConflict.hasConflict) {
      throw new Error('复制后的名称已存在，请使用不同的后缀');
    }

    return await this.repository.duplicatePackage(id, newName);
  }

  /**
   * 获取能量包统计概览
   */
  async getPackageOverview(): Promise<EnergyPackageOverview> {
    return await this.repository.getPackageOverview();
  }
}
