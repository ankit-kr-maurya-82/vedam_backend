import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),

  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads allowed"));
    }
    cb(null, true);
  },

  limits: {
    fileSize: 15 * 1024 * 1024, // Increased to 15MB for Vercel
  },
});