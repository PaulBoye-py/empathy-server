// const therapistRouter = require('express').Router()
const express = require('express')
const createTherapistModel = require('../models/therapist')
const middleware = require('../middleware/middleware')
const jwt = require('jsonwebtoken');

module.exports = (connection) => {
  const therapistRouter = express.Router()
  const Therapist = createTherapistModel(connection)

  const { userExtractor } = middleware(connection);

  //  Get all therapists
  therapistRouter.get('/mongo/therapists', async (request, response) => {
    try {
      const { isActive } = request.query;
      let query = {};
      
      // If isActive parameter exists, add it to query
      if (isActive !== undefined) {
        // Convert string 'true'/'false' to boolean
        query.isActive = isActive === 'true';
      }
  
      const therapists = await Therapist.find(query)
      response.json(therapists)
    } catch (error) {
      response.status(500).json({ error: 'Something went wrong' })
    }
  })

  // Create a new therapist
  therapistRouter.post('/mongo/therapists', userExtractor, async (request, response) => {
    const {
      prof_name,
      location,
      profession,
      gender,
      age_range,
      religion,
      marital_status,
      physical,
      physical_naira,
      physical_dollar,
      physical_pounds,
      virtual_naira,
      virtual_dollar,
      virtual_pounds,
      paystack_naira_physical_payment_link,
      paystack_naira_virtual_payment_link,
      image_url,
      title,
      calendly_link,
      discount_physical_naira,
      discount_physical_dollar,
      discount_physical_pounds,
      discount_virtual_naira,
      discount_virtual_dollar,
      discount_virtual_pounds,
      description,
      isActive,
    } = request.body

    const therapist = new Therapist({
      prof_name,
      location,
      profession,
      gender,
      age_range,
      religion,
      marital_status,
      physical,
      physical_naira,
      physical_dollar,
      physical_pounds,
      virtual_naira,
      virtual_dollar,
      virtual_pounds,
      paystack_naira_physical_payment_link,
      paystack_naira_virtual_payment_link,
      image_url,
      title,
      calendly_link,
      discount_physical_naira,
      discount_physical_dollar,
      discount_physical_pounds,
      discount_virtual_naira,
      discount_virtual_dollar,
      discount_virtual_pounds,
      description,
      isActive,
    })

    try {
      const savedTherapist = await therapist.save()
      response.status(201).json(savedTherapist)
    } catch (error) {
      response.status(400).json({ error: 'Failed to save the therapist' })
    }
  })

  // Delete a therapist
  therapistRouter.delete(`/mongo/therapists/:id`, userExtractor, async (request, response) => {
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

    const therapistToDelete = await Therapist.findById(request.params.id)

    if (!therapistToDelete) {
        return response.status(404).json({ error: 'therapist not found' })
    }

    console.log('therapist to delete',therapistToDelete)

    if (decodedToken && therapistToDelete) {
        await Therapist.findByIdAndDelete(request.params.id)
        response.status(204).end()
    } else {
      response.status(403).json({ error: 'this user is not authorized to delete this therapist' })
    }  
})

  // Update an existing therapist
  therapistRouter.put('/mongo/therapists/:id', userExtractor, async (request, response) => {
    const { id } = request.params;
    const updatedInfo = request.body;  // Ensure the body contains the fields to update
  
    try {
      const updatedTherapist = await Therapist.findByIdAndUpdate(id, updatedInfo, { new: true });
      if (updatedTherapist) {
        response.json(updatedTherapist);
      } else {
        response.status(404).json({ error: 'Therapist not found' });
      }
    } catch (error) {
      response.status(400).json({ error: 'Failed to update the therapist' });
    }
  });

  // Fetch a specific therapist
  therapistRouter.get('/mongo/therapists/:id', async (request, response) => {
    const { id } = request.params;
  
    try {
      const therapist = await Therapist.findById(id);
  
      if (!therapist) {
        return response.status(404).json({ error: 'Therapist not found' });
      }
  
      response.json(therapist);
    } catch (error) {
      console.error('Error fetching specific therapist:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  });

  return therapistRouter
}
