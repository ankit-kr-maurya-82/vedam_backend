import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export const uploadOnCloudinary = async (file) => {
  console.log('☁️ [CLOUDINARY] uploadOnCloudinary called, buffer:', file?.buffer?.length);
  if (!file?.buffer) {
    console.log('⚠️ [CLOUDINARY] No buffer provided');
    return null;
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "avatars",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    ).end(file.buffer);
  });
};