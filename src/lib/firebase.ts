import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase() {
  await signOut(auth);
}

/**
 * Replicates an order to Cloud Firestore when user is signed in with verified Firebase Auth,
 * strictly adhering to firebase-blueprint.json & firestore.rules.
 */
export async function syncOrderToFirestore(order: {
  id: string;
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status: string;
  totalAmount: number;
  idempotencyKey: string;
}) {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const safeId = order.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `pos_orders/${safeId}`;
  try {
    await setDoc(doc(db, 'pos_orders', safeId), {
      ownerId: currentUser.uid,
      orderNumber: order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64),
      orderType: order.orderType,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      idempotencyKey: order.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSnapshotToFirestore(snapshotInfo: {
  id: string;
  snapshotType: 'STATE_SYNC' | 'BACKUP' | 'AUDIT_CHECKPOINT';
  version: number;
  summary: string;
}) {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const safeId = snapshotInfo.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `pos_snapshots/${safeId}`;
  try {
    await setDoc(doc(db, 'pos_snapshots', safeId), {
      ownerId: currentUser.uid,
      snapshotType: snapshotInfo.snapshotType,
      version: Math.max(1, Number(snapshotInfo.version)),
      summary: snapshotInfo.summary.slice(0, 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
