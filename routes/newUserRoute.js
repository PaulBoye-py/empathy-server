const express = require('express');
const router = express.Router();
const middleware = require('../middleware/middleware');

const newUserRoute = (connection) => {
  const { userExtractor } = middleware(connection);

  router.get('/current-user', userExtractor, (req, res) => {
    if (req.user) {
      res.send(req.user);
      console.log(`user requested: ${req.user}`);
    } else {
      res.status(404).send({ error: 'User not found' });
    }
  });

  return router;
};

module.exports = newUserRoute;

