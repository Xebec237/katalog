export interface ProductAnalysis {
  name: string;
  category: string;
  description: string;
  confidence: number;
  suggestedTags?: string[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ModerationResult {
  safe: boolean;
  flags: string[];
  confidence: number;
}

export interface AIProvider {
  analyzeProductImage(imageUrl: string, locale?: string): Promise<ProductAnalysis>;
  suggestProductName(imageUrl: string, locale?: string): Promise<string>;
  suggestCategory(imageUrl: string, existingCategories: string[]): Promise<string>;
  generateProductDescription(context: { name: string; category: string; locale?: string }): Promise<string>;
  detectProductBoundingBox(imageUrl: string): Promise<BoundingBox | null>;
  moderateImageContent(imageUrl: string): Promise<ModerationResult>;
}
