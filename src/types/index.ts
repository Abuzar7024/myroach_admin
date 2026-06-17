export type UserRole = "admin" | "customer";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type DiscountType = "percentage" | "fixed";
export type VariantType = "size" | "color";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
}

export interface ProductVariant {
  type: VariantType;
  value: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice?: number;
  stock: number;
  sku: string;
  categoryId: string;
  tags: string[];
  images: string[];
  variants: ProductVariant[];
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCharge: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  expiryDate: Date;
  usageLimit: number;
  active: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  redirectUrl: string;
  position: number;
  active: boolean;
}

export interface HomepageContent {
  featuredCollectionIds: string[];
  bestSellerIds: string[];
  newArrivalIds: string[];
  promoTitle: string;
  promoSubtitle: string;
  showFeatured: boolean;
  showBestSellers: boolean;
  showNewArrivals: boolean;
  showPromo: boolean;
}

export interface Settings {
  storeName: string;
  logo: string;
  storeDescription: string;
  contactEmail: string;
  phone: string;
  address: string;
  shippingCharge: number;
  freeShippingThreshold: number;
  taxPercentage: number;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  footerContent: string;
  policies: {
    returnPolicy?: string;
    privacyPolicy?: string;
    termsAndConditions?: string;
  };
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export interface AnalyticsPeriod {
  label: string;
  revenue: number;
  orders: number;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: Date;
}

export interface Subscriber {
  id: string;
  email: string;
  active: boolean;
  createdAt: Date;
}

export interface ActivityItem {
  id: string;
  type: "order" | "customer" | "product" | "review";
  message: string;
  timestamp: Date;
  link?: string;
}

