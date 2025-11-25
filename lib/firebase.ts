import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "db-padel-reg.firebaseapp.com",
  projectId: "db-padel-reg",
  storageBucket: "db-padel-reg.firebasestorage.app",
  messagingSenderId: "88351525770",
  appId: "1:88351525770:web:a9f2eb503debc15cdd5673",
  measurementId: "G-3Z3F78ZVCF",
}

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
