import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, LogOut, Menu, User as UserIcon, Plus, Check, 
  X, Settings, ShieldCheck, Building, Trash2, Edit, Upload, Users, 
  Clock, CalendarCheck, Filter, AlertCircle, Sparkles, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, MapPin, Search, Loader2, History, FileText,
  BarChart as BarChartIcon, Briefcase, List, PartyPopper, ChevronDown, Lock, Ban, Unlock, KeyRound, HelpCircle,
  TrendingUp, DollarSign, PieChart as PieChartIcon, Info, FileSignature, Package as PackageIcon, QrCode, Archive, CheckCircle2, Camera, Image as ImageIcon, Box, ArrowRight, Scan, Droplets, Users2, AlertTriangle, Waves, CameraOff, LogIn, Phone, Mail, Send, ExternalLink
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area as ReArea, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';

import { DEFAULT_SETTINGS, EMAILJS_CONFIG } from './constants';
import { PROJECT_MANIFEST } from './projectManifest'; // Import Manifesto
import { 
  User, UserRole, Reservation, Area, SystemSettings, AccessLog, ReservationStatus, Package, PoolStatus 
} from './types';
import { 
  initFirebase, 
  subscribeToUsers, subscribeToReservations, subscribeToAreas, subscribeToSettings, subscribeToLogs, subscribeToPackages, subscribeToPoolStatus,
  addUser, addReservation, updateReservationStatus, updateReservation, saveArea, deleteArea, saveSettings, addLog, deleteUser, toggleUserBlock, updateUserPassword,
  addPackage, markPackageAsDelivered, processPoolAccess,
  registerUserWithAuth, loginUserHybrid, logoutUser
} from './services/firebase';
import { SmartAssistant } from './components/SmartAssistant';

// CONFIGURAÇÃO HARDCODED PARA PRODUÇÃO
const PUBLIC_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCqo4M1XedZRBbbfOubJ-fX8CdjwKBNMKo",
  authDomain: "condominium-9a158.firebaseapp.com",
  projectId: "condominium-9a158",
  storageBucket: "condominium-9a158.firebasestorage.app",
  messagingSenderId: "458549931154",
  appId: "1:458549931154:web:1590899c3f42870c3cca4b"
};

// Utils
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getStatusLabel = (status: ReservationStatus) => {
  switch(status) {
    case ReservationStatus.CONFIRMED: return 'Confirmado';
    case ReservationStatus.PENDING: return 'Pendente';
    case ReservationStatus.IN_PROGRESS: return 'Em uso';
    case ReservationStatus.COMPLETED: return 'Concluído';
    case ReservationStatus.CANCELLED: return 'Cancelado';
    case ReservationStatus.WAITING_LIST: return 'Lista de Espera';
    default: return status;
  }
};

const getStatusBadge = (status: ReservationStatus) => {
    const base = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border inline-block shadow-sm";
    switch(status) {
      case ReservationStatus.CONFIRMED: return `${base} bg-emerald-50 text-emerald-600 border-emerald-200`;
      case ReservationStatus.PENDING: return `${base} bg-amber-50 text-amber-600 border-amber-200`;
      case ReservationStatus.IN_PROGRESS: return `${base} bg-blue-50 text-blue-600 border-blue-200`;
      case ReservationStatus.COMPLETED: return `${base} bg-slate-50 text-slate-600 border-slate-200`;
      case ReservationStatus.CANCELLED: return `${base} bg-red-50 text-red-600 border-red-200`;
      case ReservationStatus.WAITING_LIST: return `${base} bg-purple-50 text-purple-600 border-purple-200`;
      default: return `${base} bg-gray-50 text-gray-600`;
    }
};

// --- Components ---

const CalendarWidget: React.FC<{
  selectedDate: string;
  onSelectDate: (date: string) => void;
  reservations: Reservation[];
  areaId: string;
  linkedAreaIds?: string[];
  allAreas: Area[];
  currentUser?: User;
}> = ({ selectedDate, onSelectDate, reservations, areaId, linkedAreaIds, allAreas, currentUser }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentMonth);
  const today = new Date();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const isSelected = (day: number) => {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
    return dateStr === selectedDate;
  };

  const getDayStatus = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    if (date < new Date(today.setHours(0,0,0,0))) return 'past';

    const blockingReservation = reservations.find(r => {
      if (r.date !== dateStr) return false;
      if (r.status === ReservationStatus.CANCELLED || r.status === ReservationStatus.WAITING_LIST) return false;
      
      if (r.areaId === areaId) return true;
      if (linkedAreaIds?.includes(r.areaId)) return true;
      const rArea = allAreas.find(a => a.id === r.areaId);
      if (rArea?.linkedAreaIds?.includes(areaId)) return true;

      return false;
    });

    if (blockingReservation) {
       if (currentUser && blockingReservation.userId === currentUser.id) return 'mine';
       return 'busy';
    }
    return 'free';
  };

  return (
    <div className="bg-white/60 p-6 rounded-2xl border border-white shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-500"><ChevronLeft size={20}/></button>
        <span className="font-bold text-slate-800 capitalize text-lg">
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-500"><ChevronRight size={20}/></button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-xs font-bold text-slate-400">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const status = getDayStatus(day);
          const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
          
          let btnClass = "hover:bg-white hover:shadow-md text-slate-600 bg-transparent";
          if (status === 'past') btnClass = "opacity-30 cursor-not-allowed text-slate-300";
          if (status === 'busy') btnClass = "bg-red-50 text-red-500 font-medium border border-red-100";
          if (status === 'mine') btnClass = "bg-blue-50 text-blue-600 font-bold border border-blue-100";
          if (isSelected(day)) btnClass = "bg-brand-600 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700 transform scale-110 z-10";

          return (
            <button
              key={day}
              disabled={status === 'past'}
              onClick={() => onSelectDate(dateStr)}
              className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm transition-all duration-300 ${btnClass}`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex gap-4 mt-6 justify-center text-xs text-slate-500 font-medium">
         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></div> Livre</div>
         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-100 border border-red-300"></div> Ocupado</div>
         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-brand-100 border border-brand-300"></div> Sua Reserva</div>
      </div>
    </div>
  );
};

// --- Modals ---
const DigitalIdModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const qrData = user.id; 
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&color=0284c7`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
       <div className="glass-modal rounded-3xl shadow-2xl max-w-sm w-full relative flex flex-col items-center p-8 overflow-hidden border border-white/50">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100/50 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"><X size={20}/></button>
          
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-brand-500/30 rotate-3">
             <Building size={32}/>
          </div>
          
          <h3 className="text-xl font-bold text-slate-800">Condominium+</h3>
          <p className="text-brand-600 text-xs uppercase tracking-widest font-bold mb-8">Carteirinha Digital</p>

          <div className="p-4 bg-white border-2 border-dashed border-brand-200 rounded-3xl mb-6 shadow-inner">
             <img src={qrUrl} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
          </div>

          <div className="text-center w-full">
             <h2 className="text-2xl font-bold text-brand-900">{user.name}</h2>
             <div className="flex justify-center gap-2 mt-3">
                <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-sm font-bold border border-brand-100">Bloco {user.block}</span>
                <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-sm font-bold border border-brand-100">Apto {user.apartment}</span>
             </div>
          </div>

          <div className="mt-8 text-center text-xs text-slate-400 font-medium max-w-[200px] leading-relaxed">
             Apresente este código na portaria para acessar a piscina e áreas restritas.
          </div>
       </div>
    </div>
  );
};

