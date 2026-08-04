const express = require('express')
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middlewares/http');
const validateRequest = require('../middlewares/validate');
const { otpVerifySchema, signupSchema, loginSchema } = require('../validators/userValidators');


router.post('/signup', validateRequest(signupSchema), userController.createUser);
router.post('/login', validateRequest(loginSchema), userController.loginUser);
router.post("/refresh-token", authController.refreshToken);

router.post("/logout", authController.logout);
router.post('/otp-verify', validateRequest(otpVerifySchema), userController.otpVerify);
// router.get('/users', verifyToken, isAdmin, userController.getAllUsers);
router.get('/users', userController.getAllUsers);
router.post('/user/create-addreses', verifyToken, userController.createUserAddresess);
router.get('/user/:id', verifyToken, userController.getUserById);
router.put('/:id', verifyToken, userController.updateUser);
router.delete('/:id', verifyToken, userController.deleteUser);


module.exports = router 