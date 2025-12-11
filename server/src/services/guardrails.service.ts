export interface SqlValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export const validateInput = (input: string): { isValid: boolean; error?: string } => {
    if (input.length > 500) {
        return { isValid: false, error: 'Query too long' };
    }
    const forbiddenKeywords = ['drop', 'delete', 'truncate', 'update', 'insert', 'alter'];
    const lowerInput = input.toLowerCase();

    // Basic heuristic: if the user explicitly asks to delete/drop, block it.
    // Note: This is a simple check. The LLM might still generate such SQL if tricked, 
    // so Post-Guardrails are critical.
    if (forbiddenKeywords.some(kw => lowerInput.includes(` ${kw} `) || lowerInput.startsWith(kw))) {
        return { isValid: false, error: 'You can only view the information. Editing or making changes is not permitted.' };
    }

    return { isValid: true };
};

/**
 * Validates SQL syntax using comprehensive pattern matching
 * Note: This is not a full SQL parser - it catches common errors
 */
export const validateSqlSyntax = (sql: string): SqlValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Trim and normalize whitespace
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');

    // Check if SQL is empty
    if (!normalizedSql) {
        errors.push('SQL query is empty');
        return { isValid: false, errors, warnings };
    }

    // Check for prohibited operations (security)
    const prohibitedOperations = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
    const upperSql = normalizedSql.toUpperCase();

    for (const operation of prohibitedOperations) {
        // Use word boundaries to avoid matching substrings (e.g., 'CREATED_BY' containing 'CREATE')
        const regex = new RegExp(`\\b${operation}\\b`, 'i');
        if (regex.test(upperSql)) {
            errors.push(`Prohibited operation detected: ${operation}. Only SELECT queries are allowed.`);
        }
    }

    // Check for basic SELECT structure
    if (!upperSql.startsWith('SELECT')) {
        errors.push('Query must start with SELECT keyword');
    }

    // Check for FROM clause
    if (!upperSql.includes(' FROM ')) {
        errors.push('Query must contain a FROM clause');
    }

    // Check for balanced parentheses
    const openParens = (normalizedSql.match(/\(/g) || []).length;
    const closeParens = (normalizedSql.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
        errors.push('Unbalanced parentheses detected');
    }

    // Check for unclosed quotes
    const singleQuotes = (normalizedSql.match(/'/g) || []).length;
    const doubleQuotes = (normalizedSql.match(/"/g) || []).length;

    if (singleQuotes % 2 !== 0) {
        errors.push('Unclosed single quotes detected');
    }
    if (doubleQuotes % 2 !== 0) {
        errors.push('Unclosed double quotes detected');
    }

    // Check for multiple semicolons (potential SQL injection or multiple statements)
    const semicolonCount = (normalizedSql.match(/;/g) || []).length;
    if (semicolonCount > 1) {
        errors.push('Multiple SQL statements detected. Only single SELECT queries are allowed.');
    }

    // Warnings for best practices
    if (!upperSql.includes('FETCH') && !upperSql.includes('LIMIT') && !upperSql.includes('TOP')) {
        warnings.push('No row limit specified. Consider adding FETCH FIRST n ROWS ONLY for large datasets.');
    }

    // Check for common typos in keywords
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING'];
    for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword.replace(' ', '\\s+')}\\b`, 'i');
        if (upperSql.includes(keyword.replace(' ', ''))) {
            // Might be a typo (e.g., GROUPBY instead of GROUP BY)
            if (!regex.test(upperSql)) {
                warnings.push(`Possible typo in keyword: ${keyword}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * @deprecated Use validateSqlSyntax instead for more comprehensive validation
 */
export const validateSql = (sql: string): { isValid: boolean; error?: string } => {
    const result = validateSqlSyntax(sql);
    return {
        isValid: result.isValid,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
    };
};
