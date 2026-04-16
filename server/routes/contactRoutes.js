import express from "express";
import rateLimit from "express-rate-limit";
import { insert, queryAll } from "../config/database.js";
import {
  authenticateUser,
  getUserInfo,
  requireAnyRole,
} from "../middleware/authMiddleware.js";
import supabase from "../config/supabaseClient.js";
import { ROLE_CODES } from "../utils/roleAccessService.js";

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many contact requests. Please try again later." },
});

router.post("/contact", contactLimiter, async (req, res) => {
  const { name, email, subject, message, source } = req.body || {};

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
    return res.status(400).json({ success: false, message: "Invalid name." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) || email.length > 255) {
    return res.status(400).json({ success: false, message: "Invalid email address." });
  }
  if (!subject || typeof subject !== "string" || subject.trim().length === 0 || subject.length > 255) {
    return res.status(400).json({ success: false, message: "Invalid subject." });
  }
  if (!message || typeof message !== "string" || message.trim().length === 0 || message.length > 5000) {
    return res.status(400).json({ success: false, message: "Message must be between 1 and 5000 characters." });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    subject: String(subject).trim(),
    message: String(message).trim(),
    source: source ? String(source).trim().slice(0, 50) : "contact",
    status: "new",
    created_at: new Date().toISOString()
  };

  try {
    await insert("contact_messages", [payload]);
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error saving contact message:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send message right now."
    });
  }
});

router.get(
  "/support/messages",
  authenticateUser,
  getUserInfo(),
  requireAnyRole([ROLE_CODES.SUPPORT]),
  async (req, res) => {
  try {
    const messages = await queryAll("contact_messages", {
      order: { column: "created_at", ascending: false }
    });

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching contact messages:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load messages right now."
    });
  }
}
);

router.patch(
  "/support/messages/:id",
  authenticateUser,
  getUserInfo(),
  requireAnyRole([ROLE_CODES.SUPPORT]),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["new", "read", "resolving", "solved"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    // Update the status using Supabase
    const { data, error } = await supabase
      .from("contact_messages")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating message status:", error);
      return res.status(500).json({ success: false, message: "Failed to update status.", error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    return res.status(200).json({ success: true, message: data[0] });
  } catch (error) {
    console.error("Error updating message status:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update status right now."
    });
  }
}
);

export default router;
