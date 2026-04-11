import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
} = process.env;

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET 
});

const cleanupLocalFile = (localFilePath) => {
    if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    }
};

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            throw new Error("Cloudinary environment variables are missing");
        }

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
             resource_type: "auto"
        });
        // file has been uploaded successfull
        // console.log("file is uploaded on cloudinary", response.url);
        cleanupLocalFile(localFilePath);
        return {
            ...response,
            url: response.secure_url || response.url || ""
        };
        
    } catch (error) {
        cleanupLocalFile(localFilePath);
        throw new Error(error?.message || "Cloudinary upload failed");
    }
};


export { uploadOnCloudinary };
