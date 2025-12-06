import { Request, Response, NextFunction } from 'express';
import { validateInput as validateInputService, validateSql as validateSqlService } from '../services/guardrails.service';

export const validateQuestion = (req: Request, res: Response, next: NextFunction) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }
    const validation = validateInputService(question);
    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }
    next();
};

export const validateGeneratedSql = (req: Request, res: Response, next: NextFunction) => {
    const { sql } = req.body;
    if (!sql) {
        return res.status(400).json({ error: 'SQL query is required' });
    }
    const validation = validateSqlService(sql);
    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }
    next();
};
