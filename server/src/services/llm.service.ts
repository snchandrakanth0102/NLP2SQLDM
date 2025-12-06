import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSchemaContext } from './rag.service';
import { validateSqlSyntax } from './guardrails.service';
import { formatSqlCasing } from './execution.service';
import { semanticCache } from './semantic-cache.service';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export const generateSql = async (question: string): Promise<string> => {
    // Ensure API key is present
    if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('Gemini API key is not configured. Please check your .env file.');
    }

    // 1. Check Semantic Cache
    const cachedSql = await semanticCache.findSimilar(question);
    if (cachedSql) {
        return cachedSql;
    }

    const schema = getSchemaContext();
    const prompt = `
    ${schema}
    
    User Question: ${question}
    
    Generate a SQL query to answer the user's question.
    Follow the CRITICAL RULES provided above.
    If the user asks for specific details, do NOT aggregate.
    Format the SQL with newlines and indentation for readability. Do NOT write the query on a single line.
    
    CRITICAL FORMATTING RULES - LETTER CASING:
    - SQL Keywords MUST be UPPERCASE: SELECT, FROM, WHERE, JOIN, ON, AND, OR, GROUP BY, ORDER BY, HAVING, LIMIT, FETCH, AS, INNER, LEFT, RIGHT, OUTER
    - Table names MUST be lowercase: application_user, claim, recognition_claim, claim_item, claim_recipient
    - Column names MUST be lowercase: user_id, first_name, last_name, claim_id, user_name, user_type
    
    CORRECT EXAMPLE:
    SELECT user_id, first_name, last_name
    FROM application_user
    WHERE user_id = 123
    
    WRONG EXAMPLE (DO NOT DO THIS):
    SELECT USER_ID, FIRST_NAME, LAST_NAME
    FROM application_user
    WHERE USER_ID = 123
    
    CRITICAL: Column names like user_id, first_name, last_name MUST be lowercase, NOT USER_ID, FIRST_NAME, LAST_NAME.
    
    - Always include row limiting (FETCH FIRST 25 ROWS ONLY) unless the query already has LIMIT or FETCH.
    
    Return ONLY the SQL query. No markdown, no explanations.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
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

        return text;
    } catch (error) {
        console.error('Error calling Gemini:', error);
        throw new Error('Failed to generate SQL from LLM.');
    }
};
