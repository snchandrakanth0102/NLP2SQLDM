import { Router } from 'express';
import { generateSql, executeSql } from '../controllers/sql.controller';
import { getInsights } from '../controllers/insights.controller';
import { getCacheStats, clearCache } from '../controllers/cache.controller';
import { validateQuestion, validateGeneratedSql } from '../middleware/validation.middleware';

const router = Router();

// SQL Generation
router.post('/generate', validateQuestion, generateSql);

// SQL Execution
router.post('/execute', validateGeneratedSql, executeSql);

// Insights
router.post('/insights', getInsights);

// Cache Management
router.get('/cache/stats', getCacheStats);
router.delete('/cache', clearCache);

export default router;
