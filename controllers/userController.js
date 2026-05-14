const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Address } = require('../models');
const { getUserIdFromToken } = require('../middlewares/http');
// const Address = require('../models/address');

const SECRET_KEY = process.env.JWT_SECRET || 'kisan_veges';

const userController = {
  createUser: async (req, res) => {
    try {
      const { firstName, lastName, email, ...data } = req.body;

      console.log(req.body, 'req.body')

      if (!firstName || !lastName) {
        return res.status(400).json({ error: 'First name and last name are required' });
      }
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      const fullName = `${firstName} ${lastName}`;
      const newUser = await User.create({ fullName, lastName, firstName, email, ...data });

      const token = jwt.sign({ userId: newUser.id }, SECRET_KEY, { expiresIn: '2h' });
      console.log(token, 'token');


      const plainUser = newUser.toJSON();
      res.status(201).json({ message: 'Signup successful', user: { ...plainUser, token } });
    } catch (err) {
      console.error('Create User Error:', err);
      res.status(400).json({ error: err.message || 'Signup failed' });
    }
  },

  createUserAddresess: async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const existingUser = await User.findOne({ where: { id: userId } });
      if (!existingUser) {
        return res.status(409).json({ error: 'User not exists' });
      }
      const newUser = await Address.create({ userId, ...data });
      res.status(201).json({ message: 'Address added successfully', user: newUser });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  otpVerify: async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
      }

      const { otp } = req.body;
      if (!otp) {
        return res.status(400).json({ error: 'OTP is required' });
      }

      const user = await User.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // TODO: Add real OTP verification logic here

      const token = jwt.sign({ userId: user.id, role: user.userType }, SECRET_KEY, { expiresIn: '7d' });

      const plainUser = user.toJSON();
      const data = { ...plainUser, token };

      res.status(200).json({ res: data });
    } catch (error) {
      console.error('OTP Verify Error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },
  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email: email } });
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      // Password check skipped for now
      const token = jwt.sign({ userId: user.id, role: user.userType }, SECRET_KEY, { expiresIn: '7d' });
      const plainUser = user.toJSON();
      const data = { ...plainUser, token };
      res.status(200).json({ res: data });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },


  getAllUsers: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const order = req.query.order === 'ASC' ? 'ASC' : 'DESC';

      const whereCondition = search ? {
        [Op.or]: [
          { fullName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } },
        ]
      } : {};

      const { count, rows: users } = await User.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [[sortBy, order]],
        // include: [{ model: Address, as: 'addresses' }],
      });

      res.status(200).json({
        message: 'Users list',
        pagination: {
          totalCount: count,
          limit,
          offset,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(count / limit),
        },
        users,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id, {
        include: [{ model: Address }],
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      await user.update(req.body);
      res.json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      await user.destroy();
      res.json({ message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = userController;
