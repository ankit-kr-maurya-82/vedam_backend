import fs from "fs";
import path from "path";
import multer from "multer";

const tempUploadDir = path.resolve("public/temp");

const ensureTempDir = () => {
  if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureTempDir();
    cb(null, tempUploadDir);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname || "");
    const baseName = path
      .basename(file.originalname || "upload", extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    cb(null, `${Date.now()}-${baseName || "upload"}${extension}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

