import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
// Standard Google Account selection prompt
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory only (NEVER in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let tokenAcquiredAt: number | null = null;

// Google OAuth access tokens expire after 1 hour (3600s). Treat as expired at 55 minutes (3300s)
const TOKEN_MAX_AGE_MS = 55 * 60 * 1000;

export const isDriveTokenExpired = (): boolean => {
  if (!cachedAccessToken) return true;
  if (!tokenAcquiredAt) return false;
  return Date.now() - tokenAcquiredAt >= TOKEN_MAX_AGE_MS;
};

export const clearCachedToken = () => {
  cachedAccessToken = null;
  tokenAcquiredAt = null;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken && !isDriveTokenExpired()) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not cached yet (e.g. page reload or expired); user is logged in to Firebase
        // but needs a fresh token from signInWithPopup to call Drive API
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearCachedToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get Google Drive access token from authentication');
    }

    cachedAccessToken = credential.accessToken;
    tokenAcquiredAt = Date.now();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // If the user cancelled or closed the popup window, handle gracefully
    if (
      error?.code === 'auth/user-cancelled' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.warn('Google sign-in was dismissed by user.');
      return null;
    }
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (isDriveTokenExpired()) {
    clearCachedToken();
    return null;
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  clearCachedToken();
};
