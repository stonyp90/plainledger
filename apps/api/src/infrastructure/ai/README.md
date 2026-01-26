# James AI Service - Enterprise Grade

## Overview

The James AI Service provides enterprise-grade AI capabilities for strategic planning with comprehensive error handling, security, performance optimization, and observability.

## Features

### Error Handling & Resilience
- **Retry Logic**: Exponential backoff with configurable retry attempts (default: 3)
- **Circuit Breaker**: Prevents cascading failures when AI service is down
- **Timeout Protection**: Request timeouts prevent hanging requests (default: 30s)
- **Graceful Fallbacks**: Simulated responses when AI service is unavailable

### Security
- **Input Validation**: Comprehensive validation of all inputs
- **Input Sanitization**: Removes potentially dangerous content (XSS, injection attempts)
- **Rate Limiting**: Multi-layer rate limiting (service + controller level)
  - Service level: 30 requests/minute per tenant
  - Controller level: 20 requests/minute per tenant
- **Authentication**: Validates authentication tokens in production
- **Output Validation**: Validates and sanitizes AI responses before returning

### Performance
- **Response Caching**: Caches responses for 5 minutes to reduce API calls
- **Request Debouncing**: Frontend debouncing (300ms) to reduce unnecessary requests
- **Context Optimization**: Intelligent conversation history management
- **Token Management**: Tracks token usage per tenant with daily limits

### Observability
- **Comprehensive Logging**: Structured logging with request IDs
- **Performance Metrics**: Tracks latency, token usage, success rates
- **Analytics**: Frontend analytics tracking for usage patterns
- **Error Tracking**: Detailed error logging with stack traces

### Scalability
- **Connection Pooling**: Efficient HTTP connection management
- **Request Queuing**: Prevents overwhelming the AI service
- **Resource Management**: Automatic cleanup of old requests and cache

## Configuration

### Environment Variables

```bash
# AI Provider Configuration
OPENAI_API_KEY=your_openai_key          # OpenAI API key
ANTHROPIC_API_KEY=your_anthropic_key    # Anthropic API key

# Service Configuration
AI_MAX_RETRIES=3                        # Maximum retry attempts (default: 3)
AI_REQUEST_TIMEOUT=30000                # Request timeout in ms (default: 30000)
AI_MAX_TOKENS=4000                      # Maximum tokens per request (default: 4000)

# Rate Limiting
AI_RATE_LIMIT_REQUESTS=30               # Requests per minute per tenant (default: 30)
AI_RATE_LIMIT_WINDOW_MS=60000           # Rate limit window in ms (default: 60000)

# Circuit Breaker
AI_CIRCUIT_BREAKER_FAILURES=5           # Failures before opening circuit (default: 5)
AI_CIRCUIT_BREAKER_RESET_MS=60000      # Circuit reset timeout in ms (default: 60000)

# Caching
AI_CACHE_TTL_MS=300000                 # Cache TTL in ms (default: 5 minutes)
```

## API Endpoints

### POST /api/ai/chat

Generate AI response for strategic planning.

**Request:**
```json
{
  "prompt": "How can I extend my cash runway?",
  "stream": false,
  "temperature": 0.7,
  "maxTokens": 2000,
  "retries": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Based on your current financial position...",
  "initiatives": [...],
  "okrs": [...],
  "metadata": {
    "requestId": "req-1234567890",
    "latency": 1250,
    "tokensUsed": {
      "prompt": 150,
      "completion": 200,
      "total": 350
    }
  }
}
```

## Error Handling

The service handles various error scenarios:

- **429 Too Many Requests**: Rate limit exceeded
- **401 Unauthorized**: Invalid or missing authentication
- **500+ Server Errors**: AI service temporarily unavailable
- **Timeout Errors**: Request exceeded timeout threshold
- **Network Errors**: Connection issues

All errors return user-friendly messages without exposing internal details.

## Monitoring

### Metrics Tracked
- Request count per tenant
- Response latency (p50, p95, p99)
- Token usage per tenant
- Error rates by type
- Cache hit rates
- Circuit breaker state

### Logging
- Request/response logging with request IDs
- Error logging with stack traces
- Performance metrics logging
- Security event logging

## Best Practices

1. **Always provide tenant ID** in headers for proper rate limiting
2. **Use appropriate timeouts** based on your use case
3. **Monitor token usage** to stay within limits
4. **Handle errors gracefully** with retry logic
5. **Cache responses** when appropriate to reduce costs
6. **Validate inputs** before sending to AI service

## Security Considerations

- All inputs are validated and sanitized
- Rate limiting prevents abuse
- Authentication required in production
- Sensitive data is not logged
- API keys are never exposed in responses

## Performance Tips

1. **Use caching** for repeated queries
2. **Debounce user input** to reduce API calls
3. **Optimize prompts** to reduce token usage
4. **Monitor cache hit rates** to tune TTL
5. **Use streaming** for long responses (when implemented)

## Troubleshooting

### High Error Rates
- Check API key validity
- Verify rate limits aren't exceeded
- Check network connectivity
- Review circuit breaker state

### Slow Responses
- Check AI service status
- Review timeout settings
- Check token usage limits
- Verify cache is working

### Rate Limit Issues
- Implement request queuing
- Use caching more aggressively
- Consider upgrading rate limits
- Distribute requests across time
