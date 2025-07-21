import { Request, Response, NextFunction } from "express";
import { FileStorageFactory } from "../infraestructure/services/FileStorageService";
import { ValidationError } from "../utils/errors";

export class FileUploadController {
  private fileStorageService = FileStorageFactory.create();

  /**
   * Subir imagen de perfil desde base64
   */
  async uploadProfileImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { imageData, filename } = req.body;

      if (!imageData) {
        throw new ValidationError("No image data provided");
      }

      // Verificar si es una URL (avatares predefinidos) o base64
      if (imageData.startsWith("http")) {
        // Es una URL de avatar predefinido, simplemente devolverla
        res.status(200).json({
          success: true,
          message: "Preset avatar selected",
          data: {
            url: imageData,
            filename: null,
          },
        });
        return;
      }

      // Procesar imagen base64
      if (!imageData.startsWith("data:image/")) {
        throw new ValidationError(
          "Invalid image format. Only base64 images are supported."
        );
      }

      // Extraer el buffer de la imagen base64
      const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        throw new ValidationError("Invalid base64 image format");
      }

      const imageType = matches[1]; // jpg, png, etc.
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Validar tamaño (5MB máximo)
      const maxSize = 5 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new ValidationError("File size too large. Maximum 5MB allowed.");
      }

      // Generar nombre de archivo si no se proporciona
      const originalName = filename || `uploaded-image.${imageType}`;

      // Subir archivo usando el servicio de almacenamiento
      const result = await this.fileStorageService.uploadImage(
        buffer,
        originalName
      );

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          url: result.url,
          filename: result.filename,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Subir imagen genérica (para posts, tweets, etc.)
   */
  async uploadImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { image, filename } = req.body;

      if (!image) {
        throw new ValidationError("No image data provided");
      }

      // Procesar imagen base64
      if (!image.startsWith("data:image/")) {
        throw new ValidationError(
          "Invalid image format. Only base64 images are supported."
        );
      }

      // Extraer el buffer de la imagen base64
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        throw new ValidationError("Invalid base64 image format");
      }

      const imageType = matches[1]; // jpg, png, etc.
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Validar tamaño (10MB máximo)
      const maxSize = 10 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new ValidationError("File size too large. Maximum 10MB allowed.");
      }

      // Generar nombre de archivo si no se proporciona
      const originalName = filename || `post-image-${Date.now()}.${imageType}`;

      // Subir archivo usando el servicio de almacenamiento
      const result = await this.fileStorageService.uploadImage(
        buffer,
        originalName
      );

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          url: result.url,
          filename: result.filename,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar imagen (para limpieza de archivos no utilizados)
   */
  async deleteImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { filename } = req.params;

      if (!filename) {
        throw new ValidationError("Filename is required");
      }

      const deleted = await this.fileStorageService.deleteImage(filename);

      if (!deleted) {
        throw new ValidationError("File not found or could not be deleted");
      }

      res.status(200).json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
