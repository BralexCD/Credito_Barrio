import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

interface CloudinaryRawUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  async uploadImage(file: File): Promise<CloudinaryUploadResult> {
    if (!environment.cloudinaryCloudName || !environment.cloudinaryUploadPreset) {
      throw new Error('Cloudinary no está configurado correctamente.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', environment.cloudinaryUploadPreset);

    if (environment.cloudinaryFolder) {
      formData.append('folder', environment.cloudinaryFolder);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const result = (await response.json()) as CloudinaryRawUploadResponse;

    if (!response.ok || result.error) {
      throw new Error(result.error?.message || 'No se pudo subir la imagen a Cloudinary.');
    }

    if (!result.secure_url || !result.public_id) {
      throw new Error('Cloudinary no devolvió una URL válida.');
    }

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  }
}
