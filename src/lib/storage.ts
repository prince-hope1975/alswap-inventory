import { env } from "~/env";

export interface StorageService {
    uploadImage(file: Blob): Promise<string>;
}

class CloudinaryStorageService implements StorageService {
    private cloudName: string;
    private uploadPreset: string;

    constructor() {
        this.cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        this.uploadPreset = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    }

    async uploadImage(file: Blob): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", this.uploadPreset);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to upload image");
        }

        const data = await response.json();
        return data.secure_url;
    }
}

// Future implementation for GCP
// class GcpStorageService implements StorageService { ... }

// Factory or Singleton
const storageService: StorageService = new CloudinaryStorageService();

export const uploadImage = (file: Blob) => storageService.uploadImage(file);

