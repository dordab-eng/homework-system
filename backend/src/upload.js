import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('فرمت فایل پشتیبانی نمی‌شود'), ok);
  },
});

export async function uploadToCloudinary(buffer, mimeType = 'image/jpeg') {
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'homework', resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    ).end(buffer);
  });
}
