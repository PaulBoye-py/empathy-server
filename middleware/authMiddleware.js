const jwt = require('jsonwebtoken');
const User = require('../models/User');

const tokenExtractor = (request, response, next) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.startsWith('Bearer ')) {
        request.token = authorization.replace('Bearer ', '')
    } else {
        request.token = null
    }
    next()
}

const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: 'Unknown endpoint'})
}

module.exports = {
    tokenExtractor,
    unknownEndpoint
}