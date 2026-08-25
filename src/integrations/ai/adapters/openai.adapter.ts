import { ConfigService } from '@nestjs/config';
import { AIProvider, ProductAnalysis, BoundingBox, ModerationResult } from '../interfaces/ai-provider.interface';

export class OpenAIAdapter implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('AI_API_KEY');
    this.model = this.configService.get<string>('AI_MODEL', 'gpt-4o');
  }

  private async fetchOpenAI(endpoint: string, payload: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async analyzeProductImage(imageUrl: string, locale: string = 'fr'): Promise<ProductAnalysis> {
    const prompt = locale === 'fr' 
      ? `Analysez le produit dans cette image.
Retournez UNIQUEMENT les informations factuelles visibles dans l'image.
N'inventez PAS : marque, prix, taille, matériau, origine, caractéristiques techniques.
Répondez strictement au format JSON : { "name": string, "category": string, "description": string, "confidence": number, "suggestedTags": string[] }`
      : `Analyze the product in this image.
Return ONLY factual information visible in the image.
Do NOT invent: brand, price, size, material, origin, technical specs.
Respond strictly in JSON format: { "name": string, "category": string, "description": string, "confidence": number, "suggestedTags": string[] }`;

    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } }
          ],
        },
      ],
      response_format: { type: 'json_object' },
    };

    const data = await this.fetchOpenAI('/chat/completions', payload);
    const content = data.choices[0].message.content;
    return JSON.parse(content) as ProductAnalysis;
  }

  async suggestProductName(imageUrl: string, locale: string = 'fr'): Promise<string> {
    const analysis = await this.analyzeProductImage(imageUrl, locale);
    return analysis.name;
  }

  async suggestCategory(imageUrl: string, existingCategories: string[]): Promise<string> {
    const payload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI that categorizes products. You must choose ONE category from the following list that best matches the image. If none match well, return the closest one. List: ${existingCategories.join(', ')}`,
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } }
          ],
        },
      ],
    };

    const data = await this.fetchOpenAI('/chat/completions', payload);
    return data.choices[0].message.content.trim();
  }

  async generateProductDescription(context: { name: string; category: string; locale?: string }): Promise<string> {
    const locale = context.locale || 'fr';
    const prompt = locale === 'fr'
      ? `Générez une description courte pour un produit nommé "${context.name}" dans la catégorie "${context.category}". N'inventez pas de faits spécifiques comme le prix ou les matériaux non évidents.`
      : `Generate a short description for a product named "${context.name}" in category "${context.category}". Do not invent specific facts like price or non-obvious materials.`;

    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a helpful e-commerce assistant.' },
        { role: 'user', content: prompt },
      ],
    };

    const data = await this.fetchOpenAI('/chat/completions', payload);
    return data.choices[0].message.content.trim();
  }

  async detectProductBoundingBox(imageUrl: string): Promise<BoundingBox | null> {
    // OpenAI doesn't natively return precise bounding boxes via standard chat endpoints yet.
    // We mock this or try a prompt that asks for normalized coordinates.
    // For now, we simulate returning a generic box.
    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: `Analyze the image and return the bounding box of the main product in normalized coordinates (0 to 1). Return JSON: { "x": number, "y": number, "width": number, "height": number }` },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }] },
      ],
      response_format: { type: 'json_object' },
    };

    try {
      const data = await this.fetchOpenAI('/chat/completions', payload);
      const content = data.choices[0].message.content;
      return JSON.parse(content) as BoundingBox;
    } catch {
      return null;
    }
  }

  async moderateImageContent(imageUrl: string): Promise<ModerationResult> {
    // OpenAI Moderation API now supports image inputs
    const payload = {
      model: 'omni-moderation-latest',
      input: [
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    };

    const data = await this.fetchOpenAI('/moderations', payload);
    const result = data.results[0];
    
    const flags = Object.entries(result.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    return {
      safe: !result.flagged,
      flags,
      confidence: 1.0, // We could extract max score if needed
    };
  }
}
