import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (fileBuffer) => {
  try {
    if (!fileBuffer) return null;

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            folder: "posts",
          },
          (error, result) => {
            if (error) return reject(error);

            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        )
        .end(fileBuffer);
    });
  } catch (error) {
    throw new Error(error.message || "Cloudinary upload failed");
  }
};

export { uploadOnCloudinary };