const ChangePasswordModal: React.FC<{ user: User; onClose: () => void; onUpdatePass: (id: string, pass: string) => Promise<void>; }> = ({ user, onClose, onUpdatePass }) => {
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(newPass !== confirm) return alert("Senhas não coincidem");
        setLoading(true);
        await onUpdatePass(user.id, newPass);
        setLoading(false);
        onClose();
        alert("Senha alterada!");
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-white/50">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Alterar Senha</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input type="password" placeholder="Nova Senha" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" value={newPass} onChange={e=>setNewPass(e.target.value)} required/>
                    <input type="password" placeholder="Confirmar" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" value={confirm} onChange={e=>setConfirm(e.target.value)} required/>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                        <button disabled={loading} className="flex-1 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

const RulesAcceptanceModal: React.FC<{ areaName: string; rules?: string; onAccept: () => void; onReject: () => void; }> = ({ areaName, rules, onAccept, onReject }) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
       <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative flex flex-col max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
             <h3 className="text-xl font-bold text-slate-800">Termos de Uso</h3>
             <p className="text-brand-600 font-bold text-sm">{areaName}</p>
          </div>
          <div className="p-6 overflow-y-auto bg-white">
             <div className="prose prose-sm prose-slate bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner whitespace-pre-wrap leading-relaxed text-slate-600">
                 {rules || "Sem regras cadastradas."}
             </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex gap-3 bg-white">
             <button onClick={onReject} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
             <button onClick={onAccept} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2">
                 <CheckCircle2 size={18}/> Li e Concordo
             </button>
          </div>
       </div>
    </div>
);

const NotificationModal: React.FC<{ reservation: Reservation; areaName: string; onClose: () => void }> = ({ reservation, areaName, onClose }) => (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 to-purple-500"></div>
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
                <PartyPopper size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Parabéns!</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
                Sua reserva para <strong className="text-brand-600">{areaName}</strong> no dia {new Date(reservation.date).toLocaleDateString()} foi confirmada com sucesso!
            </p>
            <button onClick={onClose} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all">
                Maravilha!
            </button>
        </div>
    </div>
);

const CancellationNotificationModal: React.FC<{ reservation: Reservation; areaName: string; onClose: () => void }> = ({ reservation, areaName, onClose }) => (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-orange-500"></div>
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
                <AlertCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Reserva Cancelada</h3>
            <p className="text-slate-600 mb-4">
                Sua reserva para <strong className="text-slate-800">{areaName}</strong> no dia {new Date(reservation.date).toLocaleDateString()} foi cancelada.
            </p>
            {reservation.cancellationReason && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 mb-6 text-left">
                    <strong className="block mb-1 text-red-700">Motivo:</strong> {reservation.cancellationReason}
                </div>
            )}
            <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">
                Entendi
            </button>
        </div>
    </div>
);

// --- Pool Control Panel (ADMIN) ---
declare const Html5Qrcode: any;

