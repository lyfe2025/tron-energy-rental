/**
 * Telegram机器人消息模板控制器
 * 处理消息模板的获取、创建、更新和删除操作
 */

import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import type {
    CreateTemplateRequest,
    CreateTemplateResponse,
    GetTemplatesResponse,
    UpdateTemplateRequest,
    UpdateTemplateResponse
} from '../../../services/telegram-bot/types/notification.types.js';

/**
 * 获取消息模板列表
 * GET /api/telegram-bot-notifications/:botId/templates
 */
export async function getTemplates(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const category = req.query.category as string;
    const language = (req.query.language as string) || 'zh';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');

    let whereClause = 'WHERE bot_id = $1';
    const params: any[] = [botId];
    let paramIndex = 2;

    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (language) {
      whereClause += ` AND language = $${paramIndex}`;
      params.push(language);
      paramIndex++;
    }

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM telegram_message_templates ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取模板数据
    const offset = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
    const templatesResult = await query(`
      SELECT * FROM telegram_message_templates 
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const response: GetTemplatesResponse = {
      success: true,
      data: {
        templates: templatesResult.rows,
        total,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString())
      }
    };

    res.json(response);

  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取模板列表失败',
      error: error.message
    });
  }
}

/**
 * 创建消息模板
 * POST /api/telegram-bot-notifications/:botId/templates
 */
export async function createTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { template } = req.body as CreateTemplateRequest;
    const userId = req.user?.id;

    // 验证必填字段
    if (!template.name || !template.type || !template.content) {
      res.status(400).json({
        success: false,
        message: '模板名称、类型和内容为必填项'
      });
      return;
    }

    // 检查同类型默认模板是否已存在
    if (template.is_default) {
      const existingDefault = await query(
        'SELECT id FROM telegram_message_templates WHERE bot_id = $1 AND type = $2 AND language = $3 AND is_default = true',
        [botId, template.type, template.language || 'zh']
      );

      if (existingDefault.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该类型已存在默认模板，请先取消现有默认模板'
        });
        return;
      }
    }

    // 创建模板
    const result = await query(`
      INSERT INTO telegram_message_templates (
        bot_id, name, type, category, language, content, parse_mode,
        buttons, variables, description, tags, is_active, is_default, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `, [
      botId,
      template.name,
      template.type,
      template.category || 'business',
      template.language || 'zh',
      template.content,
      template.parse_mode || 'Markdown',
      JSON.stringify(template.buttons || []),
      JSON.stringify(template.variables || []),
      template.description || '',
      template.tags || '',
      template.is_active !== false,
      template.is_default || false,
      userId
    ]);

    const response: CreateTemplateResponse = {
      success: true,
      template_id: result.rows[0].id,
      message: '模板创建成功'
    };

    res.json(response);

  } catch (error) {
    console.error('创建模板失败:', error);
    res.status(500).json({
      success: false,
      message: '创建模板失败',
      error: error.message
    });
  }
}

/**
 * 更新消息模板
 * PUT /api/telegram-bot-notifications/templates/:templateId
 */
export async function updateTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { templateId } = req.params;
    const { template } = req.body as UpdateTemplateRequest;

    // 验证模板是否存在
    const existingTemplate = await query(
      'SELECT * FROM telegram_message_templates WHERE id = $1',
      [templateId]
    );

    if (existingTemplate.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '模板不存在'
      });
      return;
    }

    // 构建更新语句
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (template.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(template.name);
      paramIndex++;
    }

    if (template.content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      params.push(template.content);
      paramIndex++;
    }

    if (template.parse_mode !== undefined) {
      updates.push(`parse_mode = $${paramIndex}`);
      params.push(template.parse_mode);
      paramIndex++;
    }

    if (template.buttons !== undefined) {
      updates.push(`buttons = $${paramIndex}`);
      params.push(JSON.stringify(template.buttons));
      paramIndex++;
    }

    if (template.variables !== undefined) {
      updates.push(`variables = $${paramIndex}`);
      params.push(JSON.stringify(template.variables));
      paramIndex++;
    }

    if (template.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(template.description);
      paramIndex++;
    }

    if (template.tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(template.tags);
      paramIndex++;
    }

    if (template.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(template.is_active);
      paramIndex++;
    }

    if (template.is_default !== undefined) {
      // 如果设置为默认模板，需要先取消同类型的其他默认模板
      if (template.is_default) {
        const current = existingTemplate.rows[0];
        await query(
          'UPDATE telegram_message_templates SET is_default = false WHERE bot_id = $1 AND type = $2 AND language = $3 AND id != $4',
          [current.bot_id, current.type, current.language, templateId]
        );
      }
      
      updates.push(`is_default = $${paramIndex}`);
      params.push(template.is_default);
      paramIndex++;
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }

    // 执行更新
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    await query(
      `UPDATE telegram_message_templates SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      [...params, templateId]
    );

    const response: UpdateTemplateResponse = {
      success: true,
      message: '模板更新成功'
    };

    res.json(response);

  } catch (error) {
    console.error('更新模板失败:', error);
    res.status(500).json({
      success: false,
      message: '更新模板失败',
      error: error.message
    });
  }
}

/**
 * 删除消息模板
 * DELETE /api/telegram-bot-notifications/templates/:templateId
 */
export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { templateId } = req.params;

    // 检查模板是否被使用
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM telegram_notification_logs WHERE template_id = $1',
      [templateId]
    );

    const usageCount = parseInt(usageCheck.rows[0].count);
    if (usageCount > 0) {
      res.status(400).json({
        success: false,
        message: `模板正在被使用，无法删除（已使用${usageCount}次）`
      });
      return;
    }

    // 删除模板
    const result = await query(
      'DELETE FROM telegram_message_templates WHERE id = $1',
      [templateId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: '模板不存在'
      });
      return;
    }

    res.json({
      success: true,
      message: '模板删除成功'
    });

  } catch (error) {
    console.error('删除模板失败:', error);
    res.status(500).json({
      success: false,
      message: '删除模板失败',
      error: error.message
    });
  }
}
