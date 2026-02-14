/**
 * Cloudinary Upload Utility
 * Handles unsigned uploads to Cloudinary using Fetch API.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads a file to Cloudinary.
 * @param {File} file - The file to upload.
 * @param {string} folder - Optional folder name in Cloudinary (requires preset configuration often).
 * @returns {Promise<string>} - The public URL of the uploaded image.
 */
export const uploadImage = async (file, folder = "oishi") => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary configuration is missing in .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Error uploading to Cloudinary",
      );
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};
