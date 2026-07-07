import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
    path: string;
    statusCode: number;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    let status: number;
    let code: string;
    let message: string;
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
        code = this.statusToCode(status);
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        message = String(r['message'] ?? exception.message);
        code = String(r['code'] ?? this.statusToCode(status));
        details = r['details'];

        // Validation errors from class-validator come as array in message
        if (Array.isArray(r['message'])) {
          message = 'Validation failed';
          details = r['message'];
        }
      } else {
        message = exception.message;
        code = this.statusToCode(status);
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected error occurred. Please try again later.';

      // Log unexpected errors with full stack
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
        'HttpExceptionFilter',
      );
    }

    const requestId =
      (request.headers['x-request-id'] as string) ??
      crypto.randomUUID?.() ??
      Date.now().toString();

    const body: ErrorEnvelope = {
      success: false,
      error: {
        code,
        message,
        details,
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
        statusCode: status,
      },
    };

    void reply.status(status).send(body);
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      410: 'GONE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? 'ERROR';
  }
}
