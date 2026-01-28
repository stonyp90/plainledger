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

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
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
