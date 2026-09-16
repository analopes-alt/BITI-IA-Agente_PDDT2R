import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";

let isFirebaseInitialized = false;
let authInstance: any = null;
let googleProvider: any = null;
let cachedToken: string | null = null;
let isSigningIn = false;

// Função para buscar a configuração no servidor e inicializar o Firebase dinamicamente
export async function initFirebase(): Promise<boolean> {
  if (isFirebaseInitialized) return true;
  try {
    const res = await fetch("/api/firebase-config");
    if (!res.ok) return false;
    const config = await res.json();
    
    if (config && config.apiKey) {
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      authInstance = getAuth(app);
      googleProvider = new GoogleAuthProvider();
      
      // Solicita a permissão de leitura de arquivos do Google Drive
      googleProvider.addScope("https://www.googleapis.com/auth/drive.readonly");
      googleProvider.addScope("https://www.googleapis.com/auth/userinfo.profile");
      googleProvider.addScope("https://www.googleapis.com/auth/userinfo.email");
      
      isFirebaseInitialized = true;
      return true;
    }
  } catch (e) {
    console.error("Erro ao inicializar o Firebase dinamicamente:", e);
  }
  return false;
}

// Inicia o observador de estado do usuário
export function listenAuthState(
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) {
  // Se o Firebase ainda não foi inicializado, tentamos inicializar primeiro
  initFirebase().then((initialized) => {
    if (!initialized || !authInstance) {
      onAuthFailure();
      return;
    }

    onAuthStateChanged(authInstance, (user: any) => {
      if (user) {
        if (cachedToken) {
          onAuthSuccess(user, cachedToken);
        } else if (!isSigningIn) {
          // Se houver usuário mas o token foi perdido na sessão em memória, pede reautenticação
          onAuthFailure();
        }
      } else {
        cachedToken = null;
        onAuthFailure();
      }
    });
  });
}

// Executa o login popup do Google Auth
export async function signInWithGoogle(): Promise<{ user: User; token: string } | null> {
  const initialized = await initFirebase();
  if (!initialized || !authInstance || !googleProvider) {
    throw new Error("Serviço de autenticação do Firebase não inicializado ou indisponível.");
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(authInstance, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error("Não foi possível extrair o token de acesso (OAuth Access Token) do Google.");
    }

    cachedToken = token;
    return { user: result.user, token };
  } catch (err) {
    console.error("Erro no login do Google:", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
}

// Executa o logout
export async function logoutUser() {
  cachedToken = null;
  if (authInstance) {
    await signOut(authInstance);
  }
}

// Retorna o token em memória
export function getCachedToken() {
  return cachedToken;
}
