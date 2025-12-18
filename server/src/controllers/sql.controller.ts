import { Request, Response, NextFunction } from 'express';
import { generateSql as generateSqlService } from '../services/llm.service';
import { executeSql as executeSqlService } from '../services/execution.service';

export const generateSql = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question } = req.body;
        console.log(`📝 [GENERATE] Question: "${question}"`);
        const sql = await generateSqlService(question);
        console.log(`✅ [GENERATE] SQL generated successfully`);
        res.json({ sql });
    } catch (error) {
        console.error(`❌ [GENERATE] Error:`, error);
        next(error);
    }
};

export const executeSql = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sql } = req.body;
        console.log(`🔄 [EXECUTE] SQL: ${sql.substring(0, 100)}...`);
        const result = await executeSqlService(sql);
        console.log(`✅ [EXECUTE] Query executed successfully, returned ${result.data?.length || 0} rows`);
        res.json({ result });
    } catch (error) {
        console.error(`❌ [EXECUTE] Error:`, error);
        next(error);
    }
};
