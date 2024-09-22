const express = require("express");
const dbConnect = require("./database/dbConnect");
const app = express();
require("dotenv").config();
const movieRoute = require("./routes/movieRoute");
const userFeedback = require("./routes/feedbackRoute");
const multer = require("multer");
const cors = require("cors");
const { error } = require("./services/errors");
const morgan = require("morgan");
const helmet = require("helmet");  // For security headers
const compression = require("compression");  // For performance
const rateLimit = require("express-rate-limit");  // For rate limiting
const nodeCache = require("./services/cacheing");  // Custom caching logic
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());
app.use(helmet());  // Add security headers
app.use(compression());  // Compress response bodies

// Rate Limiting (e.g., max 100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});
app.use(limiter);

// Multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/"); // Store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Create unique file names
  },
});

// Multer file filtering and size limits
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (
      ["image/png", "image/jpeg", "image/webp", "image/avif", "image/jpg"].includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .png, .jpg, .webp, .avif, and .jpeg formats are allowed!"), false);
    }
  },
});

// Routes with file handling
app.use(
  "/api/v1/movie",
  upload.fields([
    { name: "posterIMG", maxCount: 1 }, // Single poster image
    { name: "availQualitySample", maxCount: 4 }, // Multiple quality samples (up to 4)
  ]),
  movieRoute
);

app.use(
  "/api/v1/feedback",
  upload.single("complainSampleIMG"),
  userFeedback
);

// Health check route
app.get("/", (req, res) => {
  return res.status(200).send("Hello World");
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);  // Log the error stack for debugging
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// Connect to database
dbConnect();

// Graceful shutdown for production use
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
  });
});
