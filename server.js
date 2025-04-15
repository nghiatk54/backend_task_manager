import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";

dotenv.config();

const app = express();

// Middleware to handle CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
// app.use("/api/auth", authRoute);
// app.use("/api/user", userRoute);
// app.use("/api/task", taskRoute);
// app.use("/api/report", reportRoute);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
