

import { Area, Reservation, ReservationStatus, User, UserRole, SystemSettings } from './types';

// CHAVES CONFIGURADAS PARA DEPLOY PÚBLICO
// O sistema usará estas chaves automaticamente.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCqo4M1XedZRBbbfOubJ-fX8CdjwKBNMKo",
  authDomain: "condominium-9a158.firebaseapp.com",
  projectId: "condominium-9a158",
  storageBucket: "condominium-9a158.firebasestorage.app",
  messagingSenderId: "458549931154",
  appId: "1:458549931154:web:1590899c3f42870c3cca4b"
};

// CONFIGURAÇÃO DO EMAILJS (ENVIO DE EMAIL REAL)
// Cadastre-se em emailjs.com e preencha as chaves abaixo para ativar o envio real.
export const EMAILJS_CONFIG = {
  SERVICE_ID: "", // Ex: "service_xyz"
  TEMPLATE_ID: "", // Ex: "template_abc"
  PUBLIC_KEY: ""   // Ex: "user_123456"
};

export const DEFAULT_SETTINGS: SystemSettings = {
  maxReservationsPerMonth: 4,
  maxReservationsPerYear: 24,
};

export const AREAS: Area[] = [
  {
    id: 'area-1',
    name: 'Salão de Festas',
    capacity: 80,
    price: 150,
    description: 'Salão espaçoso com ar condicionado, sistema de som e suporte de cozinha completo. Inclui uso exclusivo da Churrasqueira.',
    image: 'https://picsum.photos/id/42/800/600',
    openTime: 10,
    closeTime: 22,
    linkedAreaIds: ['area-2'], // Booking this blocks 'area-2'
    usageRules: "1. O som deve ser desligado impreterivelmente às 22h.\n2. É obrigatória a entrega do salão limpo.\n3. O lixo deve ser separado e levado até a lixeira externa.\n4. Danos ao patrimônio serão cobrados na próxima taxa condominial.",
  },
  {
    id: 'area-2',
    name: 'Churrasqueira',
    capacity: 20,
    price: 50,
    description: 'Área de churrasqueira ao ar livre com mesas e vista privilegiada.',
    image: 'https://picsum.photos/id/292/800/600',
    openTime: 11,
    closeTime: 23,
    linkedAreaIds: [],
    usageRules: "1. Proibido som alto (apenas som ambiente).\n2. Limpar a grelha após o uso.\n3. Não deixar restos de carvão aceso.\n4. Capacidade máxima de 20 pessoas não deve ser excedida.",
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alice Síndica',
    email: 'admin@condo.com',
    role: UserRole.MANAGER,
    password: '123',
  },
  {
    id: 'u2',
    name: 'Beto Morador',
    email: 'beto@morador.com',
    role: UserRole.RESIDENT,
    block: 'A',
    apartment: '101',
    password: '123',
  },
  {
    id: 'u3',
    name: 'Carlos Morador',
    email: 'carlos@morador.com',
    role: UserRole.RESIDENT,
    block: 'B',
    apartment: '205',
    password: '123',
  },
  {
    id: 'u4',
    name: 'João Porteiro',
    email: 'portaria@condo.com',
    role: UserRole.ADMIN,
    password: '123',
  },
];

// Generate some initial reservations for the dashboard
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

export const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 'r1',
    areaId: 'area-1',
    userId: 'u3',
    userName: 'Carlos Morador',
    userBlock: 'B',
    userApt: '205',
    date: todayStr,
    startTime: 14,
    endTime: 18,
    status: ReservationStatus.IN_PROGRESS,
    totalPrice: 150,
    createdAt: new Date(today.getTime() - 86400000 * 5).toISOString(),
    paymentId: 'pay_123',
  },
  {
    id: 'r2',
    areaId: 'area-2',
    userId: 'u2',
    userName: 'Beto Morador',
    userBlock: 'A',
    userApt: '101',
    date: new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0],
    startTime: 12,
    endTime: 16,
    status: ReservationStatus.CONFIRMED,
    totalPrice: 50,
    createdAt: new Date(today.getTime() - 86400000 * 1).toISOString(),
    paymentId: 'pay_456',
  },
];