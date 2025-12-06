import { Request, Response, NextFunction } from 'express';
import { generateInsights as generateInsightsService } from '../services/insights.service';

export const getInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sql, resultData } = req.body;
        if (!sql || !resultData) {
            return res.status(400).json({ error: 'SQL and result data are required' });
        }
        const insights = await generateInsightsService(sql, resultData);
        res.json({ insights });
    } catch (error) {
        next(error);
    }
};
