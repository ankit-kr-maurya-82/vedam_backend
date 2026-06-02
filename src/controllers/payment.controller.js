import Razorpay from "razorpay";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Validate Razorpay credentials helper
const validateRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Check if credentials are configured (not placeholder values)
  
  if (
    !keyId ||
    !keySecret ||
    keyId === RAZORPAY_KEY_ID ||
    keySecret === RAZORPAY_KEY_SECRET
  ) {
    throw new ApiError(
      503,
      "Payment service not configured. Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
    );
  }

  return { keyId, keySecret, webhookSecret };
};

// Initialize Razorpay lazily
const getRazorpayInstance = () => {
  const { keyId, keySecret } = validateRazorpayCredentials();

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

// Create payment order
const createPaymentOrder = asyncHandler(async (req, res) => {
  const razorpay = getRazorpayInstance();
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
    amount: 100, // ₹99 in paise
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
  const { keySecret } = validateRazorpayCredentials();
  
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
  } = req.body;

  console.log("🔐 Payment Verification:", {
    razorpay_order_id: razorpay_order_id?.substring(0, 10),
    userId: userId?.substring(0, 10),
  });

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
    throw new ApiError(
      400,
      "Missing required payment verification fields"
    );
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.error("❌ Signature mismatch");
    throw new ApiError(400, "Payment signature verification failed");
  }

  console.log("✅ Signature verified");

  // Update user subscription
  const now = new Date();
  const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        "subscription.plan": "premium",
        "subscription.startDate": now,
        "subscription.renewalDate": renewalDate,
        "subscription.isActive": true,
      },
    },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    console.error("❌ User not found or update failed:", userId);
    throw new ApiError(404, "User not found or update failed");
  }

  console.log("✅ User subscription updated:", {
    userId: updatedUser._id.toString().substring(0, 10),
    plan: updatedUser.subscription?.plan,
    isActive: updatedUser.subscription?.isActive,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: updatedUser,
          message: "Payment verified successfully. Premium subscription activated!",
        },
        "Payment verified and subscription updated"
      )
    );
});

// Webhook handler for Razorpay events
const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const { webhookSecret } = validateRazorpayCredentials();
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    throw new ApiError(400, "Webhook signature header missing");
  }

  // Create HMAC hash of the request body
  const shasum = crypto.createHmac("sha256", webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  // Verify signature
  if (digest !== signature) {
    console.error("❌ Webhook signature verification failed");
    throw new ApiError(400, "Invalid webhook signature");
  }

  const event = req.body.event;
  const payload = req.body.payload.payment.entity;

  if (event === "payment.authorized" || event === "payment.captured") {
    const userId = payload.notes.userId;
    console.log("✅ Webhook event processed:", event, "UserId:", userId?.substring(0, 10));
    
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
      console.log("✅ User subscription updated via webhook");
    }
  }

  return res.status(200).json(new ApiResponse(200, {}, "Webhook processed"));
});

// Get Razorpay key for frontend
const getRazorpayKey = asyncHandler(async (req, res) => {
  const { keyId } = validateRazorpayCredentials();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { key: keyId },
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
