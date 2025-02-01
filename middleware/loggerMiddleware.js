const loggerMiddleware = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body:', req.body);

    // Proceed to the next middleware
    next();
};

module.exports = loggerMiddleware;
