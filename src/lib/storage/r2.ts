/**
 * Cloudflare R2 Storage Utilities
 *
 * Requires environment variables:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 is S3-compatible, so we use the AWS SDK
const getR2Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const getBucketName = () => {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error('R2_BUCKET_NAME not configured');
  }
  return bucket;
};

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

/**
 * Upload a file to R2 storage
 */
export async function uploadFile(
  file: Buffer,
  filename: string,
  contentType: string,
  permitId: string
): Promise<UploadResult> {
  const client = getR2Client();
  const bucket = getBucketName();

  // Generate unique key with permit context
  const timestamp = Date.now();
  const key = `permits/${permitId}/${timestamp}-${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: `https://${bucket}.r2.cloudflarestorage.com/${key}`,
    size: file.length,
  };
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getR2Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file directly from client
 */
export async function getUploadUrl(
  filename: string,
  contentType: string,
  permitId: string,
  expiresIn = 3600
): Promise<{ uploadUrl: string; key: string }> {
  const client = getR2Client();
  const bucket = getBucketName();

  const timestamp = Date.now();
  const key = `permits/${permitId}/${timestamp}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return { uploadUrl, key };
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Get file metadata without downloading
 */
export function getPublicUrl(key: string): string {
  const bucket = getBucketName();
  return `https://${bucket}.r2.cloudflarestorage.com/${key}`;
}
