const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/http");
const validateRequest = require("../middlewares/validate");
const {
  otpVerifySchema,
  sendOtpSchema,
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyUserSchema,
} = require("../validators/userValidators");

router.post("/signup", validateRequest(signupSchema), userController.createUser);
router.post("/login", validateRequest(loginSchema), userController.loginUser);
router.post("/send-otp", validateRequest(sendOtpSchema), userController.sendOtp);
router.post(
  "/verify-otp",
  validateRequest(otpVerifySchema),
  userController.otpVerify
);
// backward-compatible alias
router.post(
  "/otp-verify",
  validateRequest(otpVerifySchema),
  userController.otpVerify
);

router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  userController.forgotPassword
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  userController.resetPassword
);
router.post(
  "/change-password",
  verifyToken,
  validateRequest(changePasswordSchema),
  userController.changePassword
);

router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

router.get("/users", userController.getAllUsers);
router.patch(
  "/users/:id/verify",
  verifyToken,
  validateRequest(verifyUserSchema),
  userController.setUserVerified
);

router.post(
  "/user/create-addreses",
  verifyToken,
  userController.createUserAddresess
);
router.get("/user/:id", verifyToken, userController.getUserById);
router.put(
  "/user/:id/profile",
  verifyToken,
  validateRequest(updateProfileSchema),
  userController.updateProfile
);
router.put("/:id", verifyToken, userController.updateUser);
router.delete("/:id", verifyToken, userController.deleteUser);

module.exports = router;
