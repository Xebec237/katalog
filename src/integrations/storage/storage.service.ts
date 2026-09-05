import { Injectable, Inject } from '@nestjs/common';
import { STORAGE_PROVIDER } from '../../common/constants/injection-tokens';
import { StorageProvider } from './interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async upload(file: Buffer, key: string, contentType: string): Promise<string> {
    return this.storageProvider.upload(file, key, contentType);
  }

  async uploadFile(
    file: Buffer,
    arg2: string,
    arg3?: string,
    arg4?: string,
    arg5?: string,
  ): Promise<string> {
    if (arg4 && arg5) {
      // Called with (file, shopId, productId, filename, contentType)
      const key = `shops/${arg2}/products/${arg3}/${arg4}`;
      return this.storageProvider.upload(file, key, arg5);
    } else {
      // Called with (file, key, contentType)
      const key = arg2;
      const contentType = arg3 || 'application/octet-stream';
      return this.storageProvider.upload(file, key, contentType);
    }
  }

  async getFile(key: string): Promise<Buffer> {
    if (this.storageProvider.getFile) {
      return this.storageProvider.getFile(key);
    }
    return Buffer.from([]);
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
