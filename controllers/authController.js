const jwt = require("jsonwebtoken");

const { User } = require("../models");
const RefreshToken = require("../models/refreshToken");

const JWT_SECRET = process.env.JWT_SECRET || "exam_sathi_secret_key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "exam_sathi_refresh_secret_key";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.userType,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

function calculateRefreshExpiresAt() {
  // expiresIn like "30d" isn't directly parseable without a lib; we keep DB in sync with 30 days.
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    const userId = decoded?.userId ?? decoded?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const tokenRow = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        revoked: false,
      },
    });

    if (!tokenRow) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (tokenRow.expires_at && tokenRow.expires_at < new Date()) {
      await tokenRow.update({ revoked: true });
      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Rotate refresh token (old one becomes unusable because DB token is updated).
    await tokenRow.update({
      token: newRefreshToken,
      expires_at: calculateRefreshExpiresAt(),
      revoked: false,
    });

    return res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Refresh failed",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "refreshToken is required",
      });
    }

    await RefreshToken.update(
      { revoked: true },
      {
        where: { token: refreshToken },
      }
    );

    return res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Logout failed",
    });
  }
};

