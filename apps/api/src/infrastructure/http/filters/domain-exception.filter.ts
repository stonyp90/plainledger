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
  HttpException,
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

    // Apollo maps HttpException status codes to its standard GraphQL errors.
    // Do not try to write to an HTTP response from a resolver execution context.
    if (host.getType<string>() !== "http") {
      return new HttpException({ statusCode: status, message }, status);
    }

    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({
      statusCode: status,
      message,
      error: exception.constructor.name,
      timestamp: new Date().toISOString(),
    });
  }
}
