const crypto = require("crypto");

const OTP_SECRET =
  process.env.OTP_SECRET || process.env.JWT_SECRET || "exam_sathi_otp_secret";
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 5 * 60 * 1000);
const OTP_DIGITS = 4;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

/**
 * Free tier OTP delivery:
 * - Always logs OTP in backend terminal (no paid gateway required)
 * - Optional FAST2SMS later for phone SMS
 * - Email channel is console for now (hook SMTP later)
 */
async function deliverOtp(destination, otp, channel = "email") {
  console.log(`\n--- [FREE OTP GATEWAY] ---`);
  console.log(`Channel : ${channel}`);
  console.log(`To      : ${destination}`);
  console.log(`OTP     : [ ${otp} ]`);
  console.log(`Expires : ${Math.round(OTP_TTL_MS / 60000)} min`);
  console.log(`--------------------------\n`);

  // Future: plug nodemailer / Resend / Fast2SMS here
  if (channel === "sms" && process.env.FAST2SMS_API_KEY) {
    try {
      const params = new URLSearchParams({
        authorization: process.env.FAST2SMS_API_KEY,
        route: "otp",
        variables_values: otp,
        flash: "0",
        numbers: normalizePhone(destination),
      });
      const response = await fetch(
        `https://www.fast2sms.com/dev/bulkV2?${params.toString()}`,
        { method: "GET" }
      );
      const data = await response.json().catch(() => ({}));
      console.log("[Fast2SMS]", data);
      return { channel: "fast2sms", delivered: Boolean(data?.return), raw: data };
    } catch (err) {
      console.error("[Fast2SMS] failed:", err.message);
    }
  }

  return { channel: "console", delivered: true };
}

function generateOtpCode() {
  const min = 10 ** (OTP_DIGITS - 1);
  const max = 10 ** OTP_DIGITS;
  return crypto.randomInt(min, max).toString();
}

/**
 * Stateless HMAC OTP (same approach as your shared sample).
 * hash format: `${hmac}.${expires}`
 * data: `${email}.${otp}.${expires}`
 */
function createOtpPayload(email) {
  const normalized = normalizeEmail(email);
  const otp = generateOtpCode();
  const expires = Date.now() + OTP_TTL_MS;
  const data = `${normalized}.${otp}.${expires}`;
  const hashValue = crypto
    .createHmac("sha256", OTP_SECRET)
    .update(data)
    .digest("hex");

  return {
    otp,
    email: normalized,
    hash: `${hashValue}.${expires}`,
    expires_at: new Date(expires).toISOString(),
  };
}

function verifyOtpPayload({ email, otp, hash }) {
  if (!email || !otp || !hash) {
    return { ok: false, error: "Email, OTP and hash are required" };
  }

  const normalized = normalizeEmail(email);
  const parts = String(hash).split(".");

  // Expected format from /send-otp: `${hmacHex}.${expiresMs}`
  if (parts.length !== 2) {
    return {
      ok: false,
      error:
        "Invalid OTP hash. Copy the exact `hash` value returned by /send-otp (do not use a placeholder).",
    };
  }

  const [hashValue, expiresRaw] = parts;
  const expires = Number(expiresRaw);

  if (!hashValue || !Number.isFinite(expires)) {
    return {
      ok: false,
      error:
        "Invalid OTP hash. Copy the exact `hash` value returned by /send-otp (do not use a placeholder).",
    };
  }

  if (Date.now() > expires) {
    return { ok: false, error: "OTP expired. Please request a new one." };
  }

  const data = `${normalized}.${String(otp).trim()}.${expires}`;
  const calculated = crypto
    .createHmac("sha256", OTP_SECRET)
    .update(data)
    .digest("hex");

  if (calculated !== hashValue) {
    return { ok: false, error: "Invalid OTP code entered." };
  }

  return { ok: true, email: normalized };
}

module.exports = {
  OTP_DIGITS,
  normalizeEmail,
  normalizePhone,
  createOtpPayload,
  verifyOtpPayload,
  deliverOtp,
};
