// packages/types/src/enums.ts
export enum UserRole {
    USER = 'USER',
    SELLER = 'SELLER',
    ADMIN = 'ADMIN',
  }
  
  export enum OrderStatus {
    CREATED = 'CREATED',
    PAID = 'PAID',
    SELLER_ACCEPTED = 'SELLER_ACCEPTED',
    PREPARING = 'PREPARING',
    READY_FOR_PICKUP = 'READY_FOR_PICKUP',
    PICKED_UP = 'PICKED_UP',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
  }
  