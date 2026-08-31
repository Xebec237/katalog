export interface StorageProvider {
  upload(file: Buffer, key: string, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
  generateSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getFile?(key: string): Promise<Buffer>;
}
