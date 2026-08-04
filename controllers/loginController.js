const {
    generateAccessToken,
    generateRefreshToken,
} = require("../utils/jwt");

const RefreshToken = require("../models/RefreshToken");

const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

await RefreshToken.create({
    user_id: user.id,
    token: refreshToken,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});

return res.json({
    success: true,
    accessToken,
    refreshToken,
    user,
});
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is required",
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        const tokenData = await RefreshToken.findOne({
            where: {
                token: refreshToken,
                revoked: false,
            },
        });

        if (!tokenData) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token",
            });
        }

        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await tokenData.update({
            token: newRefreshToken,
            expires_at: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
        });

        return res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Refresh token expired",
        });
    }
};

exports.logout = async (req, res) => {
    const { refreshToken } = req.body;

    await RefreshToken.update(
        {
            revoked: true,
        },
        {
            where: {
                token: refreshToken,
            },
        }
    );

    return res.json({
        success: true,
        message: "Logout successful",
    });
};