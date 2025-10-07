import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  module: string;
  level: string;
  message: string;
  [key: string]: any;
}

class AppLogger {
  private moduleName: string;
  private logsDir: string;
  private errorsDir: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
    this.logsDir = path.join(process.cwd(), 'logs');
    this.errorsDir = path.join(this.logsDir, 'errors');

    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.errorsDir)) {
      fs.mkdirSync(this.errorsDir, { recursive: true });
    }
  }

  private getCurrentDay(): string {
    return new Date().toISOString().split('T')[0];
  }

  private writeLog(level: string, message: string, extra: Record<string, any> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      module: this.moduleName,
      level,
      message,
      ...extra,
    };

    const day = this.getCurrentDay();
    const logLine = JSON.stringify(entry) + '\n';

    const mainLog = path.join(this.logsDir, `${day}.log`);
    fs.appendFileSync(mainLog, logLine);

    if (level === 'ERROR') {
      const errorLog = path.join(this.errorsDir, `${day}.log`);
      fs.appendFileSync(errorLog, logLine);
    }

    console.log(`[${level}] [${this.moduleName}] ${message}`, extra);
  }

  info(message: string, extra?: Record<string, any>) {
    this.writeLog('INFO', message, extra);
  }

  error(message: string, error?: Error | unknown, extra?: Record<string, any>) {
    const errorData = error instanceof Error
      ? {
          error_type: error.name,
          error_message: error.message,
          stack: error.stack,
        }
      : error
      ? { error: String(error) }
      : {};

    this.writeLog('ERROR', message, { ...errorData, ...extra });
  }

  warning(message: string, extra?: Record<string, any>) {
    this.writeLog('WARNING', message, extra);
  }

  debug(message: string, extra?: Record<string, any>) {
    this.writeLog('DEBUG', message, extra);
  }
}

const loggers: Record<string, AppLogger> = {};

export function getLogger(moduleName: string): AppLogger {
  if (!loggers[moduleName]) {
    loggers[moduleName] = new AppLogger(moduleName);
  }
  return loggers[moduleName];
}
