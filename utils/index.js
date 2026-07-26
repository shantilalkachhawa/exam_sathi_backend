const Razorpay = require('razorpay');
const crypto = require('crypto');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });


// async function createRazorpayOrder(amountInRupees) {
//   try {
//     const orderOptions = {
//       amount: amountInRupees * 100, // Razorpay expects paise
//       currency: 'INR',
//       receipt: `receipt_order_${Date.now()}`,
//       payment_capture: 1,
//     };

//     const order = await razorpay.orders.create(orderOptions);
//     console.log('Razorpay Order created:', order);
//     return order;
//   } catch (error) {
//     console.error('Error creating Razorpay order:', error);
//     throw error;
//   }
// }
// async function verifyRazorpayPayment(req) {
//   const secret = process.env.RAZORPAY_KEY_SECRET;
//   const { orderId, paymentId, razorpaySignature } = req;

//   const generatedSignature = crypto
//     .createHmac('sha256', secret)
//     .update(`${orderId}|${paymentId}`)
//     .digest('hex');

//   return generatedSignature === razorpaySignature;
// }

// helpers/notify.js
// Replace the console.log with Twilio / WhatsApp / any SMS provider integration

async function sendVendorNotification(mobileNumber, message) {
  // Example: integrate Twilio here.
  // const twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
  // await twilio.messages.create({ to: mobileNumber, from: TWILIO_FROM, body: message });

  console.log(`[NOTIFY] -> To: ${mobileNumber} | Message: ${message}`);
}
const calculateRemainingSeconds = (
  startedAt,
  durationMinutes
) => {

  const started = new Date(startedAt);

  const now = new Date();

  const elapsed = Math.floor(
    (now.getTime() - started.getTime()) / 1000
  );

  const totalSeconds = durationMinutes * 60;


  return Math.max(totalSeconds - elapsed, 0);
}
const isTimeExpired = (startedAt,durationMinutes) => {
  return (
    exports.calculateRemainingSeconds(
      startedAt,
      durationMinutes
    ) <= 0
  );
};


module.exports = {  sendVendorNotification ,calculateRemainingSeconds, isTimeExpired };
