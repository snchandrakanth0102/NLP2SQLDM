import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

export const generateInsights = async (sql: string, resultData: any[]): Promise<string[]> => {
    // Fallback to mock insights if API key is missing or invalid
    if (!apiKey || apiKey === 'your_api_key_here') {
        console.warn('Using mock insights - Gemini API key not configured');
        return generateMockInsights(resultData);
    }

    const dataPreview = JSON.stringify(resultData.slice(0, 5), null, 2);
    const rowCount = resultData.length;

    const prompt = `
You are a data analyst providing actionable business insights.

SQL Query: ${sql}

Data Preview (first 5 rows of ${rowCount} total):
${dataPreview}

Generate exactly 2 actionable insights based on this data. Each insight should:
- Be specific and data-driven
- Provide a clear recommendation or observation
- Be concise (1-2 sentences each)

Return ONLY the 2 insights, one per line, without numbering or bullet points.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Split by newlines and filter out empty lines
        const insights = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 2); // Ensure exactly 2 insights

        return insights.length === 2 ? insights : generateMockInsights(resultData);
    } catch (error) {
        console.error('Error generating insights:', error);
        return generateMockInsights(resultData);
    }
};

function generateMockInsights(resultData: any[]): string[] {
    const rowCount = resultData.length;

    if (rowCount === 0) {
        return [
            'No data available to generate insights.',
            'Consider adjusting your query parameters to retrieve results.'
        ];
    }

    // Check if data has numeric values
    const hasNumericData = resultData.some(row =>
        Object.values(row).some(val => typeof val === 'number')
    );

    if (hasNumericData) {
        return [
            `The dataset contains ${rowCount} records with quantifiable metrics that could be analyzed for trends.`,
            'Consider segmenting this data by time periods or categories to identify patterns and opportunities.'
        ];
    }

    return [
        `Your query returned ${rowCount} records for analysis.`,
        'Review the data distribution to identify any outliers or patterns that may require attention.'
    ];
}
