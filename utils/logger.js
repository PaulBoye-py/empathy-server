// utils/logger.js
const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const logColors = {
  error: 'red',
  warn: 'yellow', 
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Add colors to winston
winston.addColors(logColors);

// Custom format for console logging
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    
    return msg;
  })
);

// Custom format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels: logLevels,
  format: fileFormat,
  defaultMeta: { 
    service: 'therapy-hub-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
    }),

    // File transport for errors (always enabled)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Combined log file (production only or when specified)
    ...(process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGS === 'true' ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB  
        maxFiles: 5
      })
    ] : [])
  ],

  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],

  // Handle rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'), 
      format: fileFormat
    })
  ]
});

// Create specialized loggers for different components
const createComponentLogger = (component) => {
  return {
    error: (message, meta = {}) => logger.error(message, { ...meta, component }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component }),
    info: (message, meta = {}) => logger.info(message, { ...meta, component }),
    http: (message, meta = {}) => logger.http(message, { ...meta, component }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, component })
  };
};

// Specialized loggers
const paymentLogger = createComponentLogger('PAYMENT');
const emailLogger = createComponentLogger('EMAIL');
const cronLogger = createComponentLogger('CRON');
const keepAliveLogger = createComponentLogger('KEEP_ALIVE');
const serverLogger = createComponentLogger('SERVER');

// Helper functions
const logServerStart = (port, environment) => {
  serverLogger.info('🚀 Server started successfully', {
    port,
    environment,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
};

const logPaymentActivity = (activity, data) => {
  paymentLogger.info(`💳 ${activity}`, data);
};

const logEmailActivity = (activity, data) => {
  emailLogger.info(`📧 ${activity}`, data);
};

const logCronActivity = (jobName, status, data = {}) => {
  cronLogger.info(`⏰ ${jobName} - ${status}`, data);
};

const logKeepAliveActivity = (activity, data) => {
  keepAliveLogger.info(`🏃 ${activity}`, data);
};

const logError = (error, context = {}) => {
  logger.error('💥 Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.http('📥 Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Log response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    logger.http('📤 Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 0
    });
  });

  next();
};

// Export everything
module.exports = {
  logger,
  paymentLogger,
  emailLogger,
  cronLogger,
  keepAliveLogger,
  serverLogger,
  logServerStart,
  logPaymentActivity,
  logEmailActivity,
  logCronActivity,
  logKeepAliveActivity,
  logError,
  requestLogger,
  createComponentLogger
};