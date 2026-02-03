import { NestFactory } from "@nestjs/core";
import { ValidationPipe, BadRequestException } from "@nestjs/common";
import { SwaggerModule } from "@nestjs/swagger";
import * as compression from "compression";
import { AppModule } from "./app.module";
import { DomainExceptionFilter } from "@infrastructure/http/filters/domain-exception.filter";
import { FileStorageService } from "@infrastructure/storage/file-storage.service";
import { createSwaggerConfig } from "@infrastructure/http/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy headers when behind ALB/reverse proxy
  // This ensures correct protocol/host detection for Swagger UI and redirects
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1);

  // Enable response compression (gzip)
  app.use(compression());

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
          return Object.values(constraints).join(", ");
        });
        return new BadRequestException({
          statusCode: 400,
          message: "Validation failed",
          errors: messages,
        });
      },
    }),
  );

  // Global exception filter for domain errors
  app.useGlobalFilters(new DomainExceptionFilter());

  // Set global prefix for all routes except health check
  // This aligns with ALB routing rules that route /api/* to API service
  app.setGlobalPrefix("api", {
    exclude: ["/health"],
  });

  // CORS
  // Support multiple origins: main domain, www subdomain, and localhost for development
  const corsOrigins = process.env.CORS_ORIGIN?.split(",") || [
    "http://localhost:5173",
  ];
  // If production domain is set, also include www subdomain
  if (
    process.env.CORS_ORIGIN &&
    !process.env.CORS_ORIGIN.includes("localhost")
  ) {
    const mainDomain = process.env.CORS_ORIGIN.split(",")[0].trim();
    if (mainDomain && !mainDomain.includes("www.")) {
      corsOrigins.push(mainDomain.replace("https://", "https://www."));
    }
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Tenant-ID",
      "X-Request-ID",
    ],
  });

  // Swagger API Documentation (dynamically generated from decorators)
  const isProduction = process.env.NODE_ENV === "production";
  const config = createSwaggerConfig(isProduction);
  const document = SwaggerModule.createDocument(app, config);
  
  // Always enable Swagger - useful for API consumers and debugging
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
      // Ensure proper base URL detection behind reverse proxy
      url: isProduction ? "/api/docs-json" : undefined,
      // Display request duration
      displayRequestDuration: true,
      // Try it out enabled by default
      tryItOutEnabled: !isProduction,
      // Filter by tag
      filter: true,
    },
    customSiteTitle: "PlainLedger API Documentation",
    // Custom CSS for better branding
    customCss: `
      .swagger-ui .topbar { background-color: #1e3a5f; }
      .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><text x="0" y="22" fill="white" font-size="20" font-weight="bold">PlainLedger</text></svg>'); }
    `,
  });

  // Export OpenAPI spec for contract testing (in non-production)
  if (process.env.NODE_ENV !== "production") {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const specPath = path.join(process.cwd(), "openapi-spec.json");
      await fs.writeFile(specPath, JSON.stringify(document, null, 2));
      console.log(`[Swagger] OpenAPI spec exported to: ${specPath}`);
    } catch (err) {
      console.warn(`[Swagger] Could not export OpenAPI spec: ${err.message}`);
    }
  }

  // Initialize file storage (create uploads bucket if needed)
  try {
    const fileStorage = app.get(FileStorageService);
    await fileStorage.initialize();
    console.log("[Storage] File storage initialized successfully");
  } catch (error) {
    console.warn(
      "[Storage] Failed to initialize file storage:",
      error instanceof Error ? error.message : error,
    );
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

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
// Force rebuild Tue Feb  3 12:33:42 EST 2026
