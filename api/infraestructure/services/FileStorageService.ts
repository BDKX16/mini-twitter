import fs from "fs";
import path from "path";
import { promisify } from "util";
import crypto from "crypto";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export interface UploadResult {
  url: string;
  filename: string;
  path: string;
}

export interface FileStorageService {
  uploadImage(buffer: Buffer, originalName: string): Promise<UploadResult>;
  deleteImage(filename: string): Promise<boolean>;
  getImageUrl(filename: string): string;
}

export class LocalFileStorageService implements FileStorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads", "images");
    this.baseUrl = process.env.FILE_STORAGE_BASE_URL || "http://localhost:4000";
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await access(this.uploadDir);
    } catch {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadImage(
    buffer: Buffer,
    originalName: string
  ): Promise<UploadResult> {
    // Generar nombre único para el archivo
    const fileExtension = path.extname(originalName).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error("Invalid file type. Only images are allowed.");
    }

    // Generar ID único
    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}${fileExtension}`;
    const filePath = path.join(this.uploadDir, filename);

    // Guardar archivo
    await writeFile(filePath, buffer);

    const url = `${this.baseUrl}/uploads/images/${filename}`;

    return {
      url,
      filename,
      path: filePath,
    };
  }

  async deleteImage(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await promisify(fs.unlink)(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getImageUrl(filename: string): string {
    return `${this.baseUrl}/uploads/images/${filename}`;
  }
}

// Factory para poder cambiar fácilmente entre diferentes proveedores
export class FileStorageFactory {
  static create(): FileStorageService {
    const provider = process.env.FILE_STORAGE_PROVIDER || "local";

    switch (provider) {
      case "local":
        return new LocalFileStorageService();
      // Futuras implementaciones:
      // case 'cloudinary':
      //   return new CloudinaryFileStorageService();
      // case 's3':
      //   return new S3FileStorageService();
      // case 'minio':
      //   return new MinioFileStorageService();
      default:
        return new LocalFileStorageService();
    }
  }
}
