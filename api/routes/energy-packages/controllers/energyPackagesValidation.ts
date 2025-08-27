/**
 * 能量包验证控制器
 * 
 * 提供能量包相关的请求验证功能
 * 包括参数验证、数据格式验证和业务规则验证
 */

import type {
    BatchPriceUpdateRequest,
    CreateEnergyPackageRequest,
    PackageValidationResult,
    UpdateEnergyPackageRequest
} from '../types/energyPackages.types.js';

export class EnergyPackagesValidation {
  /**
   * 验证创建能量包请求
   */
  static validateCreateRequest(data: CreateEnergyPackageRequest): PackageValidationResult {
    const errors: string[] = [];

    // 验证必填字段
    if (!data.name || data.name.trim() === '') {
      errors.push('能量包名称不能为空');
    }

    if (data.energy_amount === undefined || data.energy_amount === null) {
      errors.push('能量数量不能为空');
    }

    if (data.price === undefined || data.price === null) {
      errors.push('价格不能为空');
    }

    // 验证数值字段
    if (data.energy_amount !== undefined && Number(data.energy_amount) <= 0) {
      errors.push('能量数量必须大于0');
    }

    if (data.price !== undefined && Number(data.price) <= 0) {
      errors.push('价格必须大于0');
    }

    if (data.duration_hours !== undefined && Number(data.duration_hours) <= 0) {
      errors.push('持续时间必须大于0小时');
    }

    // 验证名称长度
    if (data.name && data.name.length > 100) {
      errors.push('能量包名称不能超过100个字符');
    }

    // 验证描述长度
    if (data.description && data.description.length > 500) {
      errors.push('描述不能超过500个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证更新能量包请求
   */
  static validateUpdateRequest(data: UpdateEnergyPackageRequest): PackageValidationResult {
    const errors: string[] = [];

    // 验证数值字段
    if (data.energy_amount !== undefined && Number(data.energy_amount) <= 0) {
      errors.push('能量数量必须大于0');
    }

    if (data.price !== undefined && Number(data.price) <= 0) {
      errors.push('价格必须大于0');
    }

    if (data.duration_hours !== undefined && Number(data.duration_hours) <= 0) {
      errors.push('持续时间必须大于0小时');
    }

    // 验证名称长度
    if (data.name && data.name.length > 100) {
      errors.push('能量包名称不能超过100个字符');
    }

    // 验证描述长度
    if (data.description && data.description.length > 500) {
      errors.push('描述不能超过500个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证批量价格更新请求
   */
  static validateBatchPriceUpdateRequest(data: BatchPriceUpdateRequest): PackageValidationResult {
    const errors: string[] = [];

    if (!data.updates || !Array.isArray(data.updates)) {
      errors.push('updates字段必须是数组');
      return { valid: false, errors };
    }

    if (data.updates.length === 0) {
      errors.push('updates字段不能为空');
      return { valid: false, errors };
    }

    if (data.updates.length > 100) {
      errors.push('批量更新不能超过100个能量包');
    }

    // 验证每个更新项
    data.updates.forEach((update, index) => {
      if (!update.id || !update.price || Number(update.price) <= 0) {
        errors.push(`第${index + 1}个更新项必须包含有效的id和price字段`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证分页参数
   */
  static validatePaginationParams(page?: any, limit?: any): PackageValidationResult {
    const errors: string[] = [];

    if (page !== undefined) {
      const pageNum = Number(page);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('页码必须是大于0的整数');
      }
    }

    if (limit !== undefined) {
      const limitNum = Number(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push('每页数量必须是1-100之间的整数');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证搜索参数
   */
  static validateSearchParams(search?: string): PackageValidationResult {
    const errors: string[] = [];

    if (search && search.length > 100) {
      errors.push('搜索关键词不能超过100个字符');
    }

    if (search && search.trim().length < 2) {
      errors.push('搜索关键词至少需要2个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证能量范围参数
   */
  static validateEnergyRange(minEnergy?: any, maxEnergy?: any): PackageValidationResult {
    const errors: string[] = [];

    if (minEnergy !== undefined) {
      const min = Number(minEnergy);
      if (isNaN(min) || min < 0) {
        errors.push('最小能量值必须是非负数');
      }
    }

    if (maxEnergy !== undefined) {
      const max = Number(maxEnergy);
      if (isNaN(max) || max < 0) {
        errors.push('最大能量值必须是非负数');
      }
    }

    if (minEnergy !== undefined && maxEnergy !== undefined) {
      if (Number(minEnergy) > Number(maxEnergy)) {
        errors.push('最小能量值不能大于最大能量值');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证价格范围参数
   */
  static validatePriceRange(minPrice?: any, maxPrice?: any): PackageValidationResult {
    const errors: string[] = [];

    if (minPrice !== undefined) {
      const min = Number(minPrice);
      if (isNaN(min) || min < 0) {
        errors.push('最小价格必须是非负数');
      }
    }

    if (maxPrice !== undefined) {
      const max = Number(maxPrice);
      if (isNaN(max) || max < 0) {
        errors.push('最大价格必须是非负数');
      }
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      if (Number(minPrice) > Number(maxPrice)) {
        errors.push('最小价格不能大于最大价格');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证ID参数
   */
  static validateId(id: any): PackageValidationResult {
    const errors: string[] = [];

    if (!id) {
      errors.push('ID不能为空');
    } else {
      const idNum = Number(id);
      if (isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
        errors.push('ID必须是正整数');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证状态值
   */
  static validateStatus(isActive: any): PackageValidationResult {
    const errors: string[] = [];

    if (typeof isActive !== 'boolean') {
      errors.push('is_active字段必须是布尔值');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
