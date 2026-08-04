const jwt = require("jsonwebtoken");

exports.generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            user_type: user.user_type,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "15m",
        }
    );
};

exports.generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: "30d",
        }
    );
};