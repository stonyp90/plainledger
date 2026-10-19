import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, RequestMethod } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from '@infrastructure/http/filters/domain-exception.filter';
import { CorsExceptionFilter } from '@infrastructure/http/filters/cors-exception.filter';
import { FileStorageService } from '@infrastructure/storage/file-storage.service';
import { createSwaggerConfig } from '@infrastructure/http/swagger.config';

async function bootstrap() {
  console.log('[Bootstrap] Starting NestJS application...');
  console.log(`[Bootstrap] NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`[Bootstrap] KEYCLOAK_URL=${process.env.KEYCLOAK_URL}`);
  console.log('[Bootstrap] Creating NestJS app with AppModule...');
  const startTime = Date.now();

  // Add timeout detection for module creation
  const timeoutId = setTimeout(() => {
    console.error('[Bootstrap] WARNING: NestFactory.create() is taking longer than 30 seconds!');
    console.error('[Bootstrap] This suggests a blocking operation during module initialization.');
  }, 30000);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  clearTimeout(timeoutId);
  const createTime = Date.now() - startTime;
  console.log(`[Bootstrap] NestJS app created successfully in ${createTime}ms`);

  // Trust proxy headers when behind ALB/reverse proxy
  // This ensures correct protocol/host detection for Swagger UI and redirects
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Enable response compression (gzip)
  app.use(compression());
  console.log('[Bootstrap] Middleware configured');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        });
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // Security hardening
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Global exception filters
  // CorsExceptionFilter must be last (catch-all) to handle CORS on all error responses
  app.useGlobalFilters(new DomainExceptionFilter(), new CorsExceptionFilter());

  // Set global prefix for all routes except health check
  // This aligns with ALB routing rules that route /api/* to API service
  // All auth routes are served under /api/auth/* (frontend calls /api/auth/register, etc.)
  app.setGlobalPrefix('api', {
    exclude: ['health', '/health', 'health/(.*)', { path: 'health', method: RequestMethod.ALL }],
  });

  // CORS Configuration
  // Support multiple origins: main domain, www subdomain, admin subdomain, and localhost for development
  const corsOrigins: string[] = [];

  // Parse configured origins
  const configuredOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || [];
  corsOrigins.push(...configuredOrigins);

  // Always allow localhost for development
  if (!corsOrigins.some((o) => o.includes('localhost'))) {
    corsOrigins.push('http://localhost:5173');
    corsOrigins.push('http://localhost:3000');
  }

  // If production domain is set, auto-add common subdomains
  const productionDomain = configuredOrigins.find((o) => !o.includes('localhost'));
  if (productionDomain) {
    const baseUrl = productionDomain.replace(/^https?:\/\/(www\.|admin\.)?/, '');
    const protocol = productionDomain.startsWith('https') ? 'https' : 'http';

    // Ensure all variants are included
    const variants = [
      `${protocol}://${baseUrl}`,
      `${protocol}://www.${baseUrl}`,
      `${protocol}://admin.${baseUrl}`,
      `${protocol}://app.${baseUrl}`,
    ];

    for (const variant of variants) {
      if (!corsOrigins.includes(variant)) {
        corsOrigins.push(variant);
      }
    }
  }

  console.log(`[CORS] Allowed origins: ${corsOrigins.join(', ')}`);

  // Use function-based origin check for better flexibility
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject unknown origins without throwing (avoids 500)
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Organization-ID',
      'Apollo-Require-Preflight',
      'X-Request-ID',
      'Accept',
      'Origin',
      'Cache-Control',
    ],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // Swagger API Documentation (dynamically generated from decorators)
  console.log('[Bootstrap] Setting up Swagger...');
  const isProduction = process.env.NODE_ENV === 'production';
  const config = createSwaggerConfig(isProduction);
  const document = SwaggerModule.createDocument(app, config);

  // Allow Swagger UI to be embedded in iframe from admin domain
  // This sets Content-Security-Policy: frame-ancestors to allow embedding
  expressApp.use('/api/docs', (req: any, res: any, next: any) => {
    // Allow embedding from admin subdomain and localhost for development
    const allowedFrameAncestors = [
      "'self'",
      'https://admin.plainledger.ca',
      'http://localhost:3001',
      'http://localhost:3000',
    ].join(' ');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${allowedFrameAncestors}`);
    res.removeHeader('X-Frame-Options'); // Remove restrictive X-Frame-Options
    next();
  });

  // Always enable Swagger - useful for API consumers and debugging
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      // Ensure proper base URL detection behind reverse proxy
      url: isProduction ? '/api/docs-json' : undefined,
      // Display request duration
      displayRequestDuration: true,
      // Try it out enabled by default
      tryItOutEnabled: !isProduction,
      // Filter by tag
      filter: true,
    },
    customSiteTitle: 'PlainLedger API Documentation',
    // Custom CSS for better branding
    customCss: `
      .swagger-ui .topbar { background-color: #1e3a5f; }
      .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><text x="0" y="22" fill="white" font-size="20" font-weight="bold">PlainLedger</text></svg>'); }
    `,
  });

  // Export OpenAPI spec for contract testing (in non-production)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const specPath = path.join(process.cwd(), 'openapi-spec.json');
      await fs.writeFile(specPath, JSON.stringify(document, null, 2));
      console.log(`[Swagger] OpenAPI spec exported to: ${specPath}`);
    } catch (err) {
      console.warn(`[Swagger] Could not export OpenAPI spec: ${err.message}`);
    }
  }

  // Initialize file storage (create uploads bucket if needed)
  // Skip in production if S3_BUCKET_UPLOADS is not configured
  console.log('[Bootstrap] Checking file storage configuration...');
  const s3BucketUploads = process.env.S3_BUCKET_UPLOADS;
  if (s3BucketUploads) {
    console.log(`[Storage] Initializing S3 bucket: ${s3BucketUploads}`);
    try {
      const fileStorage = app.get(FileStorageService);
      const initPromise = fileStorage.initialize();
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('File storage init timed out')), 10000),
      );
      await Promise.race([initPromise, timeoutPromise]);
      console.log('[Storage] File storage initialized successfully');
    } catch (error) {
      console.warn(
        '[Storage] Failed to initialize file storage:',
        error instanceof Error ? error.message : error,
      );
    }
  } else {
    console.log('[Storage] S3_BUCKET_UPLOADS not configured - skipping file storage init');
  }

  const port = process.env.PORT || 3000;
  console.log(`[Bootstrap] About to start listening on port ${port}...`);
  await app.listen(port);
  console.log(`[Bootstrap] Server is now listening on port ${port}`);

  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   PlainLedger API - Financial Reporting Platform  ║
  ║                                                   ║
  ║   Server running on: http://localhost:${port}        ║
  ║   API Docs: http://localhost:${port}/api/docs        ║
  ║   Health: http://localhost:${port}/health            ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
}

bootstrap();
// Force rebuild v2 - Added bootstrap logging Mon Feb 3 2026
