const { Payment } = require("../models");

/**
 * Create pending payment (gateway flow start)
 */
exports.createPendingPayment = async (
  {
    userId,
    subscriptionId,
    amount,
    paymentMethod = "manual",
    transactionId = null,
    gatewayResponse = null,
  },
  transaction
) => {
  return Payment.create(
    {
      user_id: userId,
      subscription_id: subscriptionId,
      amount,
      payment_method: paymentMethod,
      payment_status: "pending",
      transaction_id: transactionId,
      gateway_response: gatewayResponse,
      paid_at: null,
    },
    { transaction }
  );
};

/**
 * Mark payment success (after gateway verify or manual purchase)
 */
exports.markPaymentSuccess = async (
  payment,
  { transactionId = null, gatewayResponse = null } = {},
  transaction
) => {
  await payment.update(
    {
      payment_status: "success",
      transaction_id: transactionId || payment.transaction_id,
      gateway_response: gatewayResponse || payment.gateway_response,
      paid_at: new Date(),
    },
    { transaction }
  );
  return payment;
};

/**
 * Create success payment in one step (manual / free skip uses no payment)
 */
exports.createSuccessPayment = async (
  {
    userId,
    subscriptionId,
    amount,
    paymentMethod = "manual",
    transactionId = null,
    gatewayResponse = null,
  },
  transaction
) => {
  return Payment.create(
    {
      user_id: userId,
      subscription_id: subscriptionId,
      amount,
      payment_method: paymentMethod,
      payment_status: "success",
      transaction_id: transactionId,
      gateway_response: gatewayResponse,
      paid_at: new Date(),
    },
    { transaction }
  );
};

/**
 * Mark failed
 */
exports.markPaymentFailed = async (payment, gatewayResponse, transaction) => {
  await payment.update(
    {
      payment_status: "failed",
      gateway_response: gatewayResponse,
    },
    { transaction }
  );
  return payment;
};

/**
 * User payment history
 */
exports.getUserPayments = async (userId) => {
  return Payment.findAll({
    where: { user_id: userId },
    order: [["id", "DESC"]],
  });
};

/**
 * Find by transaction id
 */
exports.findByTransactionId = async (transactionId) => {
  if (!transactionId) return null;
  return Payment.findOne({ where: { transaction_id: transactionId } });
};
