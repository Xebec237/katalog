export const messages = {
  en: {
    auth: {
      invalidCredentials: 'Invalid email or password',
      unauthorized: 'Unauthorized',
      twoFactorRequired: 'Two-factor authentication required',
    },
    validation: {
      required: 'This field is required',
      invalidEmail: 'Invalid email format',
    },
    shop: {
      notFound: 'Shop not found',
      noAccess: 'You do not have access to this shop',
    },
    product: {
      notFound: 'Product not found',
    },
    payment: {
      failed: 'Payment failed',
    },
    quota: {
      exceeded: 'Quota exceeded for this plan',
    },
  },
  fr: {
    auth: {
      invalidCredentials: 'Email ou mot de passe invalide',
      unauthorized: 'Non autorisé',
      twoFactorRequired: 'Authentification à deux facteurs requise',
    },
    validation: {
      required: 'Ce champ est requis',
      invalidEmail: 'Format d\\'email invalide',
    },
    shop: {
      notFound: 'Boutique introuvable',
      noAccess: 'Vous n\\'avez pas accès à cette boutique',
    },
    product: {
      notFound: 'Produit introuvable',
    },
    payment: {
      failed: 'Paiement échoué',
    },
    quota: {
      exceeded: 'Quota dépassé pour ce forfait',
    },
  },
};

export function t(key: string, locale: 'en' | 'fr' = 'en'): string {
  const keys = key.split('.');
  let current: any = messages[locale];
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return key; // Fallback to key if not found
    }
  }
  
  return current as string;
}
