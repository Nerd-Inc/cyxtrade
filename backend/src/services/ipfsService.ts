/**
 * IPFS Service
 * Handles file uploads to IPFS via Pinata
 *
 * Pinata is a managed IPFS pinning service that provides:
 * - Easy file upload API
 * - Reliable IPFS gateway for retrieval
 * - File persistence (pinning)
 */

import axios from 'axios';
import FormData from 'form-data';

// Configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET = process.env.PINATA_SECRET || '';
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

const PINATA_API_URL = 'https://api.pinata.cloud';

/**
 * Check if Pinata is configured
 */
export function isPinataEnabled(): boolean {
  return !!(PINATA_API_KEY && PINATA_SECRET);
}

/**
 * Upload a file to IPFS via Pinata
 *
 * @param buffer File content as buffer
 * @param filename Original filename
 * @param metadata Optional metadata for the file
 * @returns IPFS CID (Content Identifier)
 */
export async function uploadToIPFS(
  buffer: Buffer,
  filename: string,
  metadata?: Record<string, string>
): Promise<string> {
  if (!isPinataEnabled()) {
    throw new Error('Pinata not configured');
  }

  const formData = new FormData();

  // Append file
  formData.append('file', buffer, {
    filename,
    contentType: getContentType(filename),
  });

  // Add metadata if provided
  if (metadata) {
    formData.append('pinataMetadata', JSON.stringify({
      name: filename,
      keyvalues: metadata,
    }));
  }

  // Add options
  formData.append('pinataOptions', JSON.stringify({
    cidVersion: 1,
  }));

  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const cid = response.data.IpfsHash;
    console.log(`[IPFS] Uploaded ${filename} -> ${cid}`);

    return cid;
  } catch (error: any) {
    console.error('[IPFS] Upload failed:', error.response?.data || error.message);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Upload JSON data to IPFS
 *
 * @param data JSON object to upload
 * @param name Name for the file
 * @returns IPFS CID
 */
export async function uploadJSONToIPFS(
  data: Record<string, any>,
  name: string
): Promise<string> {
  if (!isPinataEnabled()) {
    throw new Error('Pinata not configured');
  }

  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      {
        pinataContent: data,
        pinataMetadata: {
          name,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET,
        },
      }
    );

    const cid = response.data.IpfsHash;
    console.log(`[IPFS] Uploaded JSON ${name} -> ${cid}`);

    return cid;
  } catch (error: any) {
    console.error('[IPFS] JSON upload failed:', error.response?.data || error.message);
    throw new Error(`IPFS JSON upload failed: ${error.message}`);
  }
}

/**
 * Get the IPFS gateway URL for a CID
 *
 * @param cid IPFS Content Identifier
 * @returns Full URL to access the content
 */
export function getIPFSUrl(cid: string): string {
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
}

/**
 * Unpin a file from IPFS (removes from Pinata)
 *
 * @param cid IPFS Content Identifier
 */
export async function unpinFromIPFS(cid: string): Promise<void> {
  if (!isPinataEnabled()) {
    return;
  }

  try {
    await axios.delete(`${PINATA_API_URL}/pinning/unpin/${cid}`, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET,
      },
    });

    console.log(`[IPFS] Unpinned ${cid}`);
  } catch (error: any) {
    // Don't throw on unpin failure
    console.warn('[IPFS] Unpin failed:', error.message);
  }
}

/**
 * Test Pinata connection
 */
export async function testPinataConnection(): Promise<boolean> {
  if (!isPinataEnabled()) {
    return false;
  }

  try {
    const response = await axios.get(`${PINATA_API_URL}/data/testAuthentication`, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET,
      },
    });

    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Get content type from filename
 */
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();

  const contentTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
}
