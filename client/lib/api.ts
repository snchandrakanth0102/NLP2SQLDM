import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api',
});

export interface GenerateSqlResponse {
    sql: string;
}

export interface ExecuteSqlResponse {
    result: {
        type: 'scalar' | 'aggregation' | 'table';
        data: any[];
        visualizationType: 'metric' | 'bar' | 'table';
    };
}

export interface InsightsResponse {
    insights: string[];
}

export const generateSql = async (question: string): Promise<GenerateSqlResponse> => {
    const response = await api.post<GenerateSqlResponse>('/generate', { question });
    return response.data;
};

export const executeSql = async (sql: string): Promise<ExecuteSqlResponse> => {
    const response = await api.post<ExecuteSqlResponse>('/execute', { sql });
    return response.data;
};

export const generateInsights = async (sql: string, resultData: any[]): Promise<InsightsResponse> => {
    const response = await api.post<InsightsResponse>('/insights', { sql, resultData });
    return response.data;
};

