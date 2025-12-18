/**
 * Environment Variable Validator
 * Validates and loads required environment variables on startup
 */

interface EnvConfig {
    PORT: number;
    EXTERNAL_DB_URL: string;
    GEMINI_API_KEY: string;
    NODE_ENV: 'development' | 'production' | 'test';
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    CORS_ALLOWED_ORIGINS: string[];
    EXTERNAL_DB_COOKIES?: string;
}

export const validateAndLoadEnv = (): EnvConfig => {
    const errors: string[] = [];

    // Check required environment variables
    const requiredVars = ['GEMINI_API_KEY', 'EXTERNAL_DB_URL'];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    }

    // Validate GEMINI_API_KEY format (basic check)
    if (process.env.GEMINI_API_KEY) {
        if (process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            errors.push('GEMINI_API_KEY is set to placeholder value. Please update with actual API key.');
        }
        if (process.env.GEMINI_API_KEY.length < 20) {
            errors.push('GEMINI_API_KEY appears to be invalid (too short)');
        }
    }

    // Validate EXTERNAL_DB_URL format
    if (process.env.EXTERNAL_DB_URL) {
        try {
            new URL(process.env.EXTERNAL_DB_URL);
        } catch {
            errors.push('EXTERNAL_DB_URL is not a valid URL');
        }
    }

    // If there are errors, throw and prevent startup
    if (errors.length > 0) {
        console.error('❌ Environment validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPlease check your .env file. See .env.example for reference.');
        throw new Error('Environment validation failed');
    }

    // Parse and return configuration
    const config: EnvConfig = {
        PORT: parseInt(process.env.PORT || '3001', 10),
        EXTERNAL_DB_URL: process.env.EXTERNAL_DB_URL!,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
        NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
        RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS
            ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
            : ['http://localhost:3000'],
        EXTERNAL_DB_COOKIES: process.env.EXTERNAL_DB_COOKIES
    };

    console.log('✅ Environment validation passed');
    console.log(`📝 Environment: ${config.NODE_ENV}`);
    console.log(`🚀 Server will run on port: ${config.PORT}`);

    return config;
};
