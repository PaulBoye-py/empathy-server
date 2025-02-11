const express = require('express');
const createPromoCodeController = require('../models/promoCode')
const middleware = require('../middleware/middleware')
const jwt = require('jsonwebtoken');


module.exports = (connection) => {
  const promoCodeRouter = express.Router()
  const PromoCode = createPromoCodeController(connection)

  const { userExtractor } = middleware(connection);

  //  Get all promo codes
  promoCodeRouter.get('/promo_codes', async (request, response) => {
    try {
      const promoCodes = await PromoCode.find({})
      response.json(promoCodes)
    } catch (error) {
      response.status(500).json({ error: 'Something went wrong when retrieving promo code' })
    }
  })

  // Create a new promo code
  promoCodeRouter.post('/promo_codes', userExtractor, async (request, response) => {
    const {
      code,
      discount,
      isActive,
      type,
      description,
      startDate,
      endDate
    } = request.body

    const promoCode = new PromoCode({
      code,
      discount,
      isActive,
      type,
      description,
      startDate,
      endDate
    })

    try {
      const savedPromoCode = await promoCode.save()
      response.status(201).json(savedPromoCode)
    } catch (error) {
      response.status(400).json({ error: `Failed to save the promo code, ${error}` })
    }
  })

  // Delete a promo code
  promoCodeRouter.delete(`/promo_codes/:id`, userExtractor, async (request, response) => {
    const user = request.user
    if (!user) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    // verify that the user is signed in before deleting a therapist
    const decodedToken = jwt.verify(request.token, process.env.JWT_SECRET)
    if (!decodedToken.id) {
        return response.status(401).json({ error: 'token invalid' })
    }
    console.log('decoded user', decodedToken.id)

    const promoCodeToDelete = await PromoCode.findById(request.params.id)

    if (!promoCodeToDelete) {
        return response.status(404).json({ error: 'promo code not found' })
    }

    console.log('promo code to delete',promoCodeToDelete)

    if (decodedToken && promoCodeToDelete) {
        await PromoCode.findByIdAndDelete(request.params.id)
        response.status(204).end()
    } else {
      response.status(403).json({ error: 'this user is not authorized to delete this promo code' })
    }  
})

  // Update an existing promo code
  promoCodeRouter.put('/promo_codes/:id', userExtractor, async (request, response) => {
    const { id } = request.params;
    const updatedInfo = request.body;  // Ensure the body contains the fields to update
  
    try {
      const updatedPromoCode = await PromoCode.findByIdAndUpdate(id, updatedInfo, { new: true });
      if (updatedPromoCode) {
        response.json(updatedPromoCode);
      } else {
        response.status(404).json({ error: 'Promo Code not found' });
      }
    } catch (error) {
      response.status(400).json({ error: 'Failed to update the promo code' });
    }
  });

  // Fetch a specific promo code
  promoCodeRouter.get('/promo_codes/:id', async (request, response) => {
    const { id } = request.params;
  
    try {
      const promoCode = await PromoCode.findById(id);
  
      if (!promoCode) {
        return response.status(404).json({ error: 'Promo Code not found' });
      }
  
      response.json(promoCode);
    } catch (error) {
      console.error('Error fetching specific promo code:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get a promo code by its name
  promoCodeRouter.get('/promo_codes/by_name/:name', async (request, response) => {
    const { name } = request.params;

    const date = new Date()
  
    try {
      const promoCode = await PromoCode.findOne({ code: name });
  
      if (!promoCode) {
        return response.status(404).json({ error: 'Promo Code not found' });
      }

      if (promoCode.endDate < date) {
        return response.status(404).json({ error: 'Promo Code has expired' });
      }
  
      response.status(200).json({ promoCode, message: 'Promo Code is valid' });

      
    } catch (error) {
      console.error('Error fetching specific promo code:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get promo codes by their status
  promoCodeRouter.get('/promo_codes/by_status/:status', async (request, response) => {
    const { status } = request.params;
  
    try {
      const promoCodes = await PromoCode.find({ isActive: status });
  
      if (!promoCodes || promoCodes.length === 0) {
        return response.status(404).json({ error: 'No promo codes found with this status' });
      }
  
      response.json(promoCodes);
    } catch (error) {
      console.error('Error fetching promo codes by status:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get promo codes by their date range

  return promoCodeRouter
}