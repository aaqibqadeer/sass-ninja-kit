/**
 * lib/storage/s3/adapter.ts — S3 implementation of StorageAdapter.
 *
 * The only module that imports the AWS SDK. Presigns PUT/GET URLs so bytes flow
 * client↔S3 directly. Works with any S3-compatible endpoint (AWS, Cloudflare R2,
 * MinIO) by setting a custom `AWS_S3_ENDPOINT` if a fork needs one.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config/env.schema";

import type { StorageAdapter } from "../adapter";

/** Presigned URL lifetime (seconds). */
const URL_TTL_SECONDS = 15 * 60;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`S3StorageAdapter: ${name} is not configured`);
  return value;
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(client?: S3Client) {
    this.bucket = required("AWS_S3_BUCKET", env.AWS_S3_BUCKET);
    this.client =
      client ??
      new S3Client({
        region: required("AWS_REGION", env.AWS_REGION),
        credentials: {
          accessKeyId: required("AWS_ACCESS_KEY_ID", env.AWS_ACCESS_KEY_ID),
          secretAccessKey: required(
            "AWS_SECRET_ACCESS_KEY",
            env.AWS_SECRET_ACCESS_KEY,
          ),
        },
        ...(env.AWS_S3_ENDPOINT
          ? { endpoint: env.AWS_S3_ENDPOINT, forcePathStyle: true }
          : {}),
      });
  }

  async getUploadUrl(
    key: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: URL_TTL_SECONDS },
    );
    return { url, key };
  }

  async getDownloadUrl(key: string): Promise<{ url: string }> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: URL_TTL_SECONDS },
    );
    return { url };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
