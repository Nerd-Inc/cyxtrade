import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Upload directory - configurable via environment
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directories exist
const ensureDirectories = async () => {
  const dirs = [
    path.join(UPLOAD_DIR, 'avatars'),
    path.join(UPLOAD_DIR, 'payment-proofs'),
    path.join(UPLOAD_DIR, 'evidence'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Initialize directories on module load
ensureDirectories().catch(console.error);

interface UploadResult {
  url: string;
  filename: string;
}

class UploadService {
  private baseUrl: string;

  constructor() {
    // Base URL for serving files - in production, this would be CDN URL
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Upload and process an avatar image
   * Resizes to 256x256 and converts to WebP
   */
  async uploadAvatar(userId: string, buffer: Buffer): Promise<UploadResult> {
    const filename = `${userId}-${uuidv4()}.webp`;
    const filepath = path.join(UPLOAD_DIR, 'avatars', filename);

    // Process image: resize and convert to webp
    await sharp(buffer)
      .resize(256, 256, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    const url = `${this.baseUrl}/uploads/avatars/${filename}`;

    return { url, filename };
  }

  /**
   * Upload payment proof image
   * Resizes to max 1200px width, keeps aspect ratio
   */
  async uploadPaymentProof(tradeId: string, buffer: Buffer): Promise<UploadResult> {
    const filename = `${tradeId}-${uuidv4()}.webp`;
    const filepath = path.join(UPLOAD_DIR, 'payment-proofs', filename);

    // Process image: resize to max width and convert to webp
    await sharp(buffer)
      .resize(1200, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    const url = `${this.baseUrl}/uploads/payment-proofs/${filename}`;

    return { url, filename };
  }

  /**
   * Upload dispute evidence image
   */
  async uploadEvidence(disputeId: string, buffer: Buffer): Promise<UploadResult> {
    const filename = `${disputeId}-${uuidv4()}.webp`;
    const filepath = path.join(UPLOAD_DIR, 'evidence', filename);

    await sharp(buffer)
      .resize(1200, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    const url = `${this.baseUrl}/uploads/evidence/${filename}`;

    return { url, filename };
  }

  /**
   * Delete a file by URL
   */
  async deleteFile(url: string): Promise<void> {
    try {
      // Extract filepath from URL
      const urlPath = new URL(url).pathname;
      const filepath = path.join('.', urlPath);

      await fs.unlink(filepath);
    } catch (error) {
      // File might not exist, that's okay
      console.warn(`Failed to delete file: ${url}`, error);
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(url: string): Promise<{ exists: boolean; size?: number }> {
    try {
      const urlPath = new URL(url).pathname;
      const filepath = path.join('.', urlPath);
      const stats = await fs.stat(filepath);
      return { exists: true, size: stats.size };
    } catch {
      return { exists: false };
    }
  }
}

export const uploadService = new UploadService();
