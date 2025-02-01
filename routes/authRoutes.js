const bcrypt = require('bcryptjs');
const express = require('express');
const createUserModel = require('../models/User');
const middleware = require('../middleware/middleware')
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (connection) => {
  const router = express.Router();
  const User = createUserModel(connection);
  const { userExtractor } = middleware(connection);

  // Register a new user
  router.post('/register', async (req, res) => {
    try {
      const { firstName, lastName, phoneNumber, position, username, password, email, role, title } = req.body;

      // Check for existing user by email or username
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(400).json({ msg: 'Email already in use' });
      }

      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        return res.status(400).json({ msg: 'Username already in use' });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user = new User({
        username,
        firstName,
        lastName,
        phoneNumber,
        position,
        passwordHash,
        email,
        role,
        title
      });

      const savedUser = await user.save();
      const token = jwt.sign({ id: savedUser.id, role: savedUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(201).json
      ({ token, user: 
        { id: savedUser.id, 
        email: savedUser.email, 
        username: savedUser.username, 
        role: savedUser.role, 
        firstName: savedUser.firstName, 
        lastName: savedUser.lastName, 
        phoneNumber: savedUser.phoneNumber,
        title: savedUser.title, 
        position: savedUser.position } });
      // res.status(201).json(savedUser);
      console.log('New user created successfully!')
    } catch (error) {
      console.log(`error adding a new user: ${error}`);
      res.status(500).json({ msg: 'Server error when creating a new user', error: error });
    }
  });

  // Login an existing user
  router.post('/login', async (req, res) => {
        try {
          const { email, password } = req.body;
          let user = await User.findOne({ email });
          if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
          }
          
          const isMatch = await bcrypt.compare(password, user.passwordHash);
          if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
          }
          
          const token = jwt.sign({ id: user.id}, process.env.JWT_SECRET, { expiresIn: '1h' });
          res.json({ token, user: 
            { id: user.id, 
            email: user.email, 
            username: user.username, 
            role: user.role, 
            firstName: user.firstName, 
            lastName: user.lastName, 
            phoneNumber: user.phoneNumber,
            title: user.title, 
            position: user.position } });
        } catch (err) {
          console.error(err.message);
          res.status(500).send('Server error');
        }
      });

  // Get current user 
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
