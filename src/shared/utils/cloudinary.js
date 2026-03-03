/**
 * Cloudinary Upload Utility
 * Handles unsigned uploads to Cloudinary using Fetch API.
 * Valida tipo MIME y tamaño para evitar subida de archivos no permitidos.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/** Tipos MIME permitidos (excluye SVG por riesgo XSS). */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Comprueba si el archivo es una imagen permitida y no excede el tamaño.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateImageFile = (file) => {
  if (!file || !(file instanceof File)) {
    return { valid: false, error: 'Archivo no válido.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'La imagen es muy pesada (máx. 5 MB).' };
  }
  const type = (file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    return { valid: false, error: 'Solo se permiten imágenes JPG, PNG o WebP.' };
  }
  return { valid: true };
};

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

  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
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
      const msg = errorData.error?.message || "Error uploading to Cloudinary";
      if (msg.toLowerCase().includes("preset") && msg.toLowerCase().includes("not found")) {
        throw new Error("Configuración de Cloudinary: el Upload Preset no existe. Revisa .env (VITE_CLOUDINARY_UPLOAD_PRESET) y crea un preset sin firmar en cloudinary.com.");
      }
      throw new Error(msg);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    throw error;
  }
};
