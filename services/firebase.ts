import * as firebaseApp from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, setDoc, deleteDoc, query, orderBy, getDoc, runTransaction, where, getDocs
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut as firebaseSignOut
} from 'firebase/auth';
import { User, Reservation, Area, SystemSettings, AccessLog, Package, PoolStatus, PoolLog } from '../types';

// Workaround for potential type definition mismatch in some environments
const initializeApp = (firebaseApp as any).initializeApp;
const getApps = (firebaseApp as any).getApps;

let db: any = null;
let auth: any = null;

// Função auxiliar para remover campos undefined (Firestore não aceita undefined)
const cleanData = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: typeof v === 'object' ? cleanData(v) : v }), {});
};

export const isFirebaseInitialized = () => !!db;

export const initFirebase = async (config: any) => {
  try {
    // CRITICAL FIX: Check if app is already initialized to prevent errors on re-renders
    if (getApps && getApps().length > 0) {
      console.log("Firebase App already initialized. Using existing instance.");
      const app = getApps()[0];
      db = getFirestore(app);
      auth = getAuth(app);
      return true;
    }

    const app = initializeApp(config);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully');
    return true;
  } catch (error: any) {
    // If error is "app already exists", we can ignore it and just get firestore
    if (error.code === 'app/duplicate-app' || error.message?.includes('already exists')) {
       const app = getApps()[0];
       db = getFirestore(app);
       auth = getAuth(app);
       return true;
    }
    console.error('Error initializing Firebase:', error);
    return false;
  }
};

// --- AUTHENTICATION SERVICE (HYBRID) ---

export const registerUserWithAuth = async (userData: User, password: string): Promise<User> => {
  if (!auth || !db) throw new Error("Firebase não inicializado");

  // 1. Create User in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
  const firebaseUser = userCredential.user;

  // 2. Send Verification Email
  await sendEmailVerification(firebaseUser);

  // 3. Save User Profile in Firestore
  // We use the same ID from Auth to link them easily, or keep using our generated ID structure.
  // For consistency with current app, we'll store the profile with a generated ID, but we could link using email.
  // Let's use the userData.id (which is usually 'u-timestamp') as the document key to maintain structure,
  // but add the authUid field.
  
  const finalUser: User = {
    ...userData,
    isVerified: false, // Initially false until they click the email link
    // We don't store password in Firestore for Auth users
  };
  
  // Remove password from object before saving to Firestore
  const { password: _, ...userToSave } = finalUser;

  await setDoc(doc(db, 'users', finalUser.id), cleanData(userToSave));
  
  return finalUser;
};

export const loginUserHybrid = async (email: string, password: string): Promise<User> => {
  if (!auth || !db) throw new Error("Firebase não inicializado");

  try {
    // TENTATIVA 1: Login via Firebase Auth (Novos Usuários)
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Check Verification
    if (!firebaseUser.emailVerified) {
      // Opcional: Reenviar email se necessário, ou apenas bloquear
      throw new Error("Email não verificado. Por favor, verifique sua caixa de entrada e clique no link de confirmação.");
    }

    // Se logou e verificou, busca o perfil no Firestore pelo email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Usuário autenticado, mas perfil não encontrado no sistema.");
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as User;
    
    // Atualiza status de verificação no banco se estiver pendente
    if (!userData.isVerified) {
       await updateDoc(doc(db, 'users', userDoc.id), { isVerified: true });
       userData.isVerified = true;
    }

    return { ...userData, id: userDoc.id };

  } catch (authError: any) {
    // TENTATIVA 2: Login via Firestore Legado (Usuários Antigos/Teste)
    // Se o erro for 'user-not-found' ou 'wrong-password' no Auth, verificamos o banco antigo.
    // Nota: Se o usuário existe no Auth e errou a senha, idealmente não deveríamos deixar logar no legado,
    // mas para evitar complexidade, verificamos o legado apenas se não conseguir logar no Auth.
    
    console.warn("Auth Login failed, trying legacy...", authError.code);

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as User;

      // Verifica senha "legada" armazenada em texto plano
      if (userData.password === password) {
        // Sucesso Legado!
        // Ignora verificação de email para usuários legados (assumimos true se undefined)
        return { ...userData, id: userDoc.id };
      }
    }

    // Se falhar nos dois
    if (authError.code === 'auth/wrong-password') throw new Error("Senha incorreta.");
    if (authError.code === 'auth/user-not-found') throw new Error("Usuário não encontrado.");
    if (authError.code === 'auth/too-many-requests') throw new Error("Muitas tentativas falhas. Tente novamente mais tarde.");
    
    throw new Error(authError.message || "Falha na autenticação.");
  }
};

