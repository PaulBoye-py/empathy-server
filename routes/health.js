// routes/health.js - New health check routes
const express = require('express');
const router = express.Router();
const { getKeepAliveStatus, pingServerNow } = require('../jobs/keepAliveJob');
const { logger, serverLogger } = require('../utils/logger');

// Main health check endpoint (for keep-alive pings)
router.get('/', (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      },
      server: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      responseTime: Date.now() - startTime
    };

    // Log health check (only for keep-alive requests to avoid spam)
    if (req.headers['x-keep-alive']) {
      serverLogger.debug('🩺 Health check - Keep-alive ping', {
        uptime: `${Math.floor(process.uptime() / 60)} minutes`,
        memory: `${healthData.memory.used}MB used`,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json(healthData);

  } catch (error) {
    logger.error('❌ Health check failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    });
  }
});

// Detailed health check with more info
router.get('/detailed', (req, res) => {
  try {
    const keepAliveStatus = getKeepAliveStatus();
    
    const detailedHealth = {
      server: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: Math.floor(process.uptime()),
          human: formatUptime(process.uptime())
        },
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          unit: 'MB'
        },
        cpuUsage: process.cpuUsage()
      },
      keepAlive: keepAliveStatus,
      deployment: {
        host: process.env.RENDER_SERVICE_NAME || 'localhost',
        region: process.env.RENDER_REGION || 'unknown',
        deploymentId: process.env.RENDER_GIT_COMMIT || 'unknown'
      }
    };

    serverLogger.info('📊 Detailed health check requested', {
      uptime: detailedHealth.server.uptime.human,
      memoryUsed: `${detailedHealth.system.memory.heapUsed}MB`,
      keepAlivePings: keepAliveStatus.totalPings
    });

    res.status(200).json(detailedHealth);

  } catch (error) {
    logger.error('❌ Detailed health check failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Keep-alive status endpoint
router.get('/keep-alive', (req, res) => {
  try {
    const status = getKeepAliveStatus();
    
    res.status(200).json({
      success: true,
      keepAlive: status,
      message: status.isRunning ? 'Keep-alive service is active' : 'Keep-alive service is not running'
    });

  } catch (error) {
    logger.error('❌ Keep-alive status check failed', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual keep-alive ping trigger
router.post('/keep-alive/ping', async (req, res) => {
  try {
    serverLogger.info('🧪 Manual keep-alive ping triggered');
    
    const result = await pingServerNow();
    
    res.status(200).json({
      success: result.success,
      message: result.success ? 'Keep-alive ping successful' : 'Keep-alive ping failed',
      result
    });

  } catch (error) {
    logger.error('❌ Manual keep-alive ping failed', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Restart keep-alive service
router.post('/keep-alive/restart', (req, res) => {
  try {
    const { startKeepAlive, stopKeepAlive } = require('../jobs/keepAliveJob');
    
    serverLogger.info('🔄 Restarting keep-alive service');
    
    stopKeepAlive();
    setTimeout(() => {
      startKeepAlive();
    }, 1000);
    
    res.status(200).json({
      success: true,
      message: 'Keep-alive service restarted'
    });

  } catch (error) {
    logger.error('❌ Failed to restart keep-alive service', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to format uptime
const formatUptime = (uptimeSeconds) => {
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

module.exports = router;