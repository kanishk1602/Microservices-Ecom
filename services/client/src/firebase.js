// Firebase configuration and initialization
// This module is SSR-safe - Firebase is only initialized on the client

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy initialization - only create app/auth when actually needed on client
let app = null;
let authInstance = null;
let providerInstance = null;

async function getFirebaseApp() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!app) {
    const { initializeApp, getApps } = await import("firebase/app");
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

async function getAuth() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!authInstance) {
    const { getAuth: firebaseGetAuth } = await import("firebase/auth");
    const firebaseApp = await getFirebaseApp();
    if (firebaseApp) {
      authInstance = firebaseGetAuth(firebaseApp);
    }
  }
  return authInstance;
}

async function getProvider() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!providerInstance) {
    const { GoogleAuthProvider } = await import("firebase/auth");
    providerInstance = new GoogleAuthProvider();
  }
  return providerInstance;
}

// Export as async getter functions
export { getAuth as auth, getProvider as provider };
