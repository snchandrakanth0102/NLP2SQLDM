# Production Deployment Guide

## ⚠️ CRITICAL: Before Deployment

### 1. Regenerate API Keys
Your Gemini API key was previously exposed and must be regenerated:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Delete the old API key: `AIzaSyCDSMneHda3eg2OK_BcWZqPYMdPGoyyf1I`
3. Generate a new API key
4. Update `.env` file with the new key
5. **NEVER** commit `.env` files to version control

### 2. Environment Variables Setup

Copy `.env.example` to `.env` and fill in all values:

```bash
cd server
cp .env.example .env
```

Required variables:
- `GEMINI_API_KEY` - Your Google Gemini API key (regenerate first!)
- `EXTERNAL_DB_URL` - External database API URL
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Set to `production`
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed frontend URLs

Optional variables (have defaults):
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

### 3. Security Checklist

- [ ] API KEY REGENERATED (critical!)
- [ ] `.env` file created from`.env.example`
- [ ] `.env` is in `.gitignore`
- [ ] `NODE_ENV=production` set
- [ ] `CORS_ALLOWED_ORIGINS` set to your frontend domain(s)
- [ ] HTTPS enabled (use reverse proxy like Nginx)
- [ ] Database credentials secured
- [ ] Rate limiting configured appropriately

## Installation

### Server
```bash
cd server
npm install
npm run build  # If you have a build script
npm start
```

### Client
```bash
cd client
npm install
npm run build
npm start
```

## Environment Validation

The application validates required environment variables on startup:
- If any required variables are missing, the server will NOT start
- Error messages will indicate which variables are missing
- Check console output for validation status

## Security Features Implemented

✅ **Rate Limiting**
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Health check endpoint exempt from rate limiting

✅ **CORS Protection**
- Restricted to specific origins (configurable)
- Credentials support enabled
- Development mode allows localhost

✅ **Request Size Limits**
- JSON payloads limited to 1MB
- URL-encoded bodies limited to 1MB
- Prevents large payload DoS attacks

✅ **Security Headers (Helmet)**
- XSS Protection
- Content Security Policy
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- And more...

✅ **Input Validation**
- SQL injection prevention via guardrails
- Query length limits
- Forbidden keyword detection

✅ **Error Handling**
- Production mode hides internal error details
- Detailed errors logged server-side only
- Stack traces only in development

✅ **Environment Validation**
- Required variables checked on startup
- API key format validation
- URL validation

## Monitoring

### Health Check
The application exposes a health check endpoint:

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-04T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

Use this endpoint for:
- Load balancer health checks
- Monitoring systems
- Uptime checks

### Logging

In production:
- SQL queries are NOT logged (security)
- Only row counts are logged
- Detailed errors logged server-side
- Generic errors returned to clients

In development:
- Full SQL queries logged
- Complete API responses logged
- Stack traces included in error responses

## Production Best Practices

### 1. HTTPS
Always use HTTPS in production. Use a reverse proxy (Nginx, Apache) or cloud provider's load balancer.

### 2. Process Manager
Use a process manager to keep the application running:

**PM2** (recommended):
```bash
npm install -g pm2
pm2 start npm --name "nlp2sql-server" -- start
pm2 save
pm2 startup
```

### 3. Database Connection
The external database URL should use HTTPS in production.

### 4. Monitoring
Consider adding:
- Error tracking (Sentry, LogRocket)
- Performance monitoring (New Relic, DataDog)
- Log aggregation (ELK stack, Splunk)

### 5. Backups
- Backup your database regularly
- Version control your codebase
- Document your deployment process

## Troubleshooting

### Server won't start
- Check environment variables are set
- Verify `.env` file exists
- Check console for validation errors
- Ensure ports are not in use

### CORS errors
- Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Check protocol (http vs https)
- Verify port numbers

### Rate limit errors
- Adjust `RATE_LIMIT_MAX_REQUESTS` if needed
- Consider implementing IP whitelisting for trusted sources
- Use authentication for higher limits

### API key errors
- Verify API key is valid
- Check quotas in Google Cloud Console
- Ensure key has necessary permissions

## Support

For issues or questions:
1. Check application logs
2. Verify environment configuration
3. Test health check endpoint
4. Review error messages in console
