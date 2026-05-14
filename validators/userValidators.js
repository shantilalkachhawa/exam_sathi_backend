// validators/userValidators.js

const Joi = require('joi');

const otpVerifySchema = Joi.object({
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'OTP is required',
      'string.pattern.base': 'OTP must be a 6-digit number'
    })
});
const signupSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters long',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters long',
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be valid',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),
  userType: Joi.number().required().messages({
    'string.empty': 'userType is required',
    // 'string.min': 'userType must be at least 6 characters long',
  }),
  // Add any other fields you want here
});

// Login Validation
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be valid',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),
});

const cartSchema = Joi.object({
  cartItems: Joi.array()
    .items(Joi.string().uuid().required())
    .min(1)
    .required()
    .messages({
      'array.base': 'Cart items must be an array',
      'array.min': 'At least one cart item is required',
      'string.uuid': 'Each cart item must be a valid UUID',
    }),

  shippingAddress: Joi.object({
    zip: Joi.string().pattern(/^\d{6}$/).required().messages({
      'string.empty': 'Zip code is required',
      'string.pattern.base': 'Zip code must be 6 digits',
    }),
    city: Joi.string().min(2).required().messages({
      'string.empty': 'City is required',
    }),
    state: Joi.string().min(2).required().messages({
      'string.empty': 'State is required',
    }),
    addressLine1: Joi.string().min(5).required().messages({
      'string.empty': 'Address Line 1 is required',
      'string.min': 'Address Line 1 must be at least 5 characters',
    }),
  }).required(),

  totalAmount: Joi.number().min(1).required().messages({
    'number.base': 'Total amount must be a number',
    'number.min': 'Total amount should be greater than 0',
  }),

  deliveredTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).required().messages({
    'string.empty': 'Delivered time is required',
    'string.pattern.base': 'Delivered time must be in HH:mm:ss format',
  }),

  deliveredDate: Joi.date().iso().required().messages({
    'date.base': 'Delivered date must be a valid date',
    'any.required': 'Delivered date is required',
  }),
});

module.exports = { otpVerifySchema, loginSchema, signupSchema, cartSchema };
