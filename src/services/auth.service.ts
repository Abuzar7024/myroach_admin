import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import {
  initFirebase,
  getFirebaseAuth,
  getFirestoreDb,
  ensureFirestoreOnline,
} from "@/lib/firebase";
import { mockStore } from "@/lib/mock-data";
import { toDate, toBool, toString } from "@/lib/firestore-helpers";
import { USE_MOCK } from "@/lib/config";
import type { User, UserRole } from "@/types";

const SESSION_COOKIE = "admin_session";
const BOOTSTRAP_ADMIN_EMAIL = "admin@gmail.com";
const BOOTSTRAP_ADMIN_PASSWORD = "admin@123";
const DEV_BYPASS_UID = "dev-bypass-admin";

function getDevBypassUser(): User {
  return {
    uid: DEV_BYPASS_UID,
    name: "Dev Admin",
    email: BOOTSTRAP_ADMIN_EMAIL,
    role: "admin",
    active: true,
    createdAt: new Date(),
  };
}

/** Temporary dev-only entry without Firebase. Remove before production. */
export function bypassLogin(): User {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Bypass login is only available in development");
  }
  const user = getDevBypassUser();
  setSessionCookie(DEV_BYPASS_UID);
  return user;
}

function isFirestoreOfflineError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: string }).code ?? "";
  return (
    code === "unavailable" ||
    err.message.includes("client is offline") ||
    err.message.includes("Could not reach Cloud Firestore backend")
  );
}

async function firestoreGetDoc(ref: ReturnType<typeof doc>) {
  await ensureFirestoreOnline();
  const firestore = getFirestoreDb();
  if (!firestore) throw new Error("Firestore not initialized");
  return getDoc(ref);
}

async function firestoreSetDoc(
  ref: ReturnType<typeof doc>,
  data: Record<string, unknown>,
  options?: { merge?: boolean }
) {
  await ensureFirestoreOnline();
  if (options?.merge) await setDoc(ref, data, { merge: true });
  else await setDoc(ref, data);
}

async function ensureAdminProfile(uid: string, email: string) {
  const firestore = getFirestoreDb();
  if (!firestore) throw new Error("Firestore not initialized");
  const ref = doc(firestore, "users", uid);
  const snap = await firestoreGetDoc(ref);
  if (!snap.exists()) {
    await firestoreSetDoc(ref, {
      name: "Admin",
      email,
      role: "admin",
      active: true,
      createdAt: Timestamp.now(),
    });
    return;
  }
  const data = snap.data();
  if (data.role !== "admin") {
    await firestoreSetDoc(ref, { role: "admin", active: true }, { merge: true });
  }
}

function mapUserDoc(uid: string, data: Record<string, unknown>): User {
  return {
    uid,
    name: toString(data.name ?? data.displayName, "User"),
    email: toString(data.email),
    role: (data.role as UserRole) ?? "customer",
    active: toBool(data.active, true),
    createdAt: toDate(data.createdAt),
  };
}

function setSessionCookie(uid: string) {
  document.cookie = `${SESSION_COOKIE}=${uid}; path=/; max-age=604800; SameSite=Lax`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function firebaseAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. If this is your first login, wait a moment and try again.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.";
    case "auth/email-already-in-use":
      return "Account exists with a different password. Reset password in Firebase Console for admin@gmail.com";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/weak-password":
      return "Password does not meet Firebase requirements.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    case "permission-denied":
      return "Firestore permission denied. Deploy firestore.rules: firebase deploy --only firestore:rules";
    case "unavailable":
      return "Cannot reach Firestore (client offline). Register your App Check debug token in Firebase Console → App Check → Manage debug tokens, or disable App Check enforcement for Firestore during development.";
    default:
      return "Login failed (" + code + "). Check Firebase Console settings.";
  }
}

