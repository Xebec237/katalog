// Re-export Prisma enums
export { Role, Plan, ShopStatus, SubscriptionStatus } from '@prisma/client';

// Custom app enums
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