const PoolControlPanel: React.FC<{ 
  poolStatus: PoolStatus; 
  onAccess: (id: string, action: 'ENTRY' | 'EXIT') => Promise<void>;
  allUsers: User[]; 
}> = ({ poolStatus, onAccess, allUsers }) => {
  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [pendingScanUser, setPendingScanUser] = useState<User | null>(null);
  const scannerRef = useRef<any>(null);
  
  const occupancy = poolStatus.currentOccupancy || 0;
  const limit = 60;
  const isOverLimit = occupancy >= limit;
  const isNearLimit = occupancy >= limit * 0.8 && !isOverLimit;

  let statusColor = "bg-emerald-500 shadow-emerald-500/30";
  if (isNearLimit) statusColor = "bg-amber-500 shadow-amber-500/30";
  if (isOverLimit) statusColor = "bg-red-500 shadow-red-500/30";

  useEffect(() => {
    if (showScanner && !scannerRef.current) {
        setCameraError(false);
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start(
            { facingMode: "environment" }, config, 
            (decodedText: string) => {
                handleScanCode(decodedText);
                setShowScanner(false);
                const audio = new Audio('https://www.soundjay.com/button/beep-07.mp3');
                audio.play().catch(() => {});
                html5QrCode.stop().then(() => { scannerRef.current = null; }).catch((err: any) => console.error(err));
            },
            (errorMessage: any) => {}
        ).catch((err: any) => {
            console.error("Error starting camera", err);
            setCameraError(true);
            setShowScanner(false);
        });
    }
    return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch((err: any) => console.error(err));
            scannerRef.current = null;
        }
    };
  }, [showScanner]);

  const handleStopCamera = () => {
      if (scannerRef.current) {
          scannerRef.current.stop().then(() => { scannerRef.current = null; setShowScanner(false); }).catch((err: any) => { setShowScanner(false); });
      } else { setShowScanner(false); }
  };

  const handleScanCode = (code: string) => {
      const user = allUsers.find(u => u.id === code);
      if (user) { setPendingScanUser(user); } else { alert("ID de usuário não encontrado: " + code); }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;
    handleScanCode(scanInput);
  };

  const confirmAccess = async (userId: string, action: 'ENTRY' | 'EXIT') => {
      setLoading(true);
      try {
          await onAccess(userId, action);
          setPendingScanUser(null);
          setScanInput('');
      } catch (err: any) {
          const msg = typeof err === 'string' ? err : err.message || "Erro ao processar acesso";
          alert(msg);
      } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
       <div className={`rounded-3xl p-8 text-center text-white shadow-2xl transition-all duration-500 ${statusColor} ${isOverLimit ? 'animate-pulse' : ''}`}>
          <div className="text-lg uppercase tracking-widest font-bold opacity-80 mb-2">Ocupação da Piscina</div>
          <div className="text-9xl font-bold mb-4 tracking-tighter">{occupancy}</div>
          <div className="text-2xl font-medium opacity-90">Capacidade Máxima: {limit}</div>
          {isOverLimit && <div className="mt-6 bg-white/20 backdrop-blur-sm p-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-white border border-white/30"><AlertTriangle/> LIMITE EXCEDIDO</div>}
       </div>

       <div className="glass-panel p-8 rounded-3xl shadow-xl border border-white/50">
          {showScanner && (
              <div className="mb-6 animate-scale-up bg-slate-900 rounded-2xl p-4 relative shadow-2xl">
                  <div id="reader" className="w-full bg-slate-800 rounded-xl overflow-hidden min-h-[300px]"></div>
                  <button onClick={handleStopCamera} className="w-full mt-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">Fechar Câmera</button>
              </div>
          )}
          
          {cameraError && (
             <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                <CameraOff size={32} className="mx-auto text-red-400 mb-2"/>
                <h3 className="text-red-800 font-bold">Acesso à Câmera Bloqueado</h3>
                <p className="text-red-600 text-sm mt-1 mb-4">O navegador impediu o acesso.</p>
                <button onClick={() => setCameraError(false)} className="text-xs underline text-red-500">Fechar Aviso</button>
             </div>
          )}

          {!showScanner && !cameraError && (
             <button onClick={() => setShowScanner(true)} className="w-full mb-8 py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all transform hover:-translate-y-1">
                 <Camera size={24} /> Abrir Câmera de Leitura
             </button>
          )}

          <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-1">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Ou Entrada Manual</span>
                 <div className="h-px bg-slate-200 flex-1"></div>
             </div>
             <div className="flex gap-3">
               <input 
                 autoFocus
                 value={scanInput}
                 onChange={e => setScanInput(e.target.value)}
                 placeholder="Bipar QR Code ou Digitar ID" 
                 className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-mono text-lg focus:border-brand-500 outline-none transition-all shadow-inner"
               />
               <button disabled={loading} className="bg-brand-600 text-white px-6 rounded-2xl font-bold hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20">
                 {loading ? <Loader2 className="animate-spin"/> : <ArrowRight size={24}/>}
               </button>
             </div>
          </form>
       </div>

       {pendingScanUser && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-up relative">
                    <button onClick={() => { setPendingScanUser(null); setScanInput(''); }} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20}/></button>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Registro de Acesso</h3>
                    <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                        <div className="text-xl font-bold text-brand-700 mb-1">{pendingScanUser.name}</div>
                        <div className="text-sm text-slate-500 font-medium">Bloco {pendingScanUser.block} • Apto {pendingScanUser.apartment}</div>
                        {poolStatus.activeUsers?.includes(pendingScanUser.id) && (
                            <div className="mt-3 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full inline-block border border-amber-200">
                                USUÁRIO JÁ NA PISCINA
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            disabled={loading || poolStatus.activeUsers?.includes(pendingScanUser.id)}
                            onClick={() => confirmAccess(pendingScanUser.id, 'ENTRY')}
                            className="py-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-2xl font-bold flex flex-col items-center gap-2 transition-all shadow-lg shadow-emerald-500/30 hover:-translate-y-1"
                        >
                            <LogIn size={28}/>
                            ENTRADA
                        </button>
                        <button 
                            disabled={loading}
                            onClick={() => confirmAccess(pendingScanUser.id, 'EXIT')}
                            className="py-6 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-2xl font-bold flex flex-col items-center gap-2 transition-all shadow-lg shadow-amber-500/30 hover:-translate-y-1"
                        >
                            <LogOut size={28}/>
                            SAÍDA
                        </button>
                    </div>
                    <button 
                        onClick={() => { setPendingScanUser(null); setScanInput(''); }} 
                        className="mt-6 text-slate-400 font-bold text-sm hover:text-slate-600 w-full py-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
           </div>
       )}
    </div>
  );
};


