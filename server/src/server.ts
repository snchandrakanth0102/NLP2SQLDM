// Load environment variables FIRST using require (before ES6 imports)
require('dotenv').config();

import app from './app';
import { validateAndLoadEnv } from './utils/env-validator';

// Validate environment variables before starting server
const config = validateAndLoadEnv();

app.listen(config.PORT, () => {
    console.log(`🚀 Server running on port ${config.PORT}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
    console.log(`🔒 Rate limiting: ${config.RATE_LIMIT_MAX_REQUESTS} requests per ${config.RATE_LIMIT_WINDOW_MS / 60000} minutes`);
});
