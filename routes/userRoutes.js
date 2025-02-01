const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'superuser') return res.status(403).send('Access denied');
  const users = await User.find();
  res.send(users);
});

router.patch('/:id', auth, async (req, res) => {
  if (req.user.role !== 'superuser') return res.status(403).send('Access denied');
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.send(user);
});

module.exports = (connection) => {
  return router;
};


