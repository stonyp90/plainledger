/**
 * Domain Exception Filter
 *
 * Centralizes error handling for domain errors
 * Maps domain errors to appropriate HTTP status codes
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import {
  DomainError,
  EntityNotFoundError,
  DuplicateEntityError,
} from "@domain/errors/DomainError";

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let message: string;

    if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof DuplicateEntityError) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
    } else {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.constructor.name,
      timestamp: new Date().toISOString(),
    });
  }
}
