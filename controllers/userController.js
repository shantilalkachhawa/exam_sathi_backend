const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User, Address, Subscription, Roles } = require("../models");
const RefreshToken = require("../models/refreshToken");
const {
  createOtpPayload,
  verifyOtpPayload,
  deliverOtp,
  normalizePhone,
  normalizeEmail,
} = require("../utils/otp");

const SECRET_KEY = process.env.JWT_SECRET || "exam_sathi_secret_key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "exam_sathi_refresh_secret_key";

function toSafeUser(user) {
  const plain = typeof user.toJSON === "function" ? user.toJSON() : { ...user };
  const { password: _password, ...safeUser } = plain;
  return safeUser;
}

async function issueAuthTokens(user) {
  const token = jwt.sign(
    { userId: user.id, role: user.user_type },
    SECRET_KEY,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });

  await RefreshToken.create({
    user_id: user.id,
    token: refreshToken,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revoked: false,
  });

  return {
    ...toSafeUser(user),
    token,
    refreshToken,
  };
}

/** Email OTP challenge (free console gateway for now) */
async function startOtpChallenge(user) {
  const email = normalizeEmail(user.email);
  if (!email) {
    const err = new Error("Email is required for OTP verification.");
    err.status = 400;
    throw err;
  }

  const { otp, hash, expires_at } = createOtpPayload(email);
  await deliverOtp(email, otp, "email");

  return {
    requires_otp: true,
    message: "OTP sent successfully. Please verify to continue.",
    user_id: user.id,
    email,
    hash,
    expires_at,
    // Free tier: OTP is printed in backend terminal; also returned when OTP_DEBUG is not false
    debug_otp: process.env.OTP_DEBUG === "false" ? undefined : otp,
    tip: "Use the exact `hash` from this response in /verify-otp (do not use a placeholder).",
  };
}

function resolveLoginIdentifier(body) {
  const raw =
    body.identifier || body.email || body.phone || body.phone_number || "";
  return String(raw).trim();
}

