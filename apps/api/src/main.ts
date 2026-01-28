import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { DomainExceptionFilter } from "@infrastructure/http/filters/domain-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
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

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle("PlainLedger API")
    .setDescription("Financial Reporting Platform API - Clean Architecture")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("organizations", "Organization management")
    .addTag("accounts", "Chart of accounts")
    .addTag("reports", "Financial reports")
    .addTag("integrations", "Data source integrations")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

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
