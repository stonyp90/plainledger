/**
 * CORS Exception Filter
 *
 * Ensures CORS headers are always included on error responses.
 * This fixes the issue where preflight requests fail when errors occur.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class CorsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CorsExceptionFilter.name);
  private readonly allowedOrigins: string[];

  constructor() {
    // Parse CORS origins from environment
    const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((o) => o.trim());
    
    this.allowedOrigins = [...configuredOrigins];
    
    // Always allow localhost for development
    if (!this.allowedOrigins.some(o => o.includes("localhost"))) {
      this.allowedOrigins.push("http://localhost:5173");
      this.allowedOrigins.push("http://localhost:3000");
    }

    // If production domain is set, auto-add common subdomains
    const productionDomain = configuredOrigins.find(o => !o.includes("localhost"));
    if (productionDomain) {
      const baseUrl = productionDomain.replace(/^https?:\/\/(www\.|admin\.)?/, "");
      const protocol = productionDomain.startsWith("https") ? "https" : "http";
      
      const variants = [
        `${protocol}://${baseUrl}`,
        `${protocol}://www.${baseUrl}`,
        `${protocol}://admin.${baseUrl}`,
        `${protocol}://app.${baseUrl}`,
      ];
      
      for (const variant of variants) {
        if (!this.allowedOrigins.includes(variant)) {
          this.allowedOrigins.push(variant);
        }
      }
    }

    this.logger.log(`CorsExceptionFilter origins: ${this.allowedOrigins.join(", ")}`);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get error message
    let message = "Internal server error";
    let errorDetails: unknown = undefined;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        errorDetails = resp.errors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Add CORS headers to error response
    const origin = request.headers.origin;
    if (origin && this.allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
      response.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      response.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Tenant-ID, X-Request-ID",
      );
    }

    // Log non-client errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Build response object
    const responseBody: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errorDetails) {
      responseBody.errors = errorDetails;
    }

    // Send error response
    response.status(status).json(responseBody);
  }
}
