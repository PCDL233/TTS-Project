import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  code: number;
  message: string;
  requestId: string;
  timestamp: string;
  path: string;
  messages?: string[];
}

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

function isHttpExceptionBody(value: unknown): value is HttpExceptionBody {
  return typeof value === 'object' && value !== null;
}

function normalizeMessage(
  message: unknown,
  fallback: string,
): { message: string; messages?: string[] } {
  if (Array.isArray(message)) {
    const messages = message.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
    return {
      message: messages[0] || fallback,
      messages: messages.length > 1 ? messages : undefined,
    };
  }

  if (typeof message === 'string' && message.length > 0) {
    return { message };
  }

  return { message: fallback };
}

function getHeaderValue(value: string | string[] | number | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value === undefined ? '' : String(value);
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // SSE 或手动响应已经开始时，不再尝试改写响应体，避免 ERR_HTTP_HEADERS_SENT。
    if (response.headersSent) {
      return;
    }

    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const fallback =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? '服务器内部错误'
        : '请求处理失败';
    const normalized = this.getNormalizedMessage(exception, fallback);
    const requestId =
      getHeaderValue(response.getHeader('X-Request-Id')) ||
      getHeaderValue(request.headers['x-request-id']);

    const body: ErrorBody = {
      code: status,
      message: normalized.message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      ...(normalized.messages ? { messages: normalized.messages } : {}),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `[${requestId || 'no-request-id'}] ${request.method} ${body.path} ${status}: ${body.message}`,
        stack,
      );
    }

    response.status(status).json(body);
  }

  private getNormalizedMessage(
    exception: unknown,
    fallback: string,
  ): { message: string; messages?: string[] } {
    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse();
      if (isHttpExceptionBody(exceptionResponse)) {
        return normalizeMessage(
          exceptionResponse.message,
          exception.message || fallback,
        );
      }
      return normalizeMessage(exceptionResponse, exception.message || fallback);
    }

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        return normalizeMessage(
          exceptionResponse,
          exception.message || fallback,
        );
      }
      if (isHttpExceptionBody(exceptionResponse)) {
        return normalizeMessage(
          exceptionResponse.message ?? exceptionResponse.error,
          exception.message || fallback,
        );
      }
      return { message: exception.message || fallback };
    }

    if (exception instanceof Error) {
      // 当前项目约定未知异常也透传原始 message，便于本地排查。
      return { message: exception.message || fallback };
    }

    return normalizeMessage(exception, fallback);
  }
}
