import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getUsers,
  getUserById,
  deleteUser,
} from "../controllers/userController.js";

const router = express.Router();

// User management routes
router.get("/", protect, adminOnly, getUsers); // get all users (Admin only)
router.get("/:id", protect, adminOnly, getUserById); // get a specific user (Admin only)
router.delete("/:id", protect, adminOnly, deleteUser); // delete a user (Admin only)

export default router;
