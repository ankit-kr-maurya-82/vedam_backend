import { Router } from "express";
import {
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  getRazorpayKey,
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes (require authentication)
router.post("/create-order", verifyJWT, createPaymentOrder);
router.post("/verify-payment", verifyJWT, verifyPayment);
router.get("/razorpay-key", verifyJWT, getRazorpayKey);

// Webhook route (no auth needed - Razorpay calls this)
router.post("/webhook", handlePaymentWebhook);

export default router;