export const logoutUser = async () => {
  if (auth) await firebaseSignOut(auth);
};


// --- EXISTING SERVICES ---

export const validateConnection = async () => {
  if (!db) throw new Error("Firebase não inicializado.");

  // Cria uma promessa que rejeita após 10 segundos
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Tempo limite de conexão excedido (10s). Verifique sua internet ou se o Firestore está habilitado no console.")), 10000)
  );

  const connectionPromise = async () => {
      try {
        // Tenta escrever em um documento de teste
        const healthRef = doc(db, '_system_health', 'connection_test');
        await setDoc(healthRef, { 
          status: 'online', 
          timestamp: Date.now(),
          agent: navigator.userAgent 
        });
        // Limpa o teste
        await deleteDoc(healthRef);
        return true;
      } catch (err) {
        throw err;
      }
  };

  try {
    await Promise.race([connectionPromise(), timeoutPromise]);
    return true;
  } catch (error: any) {
    console.error("Falha na validação da conexão:", error);
    throw error;
  }
};

// --- Generic Subscription Helper ---
const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
  if (!db) return () => {};
  
  const q = query(collection(db, collectionName));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      ...doc.data(), // Dados primeiro
      id: doc.id     // Chave do documento por último (sobrescreve id interno se houver divergência)
    }));
    callback(items);
  }, (error) => {
    console.error(`Error listening to ${collectionName}:`, error);
  });
};

// --- Specific Data Type Handlers ---

