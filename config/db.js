import mongoose from "mongoose";

const RECONNECT_INTERVAL = 5000;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true,
      maxPoolSize: 10,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    setTimeout(connectDB, RECONNECT_INTERVAL);
  }
};

// when disconnected
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected. Attempting to reconnect...");
  setTimeout(connectDB, RECONNECT_INTERVAL);
});

// when error
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  setTimeout(connectDB, RECONNECT_INTERVAL);
});

export default connectDB;
