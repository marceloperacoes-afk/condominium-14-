

export enum UserRole {
  RESIDENT = 'RESIDENT',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  name: string;
  email: string;
  contact?: string; // Novo campo de contato (Celular/WhatsApp)
  role: UserRole;
  block?: string;
  apartment?: string;
  password?: string; // In a real app, this would be hashed/handled securely
  isBlocked?: boolean; // Novo campo para controle de acesso
  isVerified?: boolean; // Controle de verificação de email (usuários antigos undefined = true)
  verificationCode?: string; // Código temporário para verificação
}

export interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string; // ISO Date
  action: 'LOGIN' | 'REGISTER';
}

// --- POOL CONTROL TYPES ---
export interface PoolStatus {
  currentOccupancy: number;
  lastUpdated: string;
  activeUsers?: string[]; // Array de IDs dos usuários atualmente na piscina
}

export interface PoolLog {
  id: string;
  userId: string;
  userName: string;
  userBlock: string;
  userApt: string;
  action: 'ENTRY' | 'EXIT';
  timestamp: string;
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_LIST = 'WAITING_LIST',
}

export interface Area {
  id: string;
  name: string;
  capacity: number;
  price: number;
  description: string;
  image: string;
  openTime: number; // Hour (0-23)
  closeTime: number; // Hour (0-23)
  linkedAreaIds?: string[]; // IDs of other areas that are included/blocked when this area is booked
  usageRules?: string; // Instruções e Regras de uso da área
}

export interface Reservation {
  id: string;
  areaId: string;
  userId: string;
  userName: string; // Snapshot for display
  userBlock?: string;
  userApt?: string;
  date: string; // ISO Date String YYYY-MM-DD
  startTime: number; // Hour integer
  endTime: number; // Hour integer
  status: ReservationStatus;
  totalPrice: number;
  createdAt: string;
  paymentId?: string;
  cancellationReason?: string; // Motivo do cancelamento (se houver)
  isPromotionNotificationPending?: boolean; // Se true, exibe modal de parabéns para o usuário
  isCancellationNotificationPending?: boolean; // Se true, exibe modal de alerta de cancelamento para o usuário
}

export interface Package {
  id: string;
  userId: string;
  userName: string;
  userBlock: string;
  userApt: string;
  sender: string; // Ex: Amazon, Correios, Mercado Livre
  description?: string; // Ex: Caixa grande, Envelope
  image?: string; // Foto da encomenda (Base64)
  entryDate: string; // ISO Date
  pickupCode: string; // Código de 4 a 6 dígitos
  status: 'WAITING' | 'DELIVERED';
  pickupDate?: string;
}

export interface KpiStats {
  totalReservations: number;
  availableNext30Days: number; // Simplified logic
  inProgress: number;
  confirmed: number;
  pending: number;
}

export interface SystemSettings {
  maxReservationsPerMonth: number;
  maxReservationsPerYear: number;
}