const userController = {
  createUser: async (req, res) => {
    try {
      const { first_name, last_name, email, phone_number, password, ...data } =
        req.body;

      if (!first_name || !last_name) {
        return res
          .status(400)
          .json({ error: "First name and last name are required" });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const phone = phone_number ? normalizePhone(phone_number) : "";
      if (phone_number && phone.length !== 10) {
        return res
          .status(400)
          .json({ error: "Phone number must be 10 digits" });
      }

      const existingEmail = await User.findOne({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        // Unverified account → resend OTP instead of hard "email exists"
        if (!existingEmail.is_verified) {
          await existingEmail.update({
            full_name: `${first_name} ${last_name}`,
            password,
            phone_number: phone || existingEmail.phone_number,
            user_type: data.user_type || existingEmail.user_type || "mobile",
          });

          const otpPayload = await startOtpChallenge(existingEmail);
          return res.status(200).json({
            code: "UNVERIFIED_ACCOUNT",
            message:
              "Account exists but is not verified. OTP resent — please verify to continue.",
            ...otpPayload,
            user: toSafeUser(existingEmail),
          });
        }

        return res.status(409).json({
          code: "EMAIL_TAKEN",
          error: "Email already exists",
        });
      }

      if (phone) {
        const existingPhone = await User.findOne({
          where: { phone_number: phone },
        });
        if (existingPhone) {
          if (!existingPhone.is_verified) {
            // Phone owned by unverified user — if same email path already handled;
            // different email: still block phone reuse
            if (normalizeEmail(existingPhone.email) !== normalizedEmail) {
              return res.status(409).json({
                code: "PHONE_TAKEN",
                error: "Phone number already exists",
              });
            }
          } else {
            return res.status(409).json({
              code: "PHONE_TAKEN",
              error: "Phone number already exists",
            });
          }
        }
      }

      const full_name = `${first_name} ${last_name}`;
      const newUser = await User.create({
        full_name,
        email: normalizedEmail,
        phone_number: phone || null,
        password,
        is_verified: false,
        ...data,
      });

      const otpPayload = await startOtpChallenge(newUser);

      return res.status(201).json({
        message: "Signup successful. Verify OTP to continue.",
        ...otpPayload,
        user: toSafeUser(newUser),
      });
    } catch (err) {
      console.error("Create User Error:", err);
      return res
        .status(err.status || 400)
        .json({ error: err.message || "Signup failed" });
    }
  },

  createUserAddresess: async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const existingUser = await User.findOne({ where: { id: userId } });
      if (!existingUser) {
        return res.status(409).json({ error: "User not exists" });
      }
      const newUser = await Address.create({ userId, ...data });
      res
        .status(201)
        .json({ message: "Address added successfully", user: newUser });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  /** POST /api/send-otp — resend email OTP */
  sendOtp: async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const userId = Number(req.body.user_id);

      if (!email || !userId) {
        return res
          .status(400)
          .json({ error: "email and user_id are required" });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (normalizeEmail(user.email) !== email) {
        return res
          .status(403)
          .json({ error: "Email does not match this account" });
      }

      const otpPayload = await startOtpChallenge(user);
      return res.status(200).json(otpPayload);
    } catch (err) {
      console.error("Send OTP Error:", err);
      return res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to send OTP" });
    }
  },

  /** POST /api/verify-otp — verify 4-digit email OTP then issue tokens */
  otpVerify: async (req, res) => {
    try {
      const { email, otp, hash, user_id } = req.body;

      const checked = verifyOtpPayload({ email, otp, hash });
      if (!checked.ok) {
        return res.status(400).json({ error: checked.error });
      }

      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (normalizeEmail(user.email) !== checked.email) {
        return res
          .status(403)
          .json({ error: "Email does not match this account" });
      }

      await user.update({ is_verified: true });

      const authUser = await issueAuthTokens(user);

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        res: authUser,
      });
    } catch (error) {
      console.error("OTP Verify Error:", error);
      return res
        .status(500)
        .json({ error: error.message || "OTP verification failed" });
    }
  },

  /** POST /api/login — email OR mobile + password → email OTP */
  loginUser: async (req, res) => {
    try {
      const identifier = resolveLoginIdentifier(req.body);
      const { password } = req.body;

      if (!identifier) {
        return res
          .status(400)
          .json({ error: "Email or mobile number is required" });
      }

      const phoneCandidate = normalizePhone(identifier);
      const isPhone = /^\d{10}$/.test(phoneCandidate);
      const where = isPhone
        ? { phone_number: phoneCandidate }
        : { email: normalizeEmail(identifier) };

      const user = await User.findOne({ where });
      if (!user) {
        return res
          .status(401)
          .json({ error: "Invalid email/mobile or password" });
      }

      if (password && user.password && user.password !== password) {
        return res
          .status(401)
          .json({ error: "Invalid email/mobile or password" });
      }

      // Unverified mobile users must verify OTP before using the app
      if (user.user_type === "mobile" && !user.is_verified) {
        const otpPayload = await startOtpChallenge(user);
        return res.status(200).json({
          code: "UNVERIFIED_ACCOUNT",
          message: "Account is not verified. OTP sent — please verify to continue.",
          ...otpPayload,
          user: toSafeUser(user),
        });
      }

      // Verified mobile (and web/admin): issue tokens — no OTP on every login
      const authUser = await issueAuthTokens(user);
      return res.status(200).json({
        message: "Login successful",
        res: authUser,
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res
        .status(error.status || 500)
        .json({ error: error.message || "Login failed" });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const search = req.query.search || "";
      const sortBy = req.query.sortBy || "createdAt";
      const order = req.query.order === "ASC" ? "ASC" : "DESC";

      const whereCondition = search
        ? {
            [Op.or]: [
              { full_name: { [Op.like]: `%${search}%` } },
              { email: { [Op.like]: `%${search}%` } },
              { phone_number: { [Op.like]: `%${search}%` } },
            ],
          }
        : {};

      const { count, rows: users } = await User.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [[sortBy, order]],
        distinct: true,
        include: [
          {
            model: Subscription,
            as: "subscription",
          },
          {
            model: Roles,
            as: "roles",
            attributes: ["id", "name", "status"],
            through: { attributes: ["status"] },
          },
        ],
      });

      res.status(200).json({
        message: "Users list",
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
        include: [
          { model: Address },
          { model: Subscription, as: "subscription" },
        ],
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(toSafeUser(user));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /** POST /api/forgot-password — send OTP for password reset */
  forgotPassword: async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      if (!email) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const user = await User.findOne({ where: { email } });

      // Anti-enumeration: same message whether user exists or not
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If an account exists, an OTP has been sent.",
          requires_otp: false,
        });
      }

      const otpPayload = await startOtpChallenge(user);
      return res.status(200).json({
        success: true,
        code: "PASSWORD_RESET_OTP",
        message: "OTP sent. Enter OTP and your new password.",
        ...otpPayload,
      });
    } catch (err) {
      console.error("Forgot Password Error:", err);
      return res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to start password reset" });
    }
  },

  /** POST /api/reset-password — verify OTP + set new password */
  resetPassword: async (req, res) => {
    try {
      const { email, otp, hash, user_id, new_password } = req.body;

      if (!new_password || String(new_password).length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters" });
      }

      const checked = verifyOtpPayload({ email, otp, hash });
      if (!checked.ok) {
        return res.status(400).json({ error: checked.error });
      }

      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (normalizeEmail(user.email) !== checked.email) {
        return res
          .status(403)
          .json({ error: "Email does not match this account" });
      }

      await user.update({
        password: new_password,
        is_verified: true,
      });

      return res.status(200).json({
        success: true,
        message: "Password updated successfully. Please login.",
      });
    } catch (err) {
      console.error("Reset Password Error:", err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to reset password" });
    }
  },

  /** POST /api/change-password — logged-in user */
  changePassword: async (req, res) => {
    try {
      const userId = Number(req.user?.id);
      const { current_password, new_password } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!current_password || !new_password) {
        return res
          .status(400)
          .json({ error: "current_password and new_password are required" });
      }
      if (String(new_password).length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters" });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.password !== current_password) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      await user.update({ password: new_password });
      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (err) {
      console.error("Change Password Error:", err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to change password" });
    }
  },

  /** PUT /api/user/:id/profile — allowlisted self profile update */
  updateProfile: async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      const requesterId = Number(req.user?.id);

      if (!requesterId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (requesterId !== targetId) {
        return res
          .status(403)
          .json({ error: "You can only update your own profile" });
      }

      const user = await User.findByPk(targetId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const allowed = {};
      if (req.body.full_name != null) {
        const name = String(req.body.full_name).trim();
        if (name.length < 2) {
          return res
            .status(400)
            .json({ error: "Full name must be at least 2 characters" });
        }
        allowed.full_name = name;
      }
      if (req.body.phone_number != null) {
        const phone = req.body.phone_number
          ? normalizePhone(req.body.phone_number)
          : null;
        if (phone && phone.length !== 10) {
          return res
            .status(400)
            .json({ error: "Phone number must be 10 digits" });
        }
        if (phone) {
          const taken = await User.findOne({
            where: {
              phone_number: phone,
              id: { [Op.ne]: targetId },
            },
          });
          if (taken) {
            return res
              .status(409)
              .json({ error: "Phone number already exists" });
          }
        }
        allowed.phone_number = phone;
      }
      if (req.body.gender != null) {
        allowed.gender = req.body.gender || null;
      }
      if (req.body.image_url != null) {
        allowed.image_url = req.body.image_url || null;
      }

      await user.update(allowed);
      return res.json({
        success: true,
        message: "Profile updated",
        user: toSafeUser(user),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  /** PATCH /api/users/:id/verify — admin can verify / unverify */
  setUserVerified: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const isVerified =
        req.body.is_verified === true ||
        req.body.is_verified === "true" ||
        req.body.is_verified === 1;

      await user.update({ is_verified: Boolean(isVerified) });

      return res.json({
        success: true,
        message: isVerified ? "User verified" : "User marked as unverified",
        user: toSafeUser(user),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Prevent casual clients from flipping verification / password via generic PUT
      const {
        password: _pw,
        is_verified: _iv,
        user_type: _ut,
        ...safeBody
      } = req.body || {};

      await user.update(safeBody);
      res.json(toSafeUser(user));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      await user.destroy();
      res.json({ message: "User deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = userController;
