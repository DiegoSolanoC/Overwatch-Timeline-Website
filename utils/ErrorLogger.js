/**
 * ErrorLogger - Centralized error handling and logging utility
 * Provides consistent logging with levels, context, and optional error reporting
 * 
 * Usage:
 *   ErrorLogger.error('GlobeController', 'Failed to initialize', error);
 *   ErrorLogger.warn('TransportController', 'Route not found', { routeId: 123 });
 *   ErrorLogger.info('EventManager', 'Events loaded successfully');
 */
export class ErrorLogger {
    static LogLevel = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    };

    static currentLevel = ErrorLogger.LogLevel.DEBUG; // Show all logs by default
    static enableTimestamps = true;
    static enableStackTraces = true;
    static logs = []; // Store logs for later retrieval
    static maxLogs = 1000; // Prevent memory issues

    /**
     * Set the minimum log level to display
     * @param {number} level - Log level from ErrorLogger.LogLevel
     */
    static setLogLevel(level) {
        this.currentLevel = level;
    }

    /**
     * Format log message with timestamp and context
     * @param {string} level - Log level name
     * @param {string} context - Context (e.g., controller name)
     * @param {string} message - Log message
     * @returns {string} Formatted message
     */
    static formatMessage(level, context, message) {
        const timestamp = this.enableTimestamps ? `[${new Date().toISOString()}] ` : '';
        const contextStr = context ? `[${context}] ` : '';
        return `${timestamp}${level}: ${contextStr}${message}`;
    }

    /**
     * Store log in memory
     * @param {string} level - Log level
     * @param {string} context - Context
     * @param {string} message - Message
     * @param {any} data - Additional data
     */
    static storeLog(level, context, message, data) {
        const log = {
            timestamp: Date.now(),
            level,
            context,
            message,
            data
        };
        
        this.logs.push(log);
        
        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(this.logs.length - this.maxLogs);
        }
    }

    /**
     * Debug log (lowest level)
     * @param {string} context - Context
     * @param {string} message - Message
     * @param {any} data - Optional data
     */
    static debug(context, message, data = null) {
        if (this.currentLevel > this.LogLevel.DEBUG) return;
        
        const formatted = this.formatMessage('DEBUG', context, message);
        console.log(formatted, data || '');
        this.storeLog('DEBUG', context, message, data);
    }

    /**
     * Info log
     * @param {string} context - Context
     * @param {string} message - Message
     * @param {any} data - Optional data
     */
    static info(context, message, data = null) {
        if (this.currentLevel > this.LogLevel.INFO) return;
        
        const formatted = this.formatMessage('INFO', context, message);
        console.log(formatted, data || '');
        this.storeLog('INFO', context, message, data);
    }

    /**
     * Warning log
     * @param {string} context - Context
     * @param {string} message - Message
     * @param {any} data - Optional data
     */
    static warn(context, message, data = null) {
        if (this.currentLevel > this.LogLevel.WARN) return;
        
        const formatted = this.formatMessage('WARN', context, message);
        console.warn(formatted, data || '');
        this.storeLog('WARN', context, message, data);
    }

    /**
     * Error log
     * @param {string} context - Context
     * @param {string} message - Message
     * @param {Error|any} error - Error object or data
     */
    static error(context, message, error = null) {
        if (this.currentLevel > this.LogLevel.ERROR) return;
        
        const formatted = this.formatMessage('ERROR', context, message);
        console.error(formatted, error || '');
        
        // Log stack trace if enabled and error is available
        if (this.enableStackTraces && error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
        
        this.storeLog('ERROR', context, message, error);
    }

    /**
     * Fatal error log (highest level, always shown)
     * @param {string} context - Context
     * @param {string} message - Message
     * @param {Error|any} error - Error object or data
     */
    static fatal(context, message, error = null) {
        const formatted = this.formatMessage('FATAL', context, message);
        console.error(formatted, error || '');
        
        // Always log stack trace for fatal errors
        if (error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
        
        this.storeLog('FATAL', context, message, error);
        
        // Could trigger error reporting service here
        this.reportFatalError(context, message, error);
    }

    /**
     * Report fatal error to external service (stub for future implementation)
     * @param {string} context - Context
     * @param {string} message - Message
     * @param {Error|any} error - Error
     */
    static reportFatalError(context, message, error) {
        // Placeholder for error reporting service integration
        // Could send to Sentry, LogRocket, custom backend, etc.
        console.error('FATAL ERROR REPORTED:', { context, message, error });
    }

    /**
     * Get all stored logs
     * @param {string} level - Optional: filter by level
     * @returns {Array} Array of log objects
     */
    static getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return [...this.logs];
    }

    /**
     * Clear stored logs
     */
    static clearLogs() {
        this.logs = [];
    }

    /**
     * Export logs as JSON string
     * @returns {string} JSON string of logs
     */
    static exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Group related logs together (for console grouping)
     * @param {string} groupName - Group name
     * @param {Function} callback - Function containing logs
     */
    static group(groupName, callback) {
        console.group(groupName);
        try {
            callback();
        } finally {
            console.groupEnd();
        }
    }

    /**
     * Performance timing utility
     * @param {string} context - Context
     * @param {string} operation - Operation name
     * @returns {Function} End timing function
     */
    static startTiming(context, operation) {
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            this.debug(context, `${operation} completed in ${duration.toFixed(2)}ms`);
            return duration;
        };
    }
}

// Expose ErrorLogger globally for non-module scripts
if (typeof window !== 'undefined') {
    window.ErrorLogger = ErrorLogger;
}
