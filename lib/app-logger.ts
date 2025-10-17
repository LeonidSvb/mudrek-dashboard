interface LogEntry {
  timestamp: string;
  module: string;
  level: string;
  message: string;
  [key: string]: any;
}

class AppLogger {
  private moduleName: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  private writeLog(level: string, message: string, extra: Record<string, any> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      module: this.moduleName,
      level,
      message,
      ...extra,
    };

    // На Vercel логи пишутся только в консоль (serverless environment)
    // Файловая система read-only, поэтому убираем fs операции
    const logLine = JSON.stringify(entry);

    if (level === 'ERROR') {
      console.error(`[${level}] [${this.moduleName}]`, logLine);
    } else {
      console.log(`[${level}] [${this.moduleName}]`, logLine);
    }
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
