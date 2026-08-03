import { ConsoleLogger, Injectable, LoggerService } from '@nestjs/common';
import { appendFileSync, mkdirSync } from 'fs';
import { basename, join, resolve } from 'path';

type LogMethod = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Injectable()
export class FileLoggerService extends ConsoleLogger implements LoggerService {
  private readonly logDir: string;

  constructor(context = 'Application') {
    super(context);
    this.logDir = resolveLogDir();
    mkdirSync(this.logDir, { recursive: true });
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    super.log(message, ...optionalParams);
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    super.error(message, ...optionalParams);
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    super.warn(message, ...optionalParams);
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    super.debug(message, ...optionalParams);
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    super.verbose(message, ...optionalParams);
    this.write('verbose', message, optionalParams);
  }

  private write(level: LogMethod, message: unknown, optionalParams: unknown[]) {
    const logFile = join(this.logDir, `app.${formatDate(new Date())}.1.log`);
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      message: formatValue(message),
      params: optionalParams.map(formatValue),
    });

    appendFileSync(logFile, `${line}\n`, 'utf8');
  }
}

function resolveLogDir() {
  if (process.env.LOG_DIR) {
    return process.env.LOG_DIR;
  }

  return basename(process.cwd()) === 'server'
    ? join(process.cwd(), 'logs')
    : join(process.cwd(), 'server', 'logs');
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatValue(value: unknown) {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}
