import { promises as fs } from 'fs';
import path from 'path';

/**
 * Simple file logger with progress bar support
 * For local development and debugging
 *
 * Adapted from Vapi project
 */
class FileLogger {
    constructor(logFile = 'app.log') {
        this.logFile = path.join(process.cwd(), 'logs', logFile);
        this.ensureLogDir();
    }

    async ensureLogDir() {
        try {
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error.message);
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

        if (data) {
            formatted += `\n${JSON.stringify(data, null, 2)}`;
        }

        return formatted;
    }

    async writeLog(level, message, data = null) {
        try {
            const formatted = this.formatMessage(level, message, data);
            await fs.appendFile(this.logFile, formatted + '\n');
        } catch (error) {
            console.error('Failed to write log:', error.message);
        }
    }

    info(message, data = null) {
        console.log(`ℹ️ ${message}`);
        this.writeLog('info', message, data);
    }

    success(message, data = null) {
        console.log(`✅ ${message}`);
        this.writeLog('success', message, data);
    }

    warning(message, data = null) {
        console.log(`⚠️ ${message}`);
        this.writeLog('warning', message, data);
    }

    error(message, error = null) {
        console.error(`❌ ${message}`);
        const errorData = error ? {
            message: error.message,
            stack: error.stack,
            ...(error.response && { response: error.response.data })
        } : null;
        this.writeLog('error', message, errorData);
    }

    debug(message, data = null) {
        if (process.env.DEBUG === 'true') {
            console.log(`🔍 ${message}`);
            this.writeLog('debug', message, data);
        }
    }

    /**
     * Display progress bar in console
     *
     * @param {number} current - Current progress value
     * @param {number} total - Total value
     * @param {string} operation - Operation name
     */
    progress(current, total, operation = 'Processing') {
        const percentage = Math.round((current / total) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
        process.stdout.write(`\r${operation}: [${progressBar}] ${percentage}% (${current}/${total})`);

        if (current === total) {
            console.log(''); // New line after completion
        }
    }

    async getRecentLogs(lines = 50) {
        try {
            const content = await fs.readFile(this.logFile, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            return logLines.slice(-lines);
        } catch (error) {
            return [`No logs found: ${error.message}`];
        }
    }

    async clearLogs() {
        try {
            await fs.writeFile(this.logFile, '');
            console.log('✅ Logs cleared');
        } catch (error) {
            console.error('❌ Failed to clear logs:', error.message);
        }
    }
}

export default FileLogger;
