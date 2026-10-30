import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { TextDecoder } from 'node:util';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Browsers send UTF-8 filename bytes, while multipart's legacy default
  // decodes unlabelled parameters as Latin-1. Recover only valid UTF-8 bytes;
  // keep already decoded Unicode and genuine Latin-1 names unchanged.
  if (Array.from(file.originalname).every(character => character.codePointAt(0)! <= 255)) {
    try {
      file.originalname = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
        .decode(Buffer.from(file.originalname, 'latin1'));
    } catch { /* The original name is not UTF-8 encoded Latin-1 data. */ }
  }
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type '${file.mimetype}'. Only JPG, PNG, WEBP, and PDF files are allowed.`
      )
    );
  }
};

export const uploadAttachments = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5, // Maximum 5 files
  },
  fileFilter,
});