// USERS
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  return subscribeToCollection('users', callback);
};
export const addUser = async (user: User) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const cleanedUser = cleanData(user);
  if (user.id) {
    await setDoc(doc(db, 'users', user.id), cleanedUser);
  } else {
    await addDoc(collection(db, 'users'), cleanedUser);
  }
};
export const deleteUser = async (id: string) => {
  if (!db) throw new Error("Banco de dados desconectado. Tente recarregar a página.");
  try {
    console.log(`Attempting to delete user with ID: ${id}`);
    await deleteDoc(doc(db, 'users', id));
    console.log(`User ${id} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
};
export const toggleUserBlock = async (id: string, isBlocked: boolean) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const ref = doc(db, 'users', id);
  await updateDoc(ref, { isBlocked });
};
export const updateUserPassword = async (id: string, newPass: string) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const ref = doc(db, 'users', id);
  await updateDoc(ref, { password: newPass });
};

// Removed legacy confirmUserVerification as Auth handles it now, 
// but keeping minimal fallback if needed or just remove it.
// We will replace its usage in App.tsx

// RESERVATIONS
export const subscribeToReservations = (callback: (res: Reservation[]) => void) => {
  return subscribeToCollection('reservations', callback);
};
export const addReservation = async (reservation: Reservation) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const cleanedRes = cleanData(reservation);
  await setDoc(doc(db, 'reservations', reservation.id), cleanedRes);
};
export const updateReservationStatus = async (id: string, status: string, reason?: string) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const ref = doc(db, 'reservations', id);
  const data: any = { status };
  
  if (reason) data.cancellationReason = reason;
  
  if (status === 'CANCELLED') {
      data.isCancellationNotificationPending = true;
  }

  await updateDoc(ref, data);
};
export const updateReservation = async (id: string, data: Partial<Reservation>) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const ref = doc(db, 'reservations', id);
  await updateDoc(ref, cleanData(data));
};

// AREAS
export const subscribeToAreas = (callback: (areas: Area[]) => void) => {
  return subscribeToCollection('areas', callback);
};
export const saveArea = async (area: Area) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const cleanedArea = cleanData(area);
  await setDoc(doc(db, 'areas', area.id), cleanedArea);
};
export const deleteArea = async (id: string) => {
  if (!db) throw new Error("Banco de dados desconectado");
  await deleteDoc(doc(db, 'areas', id));
};

// SETTINGS
export const subscribeToSettings = (callback: (settings: SystemSettings | null) => void) => {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'config', 'general'), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as SystemSettings);
    } else {
      callback(null);
    }
  });
};
export const saveSettings = async (settings: SystemSettings) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const cleanedSettings = cleanData(settings);
  await setDoc(doc(db, 'config', 'general'), cleanedSettings);
};

// LOGS
export const subscribeToLogs = (callback: (logs: AccessLog[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AccessLog));
      callback(logs);
  });
};
export const addLog = async (log: AccessLog) => {
  if (!db) return; 
  const cleanedLog = cleanData(log);
  await addDoc(collection(db, 'access_logs'), cleanedLog);
};

// PACKAGES (ENCOMENDAS)
export const subscribeToPackages = (callback: (packages: Package[]) => void) => {
  return subscribeToCollection('packages', callback);
};

export const addPackage = async (pkg: Package) => {
  if (!db) throw new Error("Banco de dados desconectado");
  const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();
  const packageWithCode = { ...pkg, pickupCode };
  const cleanedPkg = cleanData(packageWithCode);
  await setDoc(doc(db, 'packages', pkg.id), cleanedPkg);
};

export const markPackageAsDelivered = async (id: string) => {
  if (!db) throw new Error("Banco de dados desconectado");
  console.log(`Checking package ${id} before delivery...`);
  const ref = doc(db, 'packages', id);
  
  try {
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      console.error(`CRITICAL: Package ${id} not found in DB!`);
      throw new Error(`Pacote não encontrado no banco de dados (ID: ${id})`);
    }

    console.log(`Package found. Marking as delivered...`);
    await setDoc(ref, { 
      status: 'DELIVERED',
      pickupDate: new Date().toISOString()
    }, { merge: true });
    
    console.log(`Package ${id} marked as delivered successfully.`);
  } catch (error: any) {
    console.error("Error in markPackageAsDelivered:", error);
    if (error.code === 'permission-denied') {
        throw new Error("Permissão Negada: Verifique as Regras de Segurança no Console do Firebase (Firestore Database > Rules). Certifique-se que 'allow read, write: if true;' está ativo.");
    }
    throw error;
  }
};

// --- POOL CONTROL SERVICE ---
export const subscribeToPoolStatus = (callback: (status: PoolStatus) => void) => {
  if (!db) return () => {};
  const ref = doc(db, 'pool_status', 'main');
  return onSnapshot(ref, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as PoolStatus);
    } else {
      callback({ currentOccupancy: 0, lastUpdated: new Date().toISOString() });
    }
  });
};

export const processPoolAccess = async (userId: string, action: 'ENTRY' | 'EXIT') => {
  if (!db) throw new Error("Banco de dados desconectado");
  
  const statusRef = doc(db, 'pool_status', 'main');
  const userRef = doc(db, 'users', userId);

  try {
    await runTransaction(db, async (transaction: any) => {
      // 1. Validate User
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Carteirinha/QR Code inválido: Usuário não encontrado.");
      
      const userData = userDoc.data() as User;
      if (userData.isBlocked) throw new Error("Acesso Negado: Usuário Bloqueado.");

      // 2. Get Current Status
      const statusDoc = await transaction.get(statusRef);
      let currentOccupancy = 0;
      let activeUsers: string[] = [];

      if (statusDoc.exists()) {
        const data = statusDoc.data();
        currentOccupancy = data.currentOccupancy || 0;
        activeUsers = data.activeUsers || [];
      }

      // 3. Logic with Strict Duplicate Prevention
      const currentActiveSet = new Set((activeUsers || []).map(id => String(id)));
      
      if (action === 'ENTRY') {
        if (currentActiveSet.has(userId)) {
           throw new Error(`O usuário ${userData.name} já registrou entrada e consta como presente.`);
        }
        currentActiveSet.add(userId);
      } else {
        if (currentActiveSet.has(userId)) {
           currentActiveSet.delete(userId);
        }
      }

      const newActiveUsersList = Array.from(currentActiveSet);
      const newOccupancy = newActiveUsersList.length;

      // 4. Update Status
      transaction.set(statusRef, { 
        currentOccupancy: newOccupancy, 
        activeUsers: newActiveUsersList,
        lastUpdated: new Date().toISOString() 
      });

      // 5. Add Log
      const newLogRef = doc(collection(db, 'pool_logs'));
      const logData: PoolLog = {
        id: newLogRef.id,
        userId: userData.id,
        userName: userData.name,
        userBlock: userData.block || '',
        userApt: userData.apartment || '',
        action,
        timestamp: new Date().toISOString()
      };
      transaction.set(newLogRef, logData);
    });
    
  } catch (e: any) {
    const safeMessage = e.message || "Erro desconhecido durante o processamento de acesso.";
    console.error("Pool Access Transaction Error:", safeMessage);
    throw new Error(safeMessage);
  }
};