
import { Request, Response } from 'express';
import { semanticCache } from '../services/semantic-cache.service';

export const getCacheStats = (req: Request, res: Response) => {
    try {
        const stats = semanticCache.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cache stats' });
    }
};

export const clearCache = (req: Request, res: Response) => {
    try {
        const result = semanticCache.clearCache();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear cache' });
    }
};
