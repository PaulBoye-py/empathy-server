// jobs/keepAliveJob.js
require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const { logger } = require('../utils/logger');

class KeepAliveService {
  constructor() {
    this.serverUrl = process.env.SERVER_URL || 'https://empathy-server-test.onrender.com';
    this.healthEndpoint = '/api/health';
    this.isRunning = false;
    this.lastPingTime = null;
    this.pingCount = 0;
    this.failureCount = 0;
  }

  async pingServer() {
    const startTime = Date.now();
    
    try {
      logger.info('🏃 Keep-alive ping starting...', {
        url: `${this.serverUrl}${this.healthEndpoint}`,
        pingNumber: this.pingCount + 1,
        lastPing: this.lastPingTime
      });

      const response = await axios.get(`${this.serverUrl}${this.healthEndpoint}`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'KeepAlive-Bot/1.0',
          'X-Keep-Alive': 'true'
        }
      });

      const responseTime = Date.now() - startTime;
      this.pingCount++;
      this.lastPingTime = new Date().toISOString();
      this.failureCount = 0; // Reset failure count on success

      logger.info('✅ Keep-alive ping successful', {
        responseTime: `${responseTime}ms`,
        status: response.status,
        pingCount: this.pingCount,
        serverStatus: response.data?.status || 'unknown'
      });

      // Log memory usage and uptime
      this.logServerHealth(response.data);

      return {
        success: true,
        responseTime,
        status: response.status,
        data: response.data
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.failureCount++;

      logger.error('❌ Keep-alive ping failed', {
        error: error.message,
        responseTime: `${responseTime}ms`,
        failureCount: this.failureCount,
        errorCode: error.code,
        url: `${this.serverUrl}${this.healthEndpoint}`
      });

      // If we have multiple failures, try alternative endpoints
      if (this.failureCount >= 3) {
        logger.warn('⚠️ Multiple ping failures detected, server might be down', {
          consecutiveFailures: this.failureCount
        });
      }

      return {
        success: false,
        error: error.message,
        responseTime,
        failureCount: this.failureCount
      };
    }
  }

  logServerHealth(healthData) {
    if (healthData) {
      logger.info('📊 Server health status', {
        uptime: healthData.uptime,
        memory: healthData.memory,
        timestamp: healthData.timestamp,
        environment: healthData.environment
      });
    }
  }

  async runKeepAlive() {
    if (!this.isRunning) {
      logger.warn('⚠️ Keep-alive job called but not scheduled to run');
      return;
    }

    const result = await this.pingServer();
    
    // Log summary every hour (4 pings * 15 minutes = 1 hour)
    if (this.pingCount % 4 === 0) {
      logger.info('📈 Keep-alive hourly summary', {
        totalPings: this.pingCount,
        recentFailures: this.failureCount,
        lastSuccessful: this.lastPingTime,
        nextSummary: 'in 1 hour'
      });
    }

    return result;
  }

  startKeepAlive() {
    if (this.isRunning) {
      logger.warn('⚠️ Keep-alive job already running');
      return;
    }

    logger.info('🚀 Starting keep-alive service for Render free tier', {
      serverUrl: this.serverUrl,
      interval: '14 minutes',
      healthEndpoint: this.healthEndpoint
    });

    // Schedule to run every 14 minutes (before Render's 15-minute sleep)
    cron.schedule('*/14 * * * *', async () => {
      await this.runKeepAlive();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.isRunning = true;

    // Run initial ping after 30 seconds to verify setup
    setTimeout(async () => {
      logger.info('🧪 Running initial keep-alive test...');
      await this.runKeepAlive();
    }, 30000);

    logger.info('✅ Keep-alive cron job scheduled successfully', {
      pattern: '*/14 * * * *',
      description: 'Ping server every 14 minutes',
      timezone: 'UTC'
    });
  }

  stopKeepAlive() {
    this.isRunning = false;
    logger.info('🛑 Keep-alive service stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      serverUrl: this.serverUrl,
      totalPings: this.pingCount,
      lastPingTime: this.lastPingTime,
      consecutiveFailures: this.failureCount,
      schedule: '*/14 * * * *'
    };
  }
}

// Create singleton instance
const keepAliveService = new KeepAliveService();

// Export functions
const startKeepAlive = () => keepAliveService.startKeepAlive();
const stopKeepAlive = () => keepAliveService.stopKeepAlive();
const getKeepAliveStatus = () => keepAliveService.getStatus();
const pingServerNow = () => keepAliveService.pingServer();

module.exports = {
  startKeepAlive,
  stopKeepAlive,
  getKeepAliveStatus,
  pingServerNow,
  keepAliveService
};