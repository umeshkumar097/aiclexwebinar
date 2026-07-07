import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: unknown;
}

/**
 * Wraps all successful responses in the standard Zonvo API envelope:
 * { success: true, data: <original response> }
 *
 * Exceptions are NOT wrapped — the HttpExceptionFilter handles those.
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => {
        // If data is already wrapped (e.g., from a service that returns ApiResponse), pass through
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in data &&
          (data as Record<string, unknown>)['success'] === true
        ) {
          return data as ApiResponse<unknown>;
        }

        return {
          success: true as const,
          data,
        };
      }),
    );
  }
}
