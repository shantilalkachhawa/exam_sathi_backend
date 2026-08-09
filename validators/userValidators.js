const Joi = require("joi");

const otpVerifySchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Email must be valid",
  }),
  otp: Joi.string()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "string.empty": "OTP is required",
      "string.pattern.base": "OTP must be a 4-digit number",
    }),
  hash: Joi.string().required().messages({
    "string.empty": "OTP hash is required",
  }),
  user_id: Joi.number().integer().required().messages({
    "any.required": "user_id is required",
  }),
});

const sendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  user_id: Joi.number().integer().required(),
});

const signupSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters long",
  }),
  last_name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 2 characters long",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Email must be valid",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters long",
  }),
  user_type: Joi.string().valid("web", "mobile", "vendor").required().messages({
    "string.empty": "user_type is required",
    "string.valid": "user_type must be one of web, mobile, or vendor",
  }),
  phone_number: Joi.string()
    .pattern(/^\d{10}$/)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be 10 digits",
    }),
}).unknown(false);

/** Login with email OR mobile + password */
const loginSchema = Joi.object({
  identifier: Joi.string().allow("", null),
  email: Joi.string().allow("", null),
  phone: Joi.string().allow("", null),
  phone_number: Joi.string().allow("", null),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters long",
  }),
}).custom((value, helpers) => {
  const id = value.identifier || value.email || value.phone || value.phone_number;
  if (!id || !String(id).trim()) {
    return helpers.message("Email or mobile number is required");
  }
  return value;
});

const cartSchema = Joi.object({
  cartItems: Joi.array()
    .items(Joi.string().uuid().required())
    .min(1)
    .required(),
  shippingAddress: Joi.object({
    zip: Joi.string().pattern(/^\d{6}$/).required(),
    city: Joi.string().min(2).required(),
    state: Joi.string().min(2).required(),
    addressLine1: Joi.string().min(5).required(),
  }).required(),
  totalAmount: Joi.number().min(1).required(),
  deliveredTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .required(),
  deliveredDate: Joi.date().iso().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Email must be valid",
  }),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "string.pattern.base": "OTP must be a 4-digit number",
    }),
  hash: Joi.string().required(),
  user_id: Joi.number().integer().required(),
  new_password: Joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters long",
  }),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters long",
  }),
});

const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  phone_number: Joi.string()
    .pattern(/^\d{10}$/)
    .allow("", null)
    .optional(),
  gender: Joi.string().allow("", null).optional(),
  image_url: Joi.string().uri().allow("", null).optional(),
}).min(1);

const verifyUserSchema = Joi.object({
  is_verified: Joi.boolean().required(),
});

module.exports = {
  otpVerifySchema,
  sendOtpSchema,
  loginSchema,
  signupSchema,
  cartSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyUserSchema,
};