const AuthPage: React.FC<{ 
    onLogin: (user: User, pass?: string) => Promise<void>; 
    onRegister: (newUser: User, pass: string) => Promise<User>; 
    allUsers: User[] 
}> = ({ onLogin, onRegister, allUsers }) => {
    const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'CHECK_EMAIL'>('LOGIN');
    const [activeTab, setActiveTab] = useState<'RESIDENT' | 'MANAGER' | 'ADMIN'>('RESIDENT');
    const [loading, setLoading] = useState(false);
    
    // Form States
    const [formData, setFormData] = useState({ email: '', password: '', name: '', block: '', apartment: '', contact: '' });
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (view === 'REGISTER') {
                if (!formData.name || !formData.email || !formData.password || !formData.block || !formData.apartment) {
                    alert("Preencha todos os campos");
                    setLoading(false);
                    return;
                }
                const newUser: User = {
                    id: `u-${Date.now()}`,
                    name: formData.name,
                    email: formData.email,
                    role: UserRole.RESIDENT,
                    block: formData.block,
                    apartment: formData.apartment,
                    contact: formData.contact,
                };
                
                await onRegister(newUser, formData.password);
                setView('CHECK_EMAIL'); 
                
            } else {
                const loginMockUser = { email: formData.email, role: activeTab } as User;
                await onLogin(loginMockUser, formData.password);
            }
        } catch (err: any) {
            alert(err.message || "Erro na autenticação");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Gradient preserved via transparent container */}
            <div className="glass-modal bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-white/50 animate-fade-in-up">
                
                {view !== 'CHECK_EMAIL' && (
                    <div className="flex border-b border-slate-100/50 p-2 gap-1 bg-slate-50/50">
                        <button onClick={() => { setActiveTab('RESIDENT'); setView('LOGIN'); }} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'RESIDENT' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:bg-white/50'}`}>Morador</button>
                        <button onClick={() => { setActiveTab('MANAGER'); setView('LOGIN'); }} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'MANAGER' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:bg-white/50'}`}>Síndico</button>
                        <button onClick={() => { setActiveTab('ADMIN'); setView('LOGIN'); }} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'ADMIN' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:bg-white/50'}`}>Admin</button>
                    </div>
                )}
                
                <div className="p-8 md:p-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-3xl mb-6 shadow-lg shadow-brand-500/30 transform -rotate-6">
                            <Building size={40} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Condominium+</h1>
                        <p className="text-slate-500 font-medium mt-2">Gestão Inteligente & Conectada</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {view === 'REGISTER' && activeTab === 'RESIDENT' && (
                            <div className="animate-fade-in space-y-4">
                                <input type="text" placeholder="Nome Completo" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                <input type="tel" placeholder="Celular / WhatsApp" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                                <div className="flex gap-4">
                                    <input type="text" placeholder="Bloco" className="w-1/2 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all" value={formData.block} onChange={e => setFormData({...formData, block: e.target.value})} />
                                    <input type="text" placeholder="Apto" className="w-1/2 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all" value={formData.apartment} onChange={e => setFormData({...formData, apartment: e.target.value})} />
                                </div>
                            </div>
                        )}

                        {view === 'CHECK_EMAIL' ? (
                            <div className="animate-fade-in text-center">
                                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-3xl mb-8 shadow-sm">
                                    <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                        <Mail size={32}/>
                                    </div>
                                    <h3 className="font-bold text-emerald-900 text-xl mb-2">Verifique seu Email</h3>
                                    <p className="text-emerald-700 leading-relaxed">
                                        Enviamos um link de confirmação para<br/>
                                        <strong className="text-emerald-900 bg-emerald-200/50 px-2 py-1 rounded">{formData.email}</strong>
                                    </p>
                                </div>
                                <p className="text-slate-500 text-sm mb-8 px-4">
                                    Para sua segurança, valide sua conta clicando no link enviado antes de fazer o primeiro login.
                                </p>
                                <button type="button" onClick={() => setView('LOGIN')} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all transform hover:-translate-y-1">
                                    Voltar para Login
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20}/>
                                    <input type="email" placeholder="Seu Email" className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20}/>
                                    <input type="password" placeholder="Sua Senha" className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                                
                                <button disabled={loading} className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:to-brand-600 transition-all disabled:opacity-70 transform hover:-translate-y-0.5 mt-4">
                                    {loading ? <Loader2 className="animate-spin mx-auto"/> : (view === 'REGISTER' ? 'Criar Conta' : 'Entrar na Conta')}
                                </button>
                            </div>
                        )}
                    </form>

                    {view !== 'CHECK_EMAIL' && (
                        <>
                            {!view.startsWith('REG') && (
                                <div className="mt-6 text-center">
                                    <button onClick={() => alert("Entre em contato com a administração do condomínio para redefinir sua senha.")} className="text-xs text-slate-400 hover:text-brand-600 transition-colors">
                                        Esqueceu sua senha?
                                    </button>
                                </div>
                            )}

                            {activeTab === 'RESIDENT' && (
                                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                    <button onClick={() => setView(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-slate-600 text-sm font-bold hover:text-brand-600 transition-colors flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl hover:bg-slate-50">
                                        {view === 'REGISTER' ? (
                                            <> <ArrowRight className="rotate-180" size={16}/> Já tenho conta </>
                                        ) : (
                                            <> Novo morador? Criar cadastro <ArrowRight size={16}/> </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Decorative background blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>
        </div>
    );
};

// --- DASHBOARDS ---

const ResidentDashboard: React.FC<{
  currentUser: User;
  reservations: Reservation[];
  areas: Area[];
  packages: Package[];
  poolStatus: PoolStatus;
  onAddReservation: (res: Reservation) => Promise<void>;
  onCancelReservation: (id: string) => Promise<void>;
}> = ({ currentUser, reservations, areas, packages, poolStatus, onAddReservation, onCancelReservation }) => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'RESERVATIONS' | 'PACKAGES'>('HOME');
  const [showIdModal, setShowIdModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showRules, setShowRules] = useState(false);
  const [bookingStep, setBookingStep] = useState(0); 

  // Filter Data
  const myReservations = reservations
    .filter(r => r.userId === currentUser.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
  const myPendingPackages = packages.filter(p => p.userApt === currentUser.apartment && p.userBlock === currentUser.block && p.status === 'WAITING');

  const handleBook = async () => {
    if (!selectedArea || !selectedDate) return;
    
    // Check if area is busy
    const busy = reservations.find(r => 
        r.date === selectedDate && 
        (r.areaId === selectedArea.id || selectedArea.linkedAreaIds?.includes(r.areaId)) &&
        r.status !== 'CANCELLED' && r.status !== 'WAITING_LIST'
    );
    
    const status = busy ? ReservationStatus.WAITING_LIST : ReservationStatus.PENDING;
    
    const newRes: Reservation = {
        id: `res-${Date.now()}`,
        areaId: selectedArea.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userBlock: currentUser.block || '',
        userApt: currentUser.apartment || '',
        date: selectedDate,
        startTime: selectedArea.openTime,
        endTime: selectedArea.closeTime,
        status,
        totalPrice: selectedArea.price,
        createdAt: new Date().toISOString()
    };
    
    await onAddReservation(newRes);
    setBookingStep(0);
    setSelectedArea(null);
    setSelectedDate('');
    setShowRules(false);
    setActiveTab('RESERVATIONS');
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex bg-white/70 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-white overflow-x-auto sticky top-20 z-30">
             <button onClick={() => setActiveTab('HOME')} className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'HOME' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:bg-white'}`}>
                <LayoutDashboard size={18}/> Início
             </button>
             <button onClick={() => setActiveTab('RESERVATIONS')} className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'RESERVATIONS' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:bg-white'}`}>
                <CalendarCheck size={18}/> Minhas Reservas
             </button>
             <button onClick={() => setActiveTab('PACKAGES')} className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PACKAGES' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:bg-white'}`}>
                <PackageIcon size={18}/> Encomendas
                {myPendingPackages.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-red-500/50">{myPendingPackages.length}</span>}
             </button>
        </div>

        {activeTab === 'HOME' && (
            <div className="space-y-8">
                {/* Hero Card */}
                <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-[2rem] p-8 md:p-10 text-white shadow-2xl shadow-brand-900/20 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                             <div>
                                <h2 className="text-4xl font-bold mb-2 tracking-tight">Olá, {currentUser.name.split(' ')[0]}</h2>
                                <p className="text-brand-100 text-lg opacity-90 flex items-center gap-2"><MapPin size={16}/> Bloco {currentUser.block} • Apto {currentUser.apartment}</p>
                             </div>
                             <button onClick={() => setShowIdModal(true)} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md transition-all border border-white/10 shadow-lg">
                                <QrCode size={32}/>
                             </button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4">
                            <button onClick={() => setBookingStep(1)} className="bg-white text-brand-700 py-4 px-8 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-brand-50 transition-all flex items-center gap-3 transform hover:-translate-y-1">
                                <Plus size={22}/> Nova Reserva
                            </button>
                            {myPendingPackages.length > 0 && (
                                <button onClick={() => setActiveTab('PACKAGES')} className="bg-brand-500/40 border border-brand-300/30 py-4 px-8 rounded-2xl font-bold flex items-center gap-3 hover:bg-brand-500/60 transition-all backdrop-blur-sm">
                                    <PackageIcon size={22}/> Ver {myPendingPackages.length} Encomendas
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Background decorations */}
                    <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/15 transition-all duration-700"></div>
                    <div className="absolute left-0 bottom-0 w-64 h-64 bg-black/20 rounded-full -ml-16 -mb-16 blur-3xl"></div>
                </div>

                {/* Pool Status Widget */}
                <div className="glass-panel p-8 rounded-[2rem] shadow-lg border border-white/50 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-shadow duration-300">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-3 text-lg mb-1"><Waves size={24} className="text-brand-500"/> Status da Piscina</h3>
                        <p className="text-slate-400 font-medium">Atualização em tempo real</p>
                    </div>
                    <div className="text-right bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
                        <div className={`text-3xl font-bold ${poolStatus.currentOccupancy >= 60 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {poolStatus.currentOccupancy} <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">/ 60 Pessoas</span>
                        </div>
                    </div>
                </div>

                {/* Booking Flow Modal (Full Screen on Mobile) */}
                {bookingStep > 0 && (
                    <div className="fixed inset-0 z-[100] bg-white/50 backdrop-blur-sm md:p-8 overflow-y-auto flex items-center justify-center">
                        <div className="w-full max-w-5xl h-full md:h-auto bg-white md:rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col md:max-h-[90vh]">
                             <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-100 flex justify-between items-center">
                                 <div>
                                     <h3 className="text-2xl font-bold text-slate-800">Nova Reserva</h3>
                                     <p className="text-slate-500 text-sm">Passo {bookingStep} de 2</p>
                                 </div>
                                 <button onClick={() => { setBookingStep(0); setSelectedArea(null); setSelectedDate(''); }} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X/></button>
                             </div>
                             
                             <div className="p-6 md:p-10 space-y-8 overflow-y-auto flex-1 bg-slate-50/50">
                                 {/* Step 1: Select Area */}
                                 {(bookingStep === 1 || selectedArea) && (
                                     <div className={bookingStep !== 1 ? 'hidden md:block opacity-40 pointer-events-none grayscale' : 'animate-fade-in-up'}>
                                         <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-6 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs">1</div> Escolha a Área</h4>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {areas.map(area => (
                                                <div key={area.id} 
                                                    onClick={() => { setSelectedArea(area); setBookingStep(2); }}
                                                    className={`cursor-pointer group relative rounded-3xl overflow-hidden aspect-video border-4 transition-all shadow-lg hover:shadow-2xl ${selectedArea?.id === area.id ? 'border-brand-500 ring-4 ring-brand-500/20' : 'border-white hover:scale-[1.02]'}`}
                                                >
                                                    <img src={area.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                                                        <div className="font-bold text-2xl mb-1">{area.name}</div>
                                                        <div className="flex justify-between items-end">
                                                            <div className="text-sm opacity-90 font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm"><Users size={14} className="inline mr-1"/> {area.capacity} Pessoas</div>
                                                            <div className="font-bold text-brand-300 text-xl">{formatCurrency(area.price)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* Step 2: Select Date */}
                                 {bookingStep === 2 && selectedArea && (
                                     <div className="animate-fade-in-up bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                                         <div className="flex items-center justify-between mb-6">
                                             <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs">2</div> Escolha a Data</h4>
                                             <button onClick={() => setBookingStep(1)} className="text-brand-600 text-sm font-bold hover:bg-brand-50 px-3 py-1 rounded-lg transition-colors">Alterar Área</button>
                                         </div>
                                         <div className="flex flex-col md:flex-row gap-8">
                                             <div className="flex-1">
                                                <CalendarWidget 
                                                    selectedDate={selectedDate}
                                                    onSelectDate={(d) => { setSelectedDate(d); setShowRules(true); }}
                                                    reservations={reservations}
                                                    areaId={selectedArea.id}
                                                    linkedAreaIds={selectedArea.linkedAreaIds}
                                                    allAreas={areas}
                                                    currentUser={currentUser}
                                                />
                                             </div>
                                             <div className="w-full md:w-64 bg-slate-50 p-6 rounded-2xl border border-slate-100 self-start">
                                                 <h5 className="font-bold text-slate-800 mb-4">Resumo</h5>
                                                 <div className="space-y-3 text-sm">
                                                     <div>
                                                         <span className="text-slate-400 block text-xs">Área</span>
                                                         <span className="font-bold text-slate-700">{selectedArea.name}</span>
                                                     </div>
                                                     <div>
                                                         <span className="text-slate-400 block text-xs">Valor</span>
                                                         <span className="font-bold text-brand-600">{formatCurrency(selectedArea.price)}</span>
                                                     </div>
                                                     <div>
                                                         <span className="text-slate-400 block text-xs">Horário</span>
                                                         <span className="font-medium text-slate-600">{selectedArea.openTime}h às {selectedArea.closeTime}h</span>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'RESERVATIONS' && (
            <div className="space-y-4 animate-fade-in">
                {myReservations.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-slate-100 border-dashed">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CalendarIcon size={32} className="text-slate-300"/>
                        </div>
                        <h3 className="font-bold text-slate-700 text-lg">Sem reservas no momento</h3>
                        <p className="text-slate-400 mb-6">Que tal agendar um momento de lazer?</p>
                        <button onClick={() => { setActiveTab('HOME'); setBookingStep(1); }} className="text-brand-600 font-bold hover:bg-brand-50 px-6 py-3 rounded-xl transition-colors">Fazer minha primeira reserva</button>
                    </div>
                ) : (
                    myReservations.map(res => {
                        const area = areas.find(a => a.id === res.areaId);
                        const isPast = new Date(res.date) < new Date(new Date().setHours(0,0,0,0));
                        return (
                            <div key={res.id} className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group hover:shadow-lg transition-all ${isPast ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold border-2 ${isPast ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-brand-50 text-brand-600 border-brand-100'}`}>
                                        <span className="text-2xl leading-none">{new Date(res.date).getDate()}</span>
                                        <span className="text-[10px] uppercase tracking-wider opacity-70">{new Date(res.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800 mb-1">{area?.name || 'Área Removida'}</h4>
                                        <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
                                            <Clock size={14}/> {res.startTime}h - {res.endTime}h
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            {formatCurrency(res.totalPrice)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pl-22 md:pl-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0">
                                    <span className={getStatusBadge(res.status)}>{getStatusLabel(res.status)}</span>
                                    {!isPast && res.status !== 'CANCELLED' && res.status !== 'COMPLETED' && (
                                        <button onClick={() => onCancelReservation(res.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-3 rounded-xl transition-colors" title="Cancelar Reserva">
                                            <Trash2 size={20}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        )}

        {activeTab === 'PACKAGES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {packages.filter(p => p.userApt === currentUser.apartment && p.userBlock === currentUser.block).sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).map(pkg => (
                    <div key={pkg.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all">
                        <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[10px] uppercase font-bold tracking-wider ${pkg.status === 'WAITING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {pkg.status === 'WAITING' ? 'AGUARDANDO RETIRADA' : 'ENTREGUE'}
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-200 shadow-inner">
                                {pkg.image ? <img src={pkg.image} className="w-full h-full object-cover rounded-2xl"/> : <PackageIcon className="text-slate-400" size={32}/>}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-lg">{pkg.sender}</h4>
                                <p className="text-sm text-slate-500 mb-3 leading-snug">{pkg.description || 'Sem descrição'}</p>
                                
                                {pkg.status === 'WAITING' ? (
                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl inline-flex flex-col">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Código de Retirada</span>
                                        <span className="font-mono font-bold text-slate-800 text-xl tracking-[0.2em]">{pkg.pickupCode}</span>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-4">
                                        <CheckCircle2 size={12}/> Entregue em: {new Date(pkg.pickupDate || '').toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {packages.filter(p => p.userApt === currentUser.apartment && p.userBlock === currentUser.block).length === 0 && (
                     <div className="col-span-full text-center py-20 bg-white/60 rounded-[2rem] border-2 border-white shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Archive size={24} className="text-slate-400"/>
                        </div>
                        <p className="text-slate-500 font-medium">Nenhuma encomenda registrada.</p>
                     </div>
                )}
            </div>
        )}

        {showIdModal && <DigitalIdModal user={currentUser} onClose={() => setShowIdModal(false)} />}
        {showRules && selectedArea && (
            <RulesAcceptanceModal 
                areaName={selectedArea.name} 
                rules={selectedArea.usageRules}
                onAccept={handleBook}
                onReject={() => setShowRules(false)}
            />
        )}
    </div>
  );
};

const ManagerDashboard: React.FC<{
  reservations: Reservation[];
  users: User[];
  areas: Area[];
  settings: SystemSettings;
  logs: AccessLog[];
  onUpdateStatus: (id: string, status: string, reason?: string) => Promise<void>;
  onSaveArea: (area: Area) => Promise<void>;
  onDeleteArea: (id: string) => Promise<void>;
  onSaveSettings: (s: SystemSettings) => Promise<void>;
  onAddUser: (u: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onToggleBlock: (id: string, blocked: boolean) => Promise<void>;
  onResetPass: (id: string, pass: string) => Promise<void>;
}> = ({ reservations, users, areas, settings, logs, onUpdateStatus, onSaveArea, onDeleteArea, onSaveSettings, onAddUser, onDeleteUser, onToggleBlock, onResetPass }) => {
   const [activeTab, setActiveTab] = useState('OVERVIEW');
   
   const kpis = {
       reservations: reservations.length,
       users: users.length,
       revenue: reservations.filter(r => r.status !== 'CANCELLED').reduce((acc, r) => acc + r.totalPrice, 0)
   };

   return (
       <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
           {/* Manager Tabs */}
           <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-white overflow-x-auto sticky top-20 z-30">
               {['OVERVIEW', 'USERS', 'AREAS', 'SETTINGS'].map(tab => (
                   <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-white'}`}>
                       {tab === 'OVERVIEW' ? 'Visão Geral' : tab === 'USERS' ? 'Moradores' : tab === 'AREAS' ? 'Áreas Comuns' : 'Ajustes'}
                   </button>
               ))}
           </div>

           {activeTab === 'OVERVIEW' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Total Reservas</div>
                       <div className="text-4xl font-bold text-brand-600">{kpis.reservations}</div>
                   </div>
                   <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Total Moradores</div>
                       <div className="text-4xl font-bold text-purple-600">{kpis.users}</div>
                   </div>
                   <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Receita Estimada</div>
                       <div className="text-4xl font-bold text-emerald-600">{formatCurrency(kpis.revenue)}</div>
                   </div>
                   
                   <div className="col-span-full bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-96 relative overflow-hidden">
                        <h3 className="font-bold mb-6 text-lg text-slate-800">Reservas por Mês</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={[{name: 'Jan', val: 12}, {name: 'Fev', val: 19}, {name: 'Mar', val: 8}]}> 
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10}/>
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}}/>
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}/>
                                <Bar dataKey="val" fill="#0284c7" radius={[6,6,0,0]} barSize={50}/>
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
               </div>
           )}
           
           {activeTab === 'USERS' && (
               <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                   <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                       <div>
                           <h3 className="font-bold text-xl text-slate-800">Gerenciar Moradores</h3>
                           <p className="text-sm text-slate-500">Controle de acesso e contatos</p>
                       </div>
                       <button onClick={() => {}} className="text-sm bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
                           <Plus size={16}/> Adicionar
                       </button>
                   </div>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-white text-slate-400 font-bold uppercase text-xs tracking-wider border-b border-slate-100">
                               <tr>
                                   <th className="p-6">Morador</th>
                                   <th className="p-6">Contato</th>
                                   <th className="p-6">Bloco/Apto</th>
                                   <th className="p-6">Permissão</th>
                                   <th className="p-6">Status</th>
                                   <th className="p-6 text-right">Ações</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                               {users.map(user => (
                                   <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                       <td className="p-6">
                                           <div className="font-bold text-slate-700 text-base">{user.name}</div>
                                           <div className="text-xs font-normal text-slate-400">{user.email}</div>
                                       </td>
                                       <td className="p-6">
                                           {user.contact ? (
                                               <div className="flex items-center gap-2 text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
                                                   <Phone size={14} className="text-slate-400"/> {user.contact}
                                               </div>
                                           ) : <span className="text-slate-300 italic">--</span>}
                                       </td>
                                       <td className="p-6">
                                           <div className="font-mono text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-lg inline-block">{user.block || '?'} - {user.apartment || '?'}</div>
                                       </td>
                                       <td className="p-6"><span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">{user.role}</span></td>
                                       <td className="p-6">
                                           {user.isBlocked ? 
                                               <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold border border-red-100 flex items-center gap-1 w-fit"><Ban size={12}/> Bloqueado</span> : 
                                               <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> Ativo</span>
                                           }
                                       </td>
                                       <td className="p-6 text-right">
                                           <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                               <button onClick={() => onToggleBlock(user.id, !user.isBlocked)} className={`p-2 rounded-xl transition-colors ${user.isBlocked ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-red-50 text-red-500 hover:bg-red-100'}`} title={user.isBlocked ? "Desbloquear" : "Bloquear"}>
                                                   {user.isBlocked ? <Unlock size={18}/> : <Ban size={18}/>}
                                               </button>
                                               <button onClick={() => {
                                                   const newPass = prompt("Definir nova senha para o usuário:");
                                                   if(newPass) onResetPass(user.id, newPass);
                                               }} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-colors" title="Resetar Senha">
                                                   <KeyRound size={18}/>
                                               </button>
                                               <button onClick={() => { if(confirm("Excluir usuário permanentemente?")) onDeleteUser(user.id); }} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors" title="Excluir">
                                                   <Trash2 size={18}/>
                                               </button>
                                           </div>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           )}

           {activeTab === 'AREAS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                    {areas.map(area => (
                        <div key={area.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all hover:-translate-y-1">
                            <div className="h-48 bg-slate-200 relative overflow-hidden">
                                <img src={area.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                    <button onClick={() => {}} className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:text-brand-600"><Edit size={16}/></button>
                                    <button onClick={() => { if(confirm("Excluir área?")) onDeleteArea(area.id); }} className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                                <div className="absolute bottom-4 left-4">
                                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-lg">Capacidade: {area.capacity}</span>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-xl text-slate-800">{area.name}</h3>
                                    <span className="font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg text-sm">{formatCurrency(area.price)}</span>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{area.description}</p>
                                <div className="text-xs text-slate-400 font-medium">
                                    Aberto das {area.openTime}h às {area.closeTime}h
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => {}} className="bg-slate-50 border-3 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all min-h-[350px] gap-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Plus size={32}/>
                        </div>
                        <span className="font-bold text-lg">Adicionar Nova Área</span>
                    </button>
                </div>
           )}
       </div>
   )
};

const AdminDashboard: React.FC<{
  reservations: Reservation[];
  users: User[];
  areas: Area[];
  packages: Package[];
  poolStatus: PoolStatus;
  onUpdateStatus: (id: string, status: string, reason?: string) => Promise<void>;
  onAddPackage: (pkg: Package) => Promise<void>;
  onDeliverPackage: (id: string, e: React.MouseEvent) => Promise<void>;
  onPoolAccess: (userId: string, action: 'ENTRY' | 'EXIT') => Promise<void>;
}> = ({ reservations, users, areas, packages, poolStatus, onUpdateStatus, onAddPackage, onDeliverPackage, onPoolAccess }) => {
    const [activeTab, setActiveTab] = useState('RESERVATIONS');
    const [newPackage, setNewPackage] = useState<Partial<Package>>({
        sender: '', description: '', userBlock: '', userApt: ''
    });

    const pendingReservations = reservations.filter(r => r.status === 'PENDING').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const handleAddPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetUser = users.find(u => u.block === newPackage.userBlock && u.apartment === newPackage.userApt);
        if (!targetUser) {
            alert("Morador não encontrado neste Bloco/Apto");
            return;
        }
        
        const pkg: Package = {
            id: `pkg-${Date.now()}`,
            userId: targetUser.id,
            userName: targetUser.name,
            userBlock: newPackage.userBlock!,
            userApt: newPackage.userApt!,
            sender: newPackage.sender!,
            description: newPackage.description,
            entryDate: new Date().toISOString(),
            pickupCode: '', 
            status: 'WAITING'
        };
        
        await onAddPackage(pkg);
        setNewPackage({ sender: '', description: '', userBlock: '', userApt: '' });
        alert("Encomenda Registrada!");
    };

    const handleDeliverClick = async (pkgId: string, actualCode: string, e: React.MouseEvent) => {
        const codeInput = prompt("Solicite o Código de Retirada ao Morador:");
        if (codeInput === actualCode) {
            await onDeliverPackage(pkgId, e);
        } else {
            alert("Código Incorreto!");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
             {/* Admin Tabs */}
             <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-white overflow-x-auto sticky top-20 z-30">
               <button onClick={() => setActiveTab('RESERVATIONS')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'RESERVATIONS' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-500 hover:bg-white'}`}>
                   Reservas Pendentes {pendingReservations.length > 0 && <span className="ml-2 bg-white text-orange-600 px-1.5 py-0.5 rounded text-xs">{pendingReservations.length}</span>}
               </button>
               <button onClick={() => setActiveTab('PACKAGES')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'PACKAGES' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-500 hover:bg-white'}`}>
                   Encomendas
               </button>
               <button onClick={() => setActiveTab('POOL')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'POOL' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-500 hover:bg-white'}`}>
                   Controle Piscina
               </button>
           </div>

           {activeTab === 'RESERVATIONS' && (
               <div className="space-y-4 animate-fade-in">
                   {pendingReservations.length === 0 ? (
                       <div className="bg-white/60 p-20 rounded-[2rem] text-center text-slate-400 border border-white">
                           <CheckCircle2 size={64} className="mx-auto mb-6 text-emerald-200"/>
                           <p className="font-medium text-lg">Tudo limpo! Nenhuma reserva pendente.</p>
                       </div>
                   ) : (
                       pendingReservations.map(res => {
                           const area = areas.find(a => a.id === res.areaId);
                           return (
                               <div key={res.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all">
                                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                                       <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                                                <CalendarIcon size={24}/>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xl text-slate-800">{area?.name}</h4>
                                                <p className="text-slate-500 font-medium">
                                                    {new Date(res.date).toLocaleDateString()} • {res.startTime}h - {res.endTime}h
                                                </p>
                                            </div>
                                       </div>
                                       <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                           <div className="font-bold text-brand-600 text-lg">{res.userName}</div>
                                           <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bloco {res.userBlock} • Apto {res.userApt}</div>
                                       </div>
                                   </div>
                                   <div className="flex gap-4">
                                       <button onClick={() => onUpdateStatus(res.id, 'CONFIRMED')} className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-1">
                                           Aprovar Reserva
                                       </button>
                                       <button onClick={() => {
                                           const reason = prompt("Motivo da rejeição:");
                                           if(reason) onUpdateStatus(res.id, 'CANCELLED', reason);
                                       }} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors">
                                           Rejeitar
                                       </button>
                                   </div>
                               </div>
                           )
                       })
                   )}
               </div>
           )}

           {activeTab === 'PACKAGES' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                   {/* Add Package Form */}
                   <div className="lg:col-span-1">
                       <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 sticky top-40">
                           <h3 className="font-bold text-xl mb-6 flex items-center gap-3 text-slate-800"><PackageIcon size={24} className="text-orange-500"/> Nova Chegada</h3>
                           <form onSubmit={handleAddPackage} className="space-y-4">
                               <div className="flex gap-3">
                                   <input placeholder="Bloco" className="w-1/2 p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 transition-all" value={newPackage.userBlock} onChange={e => setNewPackage({...newPackage, userBlock: e.target.value})} required/>
                                   <input placeholder="Apto" className="w-1/2 p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 transition-all" value={newPackage.userApt} onChange={e => setNewPackage({...newPackage, userApt: e.target.value})} required/>
                               </div>
                               <input placeholder="Remetente (Ex: Amazon)" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 transition-all" value={newPackage.sender} onChange={e => setNewPackage({...newPackage, sender: e.target.value})} required/>
                               <input placeholder="Descrição (Opcional)" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 transition-all" value={newPackage.description} onChange={e => setNewPackage({...newPackage, description: e.target.value})}/>
                               <button className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-900/20 transform hover:-translate-y-1 transition-all">
                                   Registrar Encomenda
                               </button>
                           </form>
                       </div>
                   </div>

                   {/* Package List */}
                   <div className="lg:col-span-2 space-y-4">
                       <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-2 pl-2">Aguardando Retirada</h3>
                       {packages.filter(p => p.status === 'WAITING').length === 0 && (
                           <div className="bg-white/50 p-8 rounded-3xl border border-white text-center text-slate-400 italic">Nenhuma encomenda pendente.</div>
                       )}
                       {packages.filter(p => p.status === 'WAITING').map(pkg => (
                           <div key={pkg.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                               <div>
                                   <div className="font-bold text-slate-800 text-lg">{pkg.userName}</div>
                                   <div className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg inline-block mb-2">Bl {pkg.userBlock} / {pkg.userApt}</div>
                                   <div className="text-sm text-slate-600 font-medium">{pkg.sender} - {pkg.description}</div>
                                   <div className="text-xs text-slate-400 mt-1">Chegou: {new Date(pkg.entryDate).toLocaleDateString()}</div>
                               </div>
                               <button onClick={(e) => handleDeliverClick(pkg.id, pkg.pickupCode, e)} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                                   Entregar
                               </button>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {activeTab === 'POOL' && (
               <PoolControlPanel poolStatus={poolStatus} onAccess={onPoolAccess} allUsers={users}/>
           )}
        </div>
    );
};

// --- APP ENTRY POINT ---
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [poolStatus, setPoolStatus] = useState<PoolStatus>({ currentOccupancy: 0, lastUpdated: new Date().toISOString() });
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  useEffect(() => { const init = async () => { await initFirebase(PUBLIC_FIREBASE_CONFIG); setLoading(false); }; init(); }, []);
  useEffect(() => { if (!loading) { subscribeToUsers(setUsers); subscribeToReservations(setReservations); subscribeToAreas(setAreas); subscribeToPackages(setPackages); subscribeToSettings(setSettings); subscribeToLogs(setLogs); subscribeToPoolStatus(setPoolStatus); } }, [loading]);

  const handleLogin = async (userStub: User, pass?: string) => {
      const authenticatedUser = await loginUserHybrid(userStub.email, pass || '');
      if (authenticatedUser.role !== userStub.role) {
          throw new Error(`Este usuário não tem permissão de ${userStub.role === 'RESIDENT' ? 'Morador' : userStub.role === 'MANAGER' ? 'Síndico' : 'Administrativo'}`);
      }
      if (authenticatedUser.isBlocked) {
          throw new Error("Acesso bloqueado. Contate a administração.");
      }
      setCurrentUser(authenticatedUser);
  };

  const handleRegister = async (newUser: User, pass: string): Promise<User> => {
      return await registerUserWithAuth(newUser, pass);
  };

  const handleLogout = async () => {
      await logoutUser();
      setCurrentUser(null);
  }

  const handleOptimisticDelivery = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); e.preventDefault();
      const p = packages.find(pk => pk.id === id); if (!p) return;
      const optimistic = { ...p, status: 'DELIVERED' as const, pickupDate: new Date().toISOString() };
      setPackages(prev => prev.map(pkg => pkg.id === id ? optimistic : pkg));
      try { await markPackageAsDelivered(id); } 
      catch (err) { alert("Erro na entrega"); setPackages(prev => prev.map(pkg => pkg.id === id ? p : pkg)); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-brand-600" size={40}/></div>;
  if (!currentUser) return <AuthPage onLogin={handleLogin} onRegister={handleRegister} allUsers={users}/>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-800">
       <header className="glass-panel sticky top-0 z-40 border-b border-white/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
             <div className="flex items-center gap-3 text-brand-700 font-bold text-2xl tracking-tight">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30"><Building size={20}/></div>
                Condominium+
             </div>
             <div className="flex items-center gap-4">
                <button onClick={() => setIsPassModalOpen(true)} className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md">
                   <UserIcon size={16}/> {currentUser.name}
                </button>
                <button onClick={handleLogout} className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors" title="Sair">
                   <LogOut size={20}/>
                </button>
             </div>
          </div>
       </header>

       <main className="p-4 md:p-8 max-w-7xl mx-auto">
          {currentUser.role === UserRole.RESIDENT && (
             <ResidentDashboard currentUser={currentUser} reservations={reservations} areas={areas} packages={packages} poolStatus={poolStatus} onAddReservation={addReservation} onCancelReservation={(id) => updateReservationStatus(id, ReservationStatus.CANCELLED)} />
          )}
          {currentUser.role === UserRole.MANAGER && (
             <ManagerDashboard reservations={reservations} users={users} areas={areas} settings={settings || DEFAULT_SETTINGS} logs={logs} onUpdateStatus={updateReservationStatus} onSaveArea={saveArea} onDeleteArea={deleteArea} onSaveSettings={saveSettings} onAddUser={addUser} onDeleteUser={deleteUser} onToggleBlock={toggleUserBlock} onResetPass={updateUserPassword} />
          )}
          {currentUser.role === UserRole.ADMIN && (
             <AdminDashboard reservations={reservations} users={users} areas={areas} packages={packages} poolStatus={poolStatus} onUpdateStatus={updateReservationStatus} onAddPackage={addPackage} onDeliverPackage={handleOptimisticDelivery} onPoolAccess={processPoolAccess} />
          )}
       </main>
       
       <SmartAssistant reservations={reservations} areas={areas} currentUserRole={currentUser.role} />
       {isPassModalOpen && <ChangePasswordModal user={currentUser} onClose={() => setIsPassModalOpen(false)} onUpdatePass={updateUserPassword} />}
       
       {currentUser.role === UserRole.RESIDENT && reservations.find(r => r.userId === currentUser.id && r.isPromotionNotificationPending) && (
          <NotificationModal reservation={reservations.find(r => r.userId === currentUser.id && r.isPromotionNotificationPending)!} areaName={areas.find(a=>a.id === reservations.find(r => r.userId === currentUser.id && r.isPromotionNotificationPending)!.areaId)?.name || ''} onClose={() => updateReservation(reservations.find(r => r.userId === currentUser.id && r.isPromotionNotificationPending)!.id, { isPromotionNotificationPending: false })} />
       )}
       {currentUser.role === UserRole.RESIDENT && reservations.find(r => r.userId === currentUser.id && r.isCancellationNotificationPending) && (
          <CancellationNotificationModal reservation={reservations.find(r => r.userId === currentUser.id && r.isCancellationNotificationPending)!} areaName={areas.find(a=>a.id === reservations.find(r => r.userId === currentUser.id && r.isCancellationNotificationPending)!.areaId)?.name || ''} onClose={() => updateReservation(reservations.find(r => r.userId === currentUser.id && r.isCancellationNotificationPending)!.id, { isCancellationNotificationPending: false })} />
       )}
    </div>
  );
};

export default App;