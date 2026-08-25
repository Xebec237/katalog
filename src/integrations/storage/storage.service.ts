import { Injectable, Inject } from '@nestjs/common';
import { STORAGE_PROVIDER } from '@/common/constants/injection-tokens';
import { StorageProvider } from './interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async uploadFile(file: Buffer, shopId: string, productId: string, filename: string, contentType: string): Promise<string> {
    const key = `shops/${shopId}/products/${productId}/${filename}`;
    return this.storageProvider.upload(file, key, contentType);
  }

  async deleteFile(key: string): Promise<void> {
    return this.storageProvider.delete(key);
  }

  getPublicUrl(key: string): string {
    return this.storageProvider.getUrl(key);
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    return this.storageProvider.generateSignedUrl(key, expiresIn);
  }
}
