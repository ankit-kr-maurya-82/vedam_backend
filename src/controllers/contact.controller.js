import { asyncHandler } from '../utils/asyncHandler.js';
import contactModel from '../models/contact.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const createContact = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  const newContact = await contactModel.create({
    name,
    email,
    message
  });

  res.status(201).json(
    new ApiResponse(201, newContact, 'Contact message saved successfully')
  );
});

export {
  createContact
};
