import { Request, Response, NextFunction } from 'express';
import { generateSql as generateSqlService } from '../services/llm.service';
import { executeSql as executeSqlService } from '../services/execution.service';

export const generateSql = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question } = req.body;
        const sql = await generateSqlService(question);
        res.json({ sql });
    } catch (error) {
        next(error);
    }
};

export const executeSql = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sql } = req.body;
        const result = await executeSqlService(sql);
        res.json({ result });
    } catch (error) {
        next(error);
    }
};
