const serverless = require('serverless-http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const morgan = require('morgan');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const sqlRoutes = require('./routes/sqlRoutes')
const mongoRoutes = require('./routes/mongoRoutes')
const paymentRoute = require('./routes/paymentRoute')
const flutterwaveRoute = require('./routes/flutterwaveRoute')
const slackNotificationRoute = require('./routes/slackNotificationRoute')
const { sendSlackNotification } = require('./controllers/slackNotification'); // Replace with the correct path
const mongoController = require('./controllers/mongoController');
const therapistsController = require('./controllers/therapistsController');
const promoCodeController = require('./controllers/promoCodeController');
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const authRoute = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes'); // Import user routes
const newUserRoute = require('./routes/newUserRoute')
const middleware = require('./middleware/middleware')
const s3Router = require('./controllers/imageUpload');

//Error Reporting
const errorReportingRoutes = require('./routes/errorReporting');
const paystackRoutes = require('./routes/paystack');
const { errorReportingMiddleware } = require('./middleware/errorReporting');
const { default: mongoose } = require('mongoose');

// CRON
const { schedulePaymentSummaryJob } = require('./jobs/paymentSummaryJob');

// KEEP ALIVE AND LOGGING
// Import logging and keep-alive services
const { 
  logger, 
  logServerStart, 
  requestLogger, 
  logError,
  serverLogger 
} = require('./utils/logger');
const { startKeepAlive } = require('./jobs/keepAliveJob');
const healthRoutes = require('./routes/health');

// Request logging middleware (add early)
app.use(requestLogger);

const allowedOrigins = [
    process.env.FRONTENDURL,
    'https://www.myempathyspace.com',
    'https://myempathyspace.com',
    'https://test.myempathyspace.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://empathy-space-site-paulboye-py.vercel.app',
    'https://therapist-backend-update.vercel.app',
    'https://therapist-backend-update-paulboyepys-projects.vercel.app',
    'https://admin.myempathyspace.com',
]
const corsOptions ={
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else (
            callback(new Error('Not allowed by CORS'))
        )
    },
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200,
    
};

// Connect to MongoDB
const therapistMongoUri = process.env.THERAPISTS_MONGODB_URI;
const usersMongoUri = process.env.USERS_MONGODB_URI;

// Separate connection for therapist database
const therapistConnection = mongoose.createConnection(therapistMongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
therapistConnection.on('connected', () => {
    console.log('Connected to therapist MongoDB');
});
therapistConnection.on('error', (error) => {
    console.error('Error connecting to therapist MongoDB', error);
});

// Separate connection for users database
const usersConnection = mongoose.createConnection(usersMongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
usersConnection.on('connected', () => {
    console.log('Connected to users MongoDB');
});
usersConnection.on('error', (error) => {
    console.error('Error connecting to users MongoDB', error);
});

// Middleware for request logging (Morgan)
app.use(morgan('combined')); // Log incoming requests

// app.use(loggerMiddleware);



// Middleware
// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(middleware(usersConnection).tokenExtractor)

app.use(express.json());

app.use(cors(corsOptions));

app.use('/api/v1/professionals', sqlRoutes);

app.use('/api/v1/professionals', therapistsController(therapistConnection))

app.use('/api/v1/promo', promoCodeController(therapistConnection))

app.use('/api/v1/booking', mongoRoutes);

app.use('/api/v1/payment', paystackRoutes);
app.use('/api/v1/errors', errorReportingRoutes);

app.use('/api/v1/payment', flutterwaveRoute);

// app.use('/api/v1/slack', slackNotificationRoute);

// Health check routes (IMPORTANT: Must be available for keep-alive)
app.use('/api/health', healthRoutes);

app.use('/api/v1/auth', authRoute(therapistConnection))
app.use('/api/v1/users', newUserRoute(therapistConnection))
app.use('/api/v1/users', s3Router)
// app.use('/api/v1/users', userRoutes)
// app.use('/api/v1/users', newUserRoute);


app.get('/', (req, res) => {
  serverLogger.info('🏠 Root endpoint accessed');
  res.json({ 
    message: 'Therapy Hub API Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});


// 404 handler
app.use('*', (req, res) => {
  logger.warn('🔍 Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

// if (process.env.ENVIRONMENT === 'production') {
//     exports.handler = serverless(app);
//   } else {
//     app.listen(4000, () => {
//       console.log(`Server is listening on port 4000.`);
//     });
//   }

// Start the server
// const port = process.env.PORT || 4000;
// app.listen(port, () => {
//     console.log(`Server is listening on port ${port}`);
// });

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  // Log server startup
  logServerStart(PORT, process.env.NODE_ENV || 'development');

  // Start background services after server is running
  setTimeout(() => {
    try {
      // Start keep-alive service for Render free tier
      if (process.env.NODE_ENV === 'production' && process.env.RENDER_SERVICE_NAME) {
        serverLogger.info('🌐 Render deployment detected - starting keep-alive service');
        startKeepAlive();
      } else if (process.env.ENABLE_KEEP_ALIVE === 'true') {
        serverLogger.info('🧪 Keep-alive service enabled via environment variable');
        startKeepAlive();
      } else {
        serverLogger.info('💤 Keep-alive service disabled (not needed for local development)');
      }

      // Start payment summary cron job
      schedulePaymentSummaryJob();

      // Log successful startup
      serverLogger.info('🎉 All services started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        keepAlive: process.env.RENDER_SERVICE_NAME ? 'enabled' : 'disabled',
        paymentSummary: 'enabled'
      });

    } catch (error) {
      logError(error, { context: 'service_startup' });
    }
  }, 2000); // Wait 2 seconds for server to fully initialize
});
schedulePaymentSummaryJob();

app.use(middleware(therapistConnection).unknownEndpoint)
app.use(errorReportingMiddleware);
// app.listen(port, ()=> {
//     console.log('Server is listening at port 4000')
// })