export async function login(email: string, password: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();

  if (USE_MOCK) {
    const user = mockStore.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.role === "admin"
    );
    if (!user || password !== BOOTSTRAP_ADMIN_PASSWORD) {
      throw new Error("Invalid email or password");
    }
    setSessionCookie(user.uid);
    return user;
  }

  initFirebase();
  const firebaseAuth = getFirebaseAuth();
  const firestore = getFirestoreDb();
  if (!firebaseAuth || !firestore) {
    throw new Error("Firebase not initialized. Copy .env.example to .env.local and restart the dev server.");
  }

  const isBootstrap =
    normalizedEmail === BOOTSTRAP_ADMIN_EMAIL && password === BOOTSTRAP_ADMIN_PASSWORD;

  try {
    let cred;
    try {
      cred = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
    } catch (signInErr: unknown) {
      const code = (signInErr as { code?: string })?.code ?? "";
      if (isBootstrap && (code === "auth/user-not-found" || code === "auth/invalid-credential")) {
        try {
          cred = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
        } catch (createErr: unknown) {
          const createCode = (createErr as { code?: string })?.code ?? "";
          throw new Error(firebaseAuthErrorMessage(createCode));
        }
      } else {
        throw new Error(firebaseAuthErrorMessage(code));
      }
    }

    try {
      await ensureAdminProfile(cred.user.uid, normalizedEmail);
    } catch (profileErr: unknown) {
      const code = (profileErr as { code?: string })?.code ?? "";
      if (code === "permission-denied") {
        throw new Error(firebaseAuthErrorMessage("permission-denied"));
      }
      if (isFirestoreOfflineError(profileErr)) {
        throw new Error(firebaseAuthErrorMessage("unavailable"));
      }
      throw profileErr;
    }

    const userDoc = await firestoreGetDoc(doc(firestore, "users", cred.user.uid));
    if (!userDoc.exists()) throw new Error("Failed to create admin profile in Firestore");
    const data = userDoc.data();
    if (data.role !== "admin") {
      await signOut(firebaseAuth);
      throw new Error("Unauthorized — user role is not admin");
    }
    setSessionCookie(cred.user.uid);
    return mapUserDoc(cred.user.uid, data);
  } catch (err: unknown) {
    if (err instanceof Error && !("code" in (err as object))) throw err;
    if (isFirestoreOfflineError(err)) {
      throw new Error(firebaseAuthErrorMessage("unavailable"));
    }
    const code = (err as { code?: string })?.code ?? "";
    throw new Error(firebaseAuthErrorMessage(code));
  }
}

export async function logout(): Promise<void> {
  clearSessionCookie();
  const firebaseAuth = getFirebaseAuth();
  if (!USE_MOCK && firebaseAuth) await signOut(firebaseAuth);
}

export function getSessionUid(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = SESSION_COOKIE + "=";
  const entry = document.cookie.split(";").find((c) => c.trim().startsWith(prefix));
  return entry ? entry.trim().slice(prefix.length) : null;
}

export async function getCurrentUser(): Promise<User | null> {
  const sessionUid = getSessionUid();
  if (sessionUid === DEV_BYPASS_UID && process.env.NODE_ENV === "development") {
    return getDevBypassUser();
  }

  if (USE_MOCK) {
    if (!sessionUid) return null;
    const user = mockStore.users.find((u) => u.uid === sessionUid && u.role === "admin");
    if (!user) clearSessionCookie();
    return user ?? null;
  }

  initFirebase();
  const firebaseAuth = getFirebaseAuth();
  const firestore = getFirestoreDb();
  if (!firebaseAuth || !firestore) {
    clearSessionCookie();
    return null;
  }

  try {
    await firebaseAuth.authStateReady();
    await ensureFirestoreOnline();
    const fbUser: FirebaseUser | null = firebaseAuth.currentUser;

    if (!fbUser) {
      if (getSessionUid()) clearSessionCookie();
      return null;
    }

    const userDocRef = doc(firestore, "users", fbUser.uid);
    let userDoc = await firestoreGetDoc(userDocRef);

    if (!userDoc.exists() && fbUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) {
      await ensureAdminProfile(fbUser.uid, BOOTSTRAP_ADMIN_EMAIL);
      userDoc = await firestoreGetDoc(userDocRef);
    }

    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      clearSessionCookie();
      await signOut(firebaseAuth);
      return null;
    }

    setSessionCookie(fbUser.uid);
    return mapUserDoc(fbUser.uid, userDoc.data());
  } catch (err: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("getCurrentUser failed:", err);
    }
    if (isFirestoreOfflineError(err)) {
      // Keep session cookie — auth succeeded; Firestore will work once App Check/network is fixed
      return null;
    }
    clearSessionCookie();
    return null;
  }
}
