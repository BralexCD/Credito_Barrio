/**
 * Tipos y contratos del dominio de Cuenta Corriente y Crédito Barrio
 * Basados estrictamente en LOCAL_CONTRACT.md.
 */

export type UserRole = 'PLATFORM_ADMIN' | 'STORE_ADMIN' | 'CUSTOMER';
export type Currency = 'PEN' | 'USD';
export type RateType = 'EFFECTIVE' | 'NOMINAL';
export type PurchaseMode = 'END_OF_MONTH' | 'INSTALLMENTS';
export type StatementStatus = 'OPEN' | 'PAID';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  storeId: string | null;
  clientId: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Store {
  id: string;
  name: string;
  businessType: string;
  address: string;
  taxId: string;
  active: boolean;
}

export interface CreateStoreDto {
  name: string;
  businessType: string;
  address: string;
  taxId: string;
  adminName: string;
  adminUsername: string;
  adminPassword: string;
}

export interface UpdateStoreDto {
  name?: string;
  businessType?: string;
  address?: string;
  taxId?: string;
  active?: boolean;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  brand: string;
  supplier: string;
  unit: string;
  imageUrl: string;
  cashPrice: number;
  creditPrice: number;
  allowEndOfMonth: boolean;
  allowInstallments: boolean;
  active: boolean;
}

export interface CreateProductDto {
  name: string;
  description: string;
  brand: string;
  supplier: string;
  unit: string;
  imageUrl: string;
  cashPrice: number;
  creditPrice: number;
  allowEndOfMonth: boolean;
  allowInstallments: boolean;
  active: boolean;
}

export interface Client {
  id: string;
  storeId: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  username: string;
  currency: Currency;
  creditLimit: number;
  maxMonths: number;
  cutoffDay: number;
  cutoffTime: string;
  paymentDay: number;
  rateType: RateType;
  annualRate: number;
  capitalizationDays: number;
  lateRateType: RateType;
  lateAnnualRate: number;
  lateCapitalizationDays: number;
  active: boolean;
  outstandingCapital?: number;
  availableCredit?: number;
}

export interface CreateClientDto {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  username: string;
  password: string;
  currency: Currency;
  creditLimit: number;
  maxMonths: number;
  cutoffDay: number;
  cutoffTime: string;
  paymentDay: number;
  rateType: RateType;
  annualRate: number;
  capitalizationDays: number;
  lateRateType: RateType;
  lateAnnualRate: number;
  lateCapitalizationDays: number;
  active: boolean;
}

export interface UpdateClientDto {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  currency: Currency;
  creditLimit: number;
  maxMonths: number;
  cutoffDay: number;
  cutoffTime: string;
  paymentDay: number;
  rateType: RateType;
  annualRate: number;
  capitalizationDays: number;
  lateRateType: RateType;
  lateAnnualRate: number;
  lateCapitalizationDays: number;
  active: boolean;
}

export interface PurchaseScheduleItem {
  number: number;
  dueDate: string;
  capital: number;
  interest: number;
  total: number;
}

export interface PurchasePreviewRequest {
  clientId: string;
  productId: string;
  quantity: number;
  mode: PurchaseMode;
  months: number;
  purchasedAt: string;
}

export interface PurchasePreviewResponse {
  principal: number;
  graceDays: number;
  capitalizedPrincipal: number;
  firstDueDate: string;
  schedule: PurchaseScheduleItem[];
}

export interface Purchase {
  id: string;
  storeId: string;
  clientId: string;
  productId: string;
  productName: string;
  quantity: number;
  mode: PurchaseMode;
  months: number;
  purchasedAt: string;
  principal: number;
  graceDays: number;
  capitalizedPrincipal: number;
  firstDueDate: string;
  schedule: PurchaseScheduleItem[];
}

export interface Statement {
  id: string;
  clientId: string;
  clientName: string;
  currency: Currency;
  cutoffDate: string;
  dueDate: string;
  status: StatementStatus;
  principal: number;
  interest: number;
  total: number;
  paidAt: string | null;
}

export interface StatementItem {
  purchaseId: string;
  productName: string;
  purchasedAt: string;
  installmentNumber: number;
  capital: number;
  interest: number;
  total: number;
}

export interface StatementAllocation {
  lateInterest: number;
  interest: number;
  capital: number;
}

export interface StatementDetail extends Statement {
  items: StatementItem[];
  lateDays: number;
  lateInterest: number;
  payableTotal: number;
  paidAmount?: number | null;
  allocation: StatementAllocation;
}

export interface Payment {
  id: string;
  statementId: string;
  clientId: string;
  paidAt: string;
  amount: number;
  lateInterest: number;
  interest: number;
  capital: number;
}

export interface PayStatementDto {
  paidAt: string;
  amount: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  action: string;
  entityId: string;
}

export interface BootstrapData {
  user: User;
  stores: Store[];
  products: Product[];
  clients: Client[];
  purchases: Purchase[];
  statements: Statement[];
  payments: Payment[];
  audit: AuditEntry[];
}
