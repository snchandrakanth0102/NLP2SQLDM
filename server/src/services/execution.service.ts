import axios from 'axios';

/**
 * Formats SQL query to enforce proper casing:
 * - SQL keywords in UPPERCASE
 * - Table and column names in lowercase
 */
export const formatSqlCasing = (sql: string): string => {
    // List of SQL keywords that should be uppercase
    const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL',
        'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
        'GROUP BY', 'ORDER BY', 'HAVING', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN',
        'ELSE', 'END', 'UNION', 'ALL', 'LIMIT', 'OFFSET', 'FETCH', 'FIRST', 'NEXT',
        'ROWS', 'ONLY', 'WITH', 'OVER', 'PARTITION'
    ];

    let formattedSql = sql;

    // Replace each keyword with uppercase version (case-insensitive)
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formattedSql = formattedSql.replace(regex, keyword.toUpperCase());
    });

    // Now convert column and table names to lowercase
    // This regex matches identifiers (words not preceded/followed by certain characters)
    // We need to be careful not to lowercase keywords we just uppercased

    // Split SQL into tokens
    const tokens = formattedSql.split(/(\s+|,|\(|\)|;)/);

    const uppercaseKeywords = new Set(keywords.map(k => k.toUpperCase()));

    const processedTokens = tokens.map(token => {
        const trimmed = token.trim();
        const upper = trimmed.toUpperCase();

        // Skip if it's whitespace, punctuation, or a keyword
        if (!trimmed || /^[,\(\);]$/.test(trimmed) || uppercaseKeywords.has(upper)) {
            return token;
        }

        // Check if it's a multi-word keyword (already uppercase)
        if (keywords.some(kw => upper === kw.toUpperCase())) {
            return token;
        }

        // If it contains a dot (table.column), lowercase both parts
        if (trimmed.includes('.')) {
            return trimmed.toLowerCase();
        }

        // If it's a number or quoted string, leave it as-is
        if (/^\d+$/.test(trimmed) || /^['"]/.test(trimmed)) {
            return token;
        }

        // Otherwise, it's likely a column/table name - lowercase it
        return trimmed.toLowerCase();
    });

    return processedTokens.join('');
};


export const executeSql = async (sql: string): Promise<any> => {
    // Log SQL execution (sanitized in production)
    if (process.env.NODE_ENV === 'development') {
        console.log('Executing SQL via external API:', sql);
    } else {
        console.log('Executing SQL query...');
    }

    const externalUrl = process.env.EXTERNAL_DB_URL; //|| 'http://localhost:8080';
    console.log(`[DEBUG] Executing SQL against: ${externalUrl}`);


    try {
        // Call external API with SQL query as 'tab' parameter
        const response = await axios.get(
            `${externalUrl}`,
            {
                params: {
                    tab: sql  // SQL query passed as query parameter
                },
                headers: {
                    'Content-Type': 'application/json',
                    // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 30000, // 30 second timeout
                // Ignore self-signed certs (often needed for internal corporate tools)
                // httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            }
        );

        // Log response (sanitized in production)
        if (process.env.NODE_ENV === 'development') {
            console.log('External API response:', response.data);
        } else {
            console.log(`Query executed successfully, returned ${Array.isArray(response.data) ? response.data.length : 0} rows`);
        }

        // Check if response is an array
        if (!Array.isArray(response.data)) {
            throw new Error('Unexpected response format from external API');
        }

        // Extract column order from SQL query to ensure correct display order
        let columnOrder: string[] = [];
        try {
            // Regex to extract columns between SELECT and FROM
            // Handles newlines and case insensitivity
            const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/is);
            if (selectMatch && selectMatch[1]) {
                const columnsPart = selectMatch[1];
                // Split by comma, but be careful with functions like COUNT(*) or aliases
                // This is a basic parser; complex nested queries might need more robust handling
                const parsedColumns = columnsPart.split(',').map(col => {
                    col = col.trim();
                    // Handle aliases (e.g., "COUNT(*) as value" -> "value")
                    const aliasMatch = col.match(/as\s+(\w+)$/i);
                    if (aliasMatch) {
                        return aliasMatch[1];
                    }
                    // Handle "table.column" -> "column"
                    const dotParts = col.split('.');
                    if (dotParts.length > 1) {
                        return dotParts[dotParts.length - 1];
                    }
                    return col;
                });

                // Match columns from SQL to actual keys in response (case-insensitive)
                if (response.data.length > 0) {
                    const availableKeys = Object.keys(response.data[0]);

                    // Create a case-insensitive lookup map
                    const keyMap = new Map<string, string>();
                    availableKeys.forEach(key => {
                        keyMap.set(key.toLowerCase(), key);
                    });

                    // Map parsed columns to actual keys
                    columnOrder = parsedColumns
                        .map(col => keyMap.get(col.toLowerCase()))
                        .filter((col): col is string => col !== undefined);

                    // If parsing failed or filtered everything out, fall back to default keys
                    if (columnOrder.length === 0) {
                        columnOrder = availableKeys;
                    }
                }
            } else {
                // Fallback if regex doesn't match
                columnOrder = response.data.length > 0 ? Object.keys(response.data[0]) : [];
            }
        } catch (e) {
            console.warn('Failed to parse column order from SQL:', e);
            columnOrder = response.data.length > 0 ? Object.keys(response.data[0]) : [];
        }

        // Normalize column names to lowercase for consistent frontend handling
        const normalizedData = response.data.map(row => {
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
                normalizedRow[key.toLowerCase()] = row[key];
            });
            return normalizedRow;
        });

        // Also normalize columnOrder to lowercase
        const normalizedColumnOrder = columnOrder.map(col => col.toLowerCase());

        // Transform response for frontend
        return {
            type: 'table',
            data: normalizedData,
            visualizationType: determineVisualizationType(normalizedData),
            columnOrder: normalizedColumnOrder
        };

    } catch (error: any) {
        console.error('❌ External API error:', error.message);
        console.error('Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            params: error.config?.params
        });

        // Provide detailed error message
        if (error.response) {
            const status = error.response.status;
            let message = `External API error: ${status}`;

            // Try to extract message if JSON
            if (typeof error.response.data === 'object' && error.response.data) {
                message = error.response.data.message || error.response.data.error || message;
            } else if (typeof error.response.data === 'string') {
                message = error.response.data;
            } else {
                // If HTML or text, handle specific common codes
                if (status === 403) message += ' (Access Forbidden - Check EXTERNAL_DB_URL and authentication)';
                if (status === 404) message += ' (Not Found - Check EXTERNAL_DB_URL)';
                if (status === 500) message += ' (Internal Server Error - Check SQL syntax)';
            }

            const err: any = new Error(message);
            err.statusCode = status; // Pass original status code if possible 
            // Note: Express error middleware might use this if typed correctly, usually it expects 'statusCode' property
            throw err;
        } else if (error.request) {
            throw new Error('No response from external API. Check if the service is running.');
        } else {
            throw new Error(error.message || 'Failed to execute SQL query');
        }
    }
};

function determineVisualizationType(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
        return 'table';
    }

    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Single row with single value → metric
    if (data.length === 1 && keys.length === 1) {
        return 'metric';
    }

    // Has 'value' field along with category/name field → bar chart
    // const hasValue = keys.includes('value') || keys.includes('total') || keys.includes('count');
    // const hasCategory = keys.includes('category') || keys.includes('name') || keys.includes('region');

    // if (hasValue && hasCategory) {
    //     return 'bar';
    // }

    // Default to table for all other cases
    return 'table';
}
