const express = require('express');
const createAppSettings = require('../models/appSettings');
const middleware = require('../middleware/middleware');

module.exports = (therapistConnection, usersConnection) => {
  const router = express.Router();
  const AppSettings = createAppSettings(therapistConnection);
  const { userExtractor } = middleware(usersConnection);

  // GET /api/v1/config/settings — public, no auth required
  // Frontend reads this to know whether NGN/Paystack bookings are enabled
  router.get('/settings', async (req, res) => {
    try {
      const settings = await AppSettings.find({});
      const map = {};
      settings.forEach((s) => { map[s.key] = s.value; });
      res.json({ success: true, settings: map });
    } catch (error) {
      console.error('Error fetching app settings:', error.message);
      res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
  });

  // PUT /api/v1/config/settings/:key — auth required
  router.put('/settings/:key', userExtractor, async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      if (value === undefined) {
        return res.status(400).json({ success: false, message: 'value is required' });
      }

      const setting = await AppSettings.findOneAndUpdate(
        { key },
        {
          value,
          ...(description !== undefined && { description }),
          updatedBy: req.user?.username || req.user?.email || 'admin',
        },
        { new: true, upsert: true, runValidators: true }
      );

      res.json({ success: true, setting });
    } catch (error) {
      console.error('Error updating app setting:', error.message);
      res.status(500).json({ success: false, message: 'Failed to update setting' });
    }
  });

  return router;
};
