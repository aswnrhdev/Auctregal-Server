import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';
import * as path from 'path';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from 'dotenv';

dotenv.config();

export default class S3Uploader {
  private bucketName: string;
  private bucketRegion: string;
  private s3AccessKey: string;
  private s3SecretAccessKey: string;
  private s3Client: S3Client;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || "";
    this.bucketRegion = process.env.S3_BUCKET_REGION || "";
    this.s3AccessKey = process.env.S3_ACCESS_KEY || "";
    this.s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";

    if (!this.bucketName || !this.bucketRegion || !this.s3AccessKey || !this.s3SecretAccessKey) {
      throw new Error("Missing S3 configuration. Please check your environment variables.");
    }

    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: this.s3AccessKey,
        secretAccessKey: this.s3SecretAccessKey,
      },
      region: this.bucketRegion,
    });
  }

  private generateRandomFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const randomName = crypto.randomBytes(32).toString('hex');
    return `${randomName}${ext}`;
  }

  public uploadFile = async (file: Express.Multer.File, originalName: string): Promise<string> => {
    const fileName = this.generateRandomFileName(originalName);
    const uploader = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    try {
      await uploader.done();
      console.log(`${originalName} uploaded successfully as ${fileName}`);
      return fileName;
    } catch (error) {
      console.error(`Error uploading ${originalName} to S3:`, error);
      throw error;
    }
  }

  public retrieveFile = async (fileName: string, expiresIn: number = 3600): Promise<string> => {
    const getObjectParams = {
      Bucket: this.bucketName,
      Key: fileName,
    };

    try {
      const command = new GetObjectCommand(getObjectParams);
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error(`Error generating signed URL for file ${fileName}:`, error);
      throw error;
    }
  }
}