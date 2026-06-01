import Razorpay from "razorpay";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create payment order
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if already premium
  if (user.subscription?.plan === "premium" && user.subscription?.isActive) {
    throw new ApiError(400, "User is already a premium member");
  }

  const options = {
    amount: 9900, // ₹99 in paise
    currency: "INR",
    receipt: `premium_${userId}_${Date.now()}`,
    notes: {
      userId: userId,
      username: user.username,
      email: user.email,
      planType: "premium",
    },
  };

  const order = await razorpay.orders.create(options);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        order,
        "Payment order created successfully"
      )
    );
});

// Verify payment
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
    throw new ApiError(
      400,
      "Missing required payment verification fields"
    );
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Payment signature verification failed");
  }

  // Update user subscription
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const now = new Date();
  const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  user.subscription = {
    plan: "premium",
    startDate: now,
    renewalDate: renewalDate,
    isActive: true,
  };

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user,
          message: "Payment verified successfully. Premium subscription activated!",
        },
        "Payment verified and subscription updated"
      )
    );
});

// Webhook handler for Razorpay events
const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  // Create HMAC hash of the request body
  const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  // Verify signature
  if (digest !== signature) {
    throw new ApiError(400, "Invalid webhook signature");
  }

  const event = req.body.event;
  const payload = req.body.payload.payment.entity;

  if (event === "payment.authorized" || event === "payment.captured") {
    const userId = payload.notes.userId;
    const user = await User.findById(userId);

    if (user) {
      const now = new Date();
      const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      user.subscription = {
        plan: "premium",
        startDate: now,
        renewalDate: renewalDate,
        isActive: true,
      };

      await user.save();
    }
  }

  return res.status(200).json(new ApiResponse(200, {}, "Webhook processed"));
});

// Get Razorpay key for frontend
const getRazorpayKey = asyncHandler(async (req, res) => {
  const key = process.env.RAZORPAY_KEY_ID;

  if (!key) {
    throw new ApiError(500, "Razorpay key not configured");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { key },
        "Razorpay key fetched successfully"
      )
    );
});

export {
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  getRazorpayKey,
};
