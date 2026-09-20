import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Only text-extractable document types are accepted — no images, audio, video, or archives.
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

@Injectable()
export class FileUploadService {
  private readonly supabase: SupabaseClient;
  private readonly logger = new Logger(FileUploadService.name);
  private readonly bucket = process.env.SUPABASE_BUCKET as string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );
  }

  /**
   * Sanitize filename to prevent directory traversal and other injection attacks
   */
  private sanitizeFilename(filename: string): string {
    let sanitized = filename.replace(/[/\\:\0]/g, "_");
    sanitized = sanitized.replace(/^\.+/, "");
    sanitized = sanitized.replace(/[^a-zA-Z0-9._\-\s()]/g, "_");
    sanitized = sanitized.trim().substring(0, 200);
    return sanitized || "unnamed_file";
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file.buffer || !file.originalname) {
      throw new BadRequestException("Invalid file data");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type '${file.mimetype}' is not allowed`);
    }
  }

  async uploadFile(file: Express.Multer.File, folder = "uploads") {
    this.validateFile(file);

    const sanitizedName = this.sanitizeFilename(file.originalname);
    const key = `${folder.replace(/\/+$/, "")}/${crypto.randomUUID()}_${sanitizedName}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(key, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      this.logger.error("Failed to upload file to Supabase Storage", error);
      throw new InternalServerErrorException("Failed to upload file");
    }

    const base = (process.env.SUPABASE_URL as string).replace(/\/+$/, "");
    return { url: `${base}/storage/v1/object/public/${this.bucket}/${key}`, path: key };
  }
}
