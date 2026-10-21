const jwt = require('jsonwebtoken');
const loggedUser = require('../models/User');

module.exports = (connection) => {
    const User = loggedUser(connection);

    const tokenExtractor = (request, response, next) => {
        const authorization = request.get('Authorization');
        if (authorization && authorization.startsWith('Bearer ')) {
            request.token = authorization.replace('Bearer ', '');
        } else {
            request.token = null;
        }
        next();
    };
    
    const userExtractor = async (request, response, next) => {
        const token = request.token;
    
        if (token) {
            try {
                const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
                if (!decodedToken.id) {
                    return response.status(401).json({ error: 'token invalid' });
                }
                request.user = await User.findById(decodedToken.id);
                if (!request.user) {
                    return response.status(404).json({ error: 'User not found' });
                }
            } catch (error) {
                console.error('Token verification error:', error.message);
                return response.status(401).json({ error: 'token invalid' });
            }
        } else {
            return response.status(401).json({ error: 'token missing' });
        }
    
        next();
    };
    

    const unknownEndpoint = (request, response) => {
        response.status(404).send({ error: 'Unknown endpoint' });
    };

    return {
        tokenExtractor,
        userExtractor,
        unknownEndpoint
    };
};


