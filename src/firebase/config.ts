import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "townforge-demo.firebaseapp.com",
  databaseURL: "https://townforge-demo-default-rtdb.firebaseio.com",
  projectId: "townforge-demo",
  storageBucket: "townforge-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let app: FirebaseApp | null = null;
let db: Database | null = null;
export let firebaseAvailable = false;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  firebaseAvailable = true;
  console.log('[TownForge] Firebase initialized');
} catch (e) {
  console.warn('[TownForge] Firebase unavailable, using localStorage fallback:', e);
  firebaseAvailable = false;
}

export { app, db };
