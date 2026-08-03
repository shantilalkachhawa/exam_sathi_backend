require('dotenv').config();

/**
 * Single JWT secret used for both sign and verify.
 * Keep this in sync via JWT_SECRET in .env
 */
const JWT_SECRET = process.env.JWT_SECRET || 'exam_sathi_secret_key';

module.exports = { JWT_SECRET };
