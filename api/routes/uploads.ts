import { Router } from 'express'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { authenticateToken, requireRole } from '../middleware/auth'
import { getProjectPath } from '../utils/logger/core/project-root'

const router: Router = Router()

// 确保上传目录存在
// 使用项目根目录的绝对路径，避免工作目录变化导致的路径问题
const uploadDir = getProjectPath('public/uploads/price-configs')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳_随机数.扩展名
    const timestamp = Date.now()
    const randomNum = Math.round(Math.random() * 1000)
    const ext = path.extname(file.originalname)
    const filename = `price-config-${timestamp}-${randomNum}${ext}`
    cb(null, filename)
  }
})

// 文件过滤器
const fileFilter = (req: any, file: any, cb: any) => {
  // 检查文件类型
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('只支持图片文件 (JPEG, JPG, PNG, GIF, WEBP)'))
  }
}

// 配置 multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  },
  fileFilter: fileFilter
})

// 上传图片接口
router.post('/image', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  upload.single('image'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '没有上传文件'
        })
      }

      // 构建文件URL
      const fileUrl = `/uploads/price-configs/${req.file.filename}`
      
      res.json({
        success: true,
        message: '图片上传成功',
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          url: fileUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${fileUrl}`
        }
      })
    } catch (error) {
      console.error('Upload error:', error)
      res.status(500).json({
        success: false,
        error: '图片上传失败',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

// 删除图片接口
router.delete('/image/:filename',
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  (req, res) => {
    try {
      const filename = req.params.filename
      const filePath = path.join(uploadDir, filename)

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: '文件不存在'
        })
      }

      // 删除文件
      fs.unlinkSync(filePath)

      res.json({
        success: true,
        message: '图片删除成功'
      })
    } catch (error) {
      console.error('Delete error:', error)
      res.status(500).json({
        success: false,
        error: '图片删除失败',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

// 获取上传的图片列表
router.get('/images',
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  (req, res) => {
    try {
      const files = fs.readdirSync(uploadDir)
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
      })

      const images = imageFiles.map(filename => {
        const filePath = path.join(uploadDir, filename)
        const stats = fs.statSync(filePath)
        const fileUrl = `/uploads/price-configs/${filename}`
        
        return {
          filename,
          url: fileUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${fileUrl}`,
          size: stats.size,
          uploadTime: stats.ctime
        }
      })

      res.json({
        success: true,
        data: images.sort((a, b) => b.uploadTime.getTime() - a.uploadTime.getTime())
      })
    } catch (error) {
      console.error('List images error:', error)
      res.status(500).json({
        success: false,
        error: '获取图片列表失败',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

export default router
