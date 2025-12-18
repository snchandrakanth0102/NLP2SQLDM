import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSchemaContext } from './rag.service';
import { validateSqlSyntax } from './guardrails.service';
import { formatSqlCasing } from './execution.service';
import { semanticCache } from './semantic-cache.service';
import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Use gemini-2.5-flash-lite for better availability and speed
// Falls back to gemini-2.0-flash if needed
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// ---- Retry Logic ----
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const is503 = error.status === 503;
            const isLastAttempt = attempt === maxRetries;

            if (is503 && !isLastAttempt) {
                const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
                console.warn(
                    `⚠️  API overloaded (503). Retrying in ${delayMs}ms... (attempt ${attempt}/${maxRetries})`
                );
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

// ---- Token Logger ----
function logTokens(modelName: string, usage: any) {
    if (!usage) return;
    const log = `
Time: ${new Date().toISOString()}
Model: ${modelName}
Prompt Tokens: ${usage.promptTokenCount}
Response Tokens: ${usage.candidatesTokenCount}
Total Tokens: ${usage.totalTokenCount}
-----------------------------------------------------
`;
    try {
        const logPath = path.join(process.cwd(), 'google_token_logs.txt');
        fs.appendFileSync(logPath, log);
        console.log(`📝 logged to ${logPath}`);
    } catch (err) {
        console.error('Failed to write token logs:', err);
    }
}

export const generateSql = async (question: string): Promise<string> => {
    // Ensure API key is present
    if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('Gemini API key is not configured. Please check your .env file.');
    }

    // 1. Check Semantic Cache
    const cachedSql = await semanticCache.findSimilar(question);
    if (cachedSql) {
        //logTokens('CACHE_HIT', { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 });
        return cachedSql;
    }

    const schema = getSchemaContext();
    const prompt = `
    ${schema}
    
    User Question: ${question}
    Generate an Oracle Database–compatible SQL query to answer the user’s question.

Follow the CRITICAL RULES below strictly.

If the user asks for specific details, DO NOT aggregate.

Format the SQL with newlines and indentation for readability.

DO NOT write the query on a single line.

Use Oracle SQL syntax only.

CRITICAL FORMATTING RULES – LETTER CASING:

SQL keywords MUST be UPPERCASE
Examples:
SELECT, FROM, WHERE, JOIN, ON, AND, OR, GROUP BY, ORDER BY, HAVING, FETCH, AS, INNER, LEFT, RIGHT, OUTER

Table names MUST be lowercase
application_user, claim, recognition_claim, claim_item, claim_recipient

TABLE ALIASES: Do NOT use the "AS" keyword for table aliases (e.g., use "application_user au", NOT "application_user AS au").

Column names MUST be lowercase
user_id, first_name, last_name, claim_id, user_name, user_type

ORACLE-SPECIFIC RULES (MANDATORY):

Use FETCH FIRST n ROWS ONLY or ROWNUM for row limiting

DO NOT use LIMIT

DO NOT use database-specific syntax from MySQL or PostgreSQL

Subqueries with ordering must follow Oracle rules

CORRECT EXAMPLES (ORACLE):

SELECT *
FROM (
SELECT
au.user_id,
au.first_name,
au.last_name,
COUNT(cr.claim_item_id) AS recognition_count
FROM application_user au
JOIN claim_recipient cr
ON au.user_id = cr.participant_id
GROUP BY
au.user_id,
au.first_name,
au.last_name
ORDER BY recognition_count DESC
)
WHERE ROWNUM <= 10

WRONG EXAMPLES (DO NOT DO THIS):

SELECT USER_ID, FIRST_NAME, LAST_NAME
FROM application_user
WHERE USER_ID = 123

SELECT
au.user_id,
au.first_name,
au.last_name,
count(cr.claim_item_id) AS recognition_count
FROM application_user AS au
JOIN claim_recipient AS cr
ON au.user_id = cr.participant_id
GROUP BY
au.user_id,
au.first_name,
au.last_name
ORDER BY
recognition_count DESC
LIMIT 10

CRITICAL:

Column names like user_id, first_name, last_name MUST be lowercase

Always include row limiting using
FETCH FIRST 25 ROWS ONLY
unless a FETCH or ROWNUM condition already exists

Return ONLY the SQL query

NO markdown

NO explanations
  `;

    try {
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const response = await result.response;

        // Log usage
        if (response.usageMetadata) {
            logTokens('gemini-2.5-flash-lite', response.usageMetadata);
        }

        let text = response.text();

        // Clean up potential markdown code blocks if the model ignores the instruction
        text = text.replace(/```sql/g, '').replace(/```/g, '').trim();

        // Format SQL to enforce proper casing (post-processing to guarantee correct format)
        text = formatSqlCasing(text);

        // Validate the generated SQL
        const validation = validateSqlSyntax(text);

        if (!validation.isValid) {
            console.error('Generated SQL failed validation:', validation.errors);
            throw new Error(`Generated SQL is invalid: ${validation.errors.join(', ')}`);
        }

        // Log warnings if any
        if (validation.warnings.length > 0) {
            console.warn('SQL validation warnings:', validation.warnings);
        }

        // Cache the successful result
        await semanticCache.cacheResult(question, text);
        console.log('✅ Generated SQL cached successfully', text);
        return text;
    } catch (error: any) {
        console.error('Error calling Gemini:', error);
        // Expose the real error message for debugging
        const errorMessage = error.message || 'Unknown error from Gemini API';
        throw new Error(`Failed to generate SQL: ${errorMessage}`);
    }
};
