"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  type User as FirebaseUser,
  type AuthError,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "./firebase"
import type { User } from "./types"

interface AuthContextType {
  user: FirebaseUser | null
  userData: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  signInWithApple: () => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function handleGoogleUserDoc(user: FirebaseUser) {
  const { uid, email, displayName, photoURL } = user
  const userDoc = await getDoc(doc(db, "users", uid))
  if (!userDoc.exists()) {
    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      fullName: displayName || "New Player",
      photoUrl: photoURL,
      role: "player",
      registrationStatus: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: "google",
    })
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[v0] Auth state changed:", firebaseUser?.email || "null")
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            setUserData(userDoc.data() as User)
          } else {
            await handleGoogleUserDoc(firebaseUser)
            const newUserDoc = await getDoc(doc(db, "users", firebaseUser.uid))
            if (newUserDoc.exists()) {
              setUserData(newUserDoc.data() as User)
            }
          }
        } catch (error) {
          console.error("[v0] Error fetching user data:", error)
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const { uid, email: userEmail } = userCredential.user

    await setDoc(doc(db, "users", uid), {
      uid,
      email: userEmail,
      fullName,
      role: "player",
      registrationStatus: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: "user",
    })
  }

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: "select_account",
    })

    try {
      console.log("[v0] Starting Google sign-in...")
      const result = await signInWithPopup(auth, provider)
      console.log("[v0] Google sign-in successful:", result.user.email)
      await handleGoogleUserDoc(result.user)
      return { success: true }
    } catch (error: unknown) {
      const firebaseError = error as AuthError
      console.error("[v0] Google sign-in error:", firebaseError.code, firebaseError.message)

      // Handle account merging
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        try {
          // Get the email from the error
          const email = firebaseError.customData?.email as string

          if (email) {
            // Fetch sign-in methods for this email
            const signInMethods = await fetchSignInMethodsForEmail(auth, email)

            // If the user has an email/password account, we can merge
            if (signInMethods.includes("password")) {
              return {
                success: false,
                error: `An account already exists with ${email}. Please sign in with email/password first, then link your Google account from your profile settings.`,
              }
            }
          }
        } catch (mergeError) {
          console.error("[v0] Account merging error:", mergeError)
        }

        return {
          success: false,
          error: "An account already exists with this email. Please sign in using your original method.",
        }
      }

      // Return user-friendly error messages
      let errorMessage = "Failed to sign in with Google"

      if (firebaseError.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked. Please allow popups for this site or try the email sign-in."
      } else if (firebaseError.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in was cancelled."
      } else if (firebaseError.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in was cancelled."
      } else if (firebaseError.code === "auth/unauthorized-domain") {
        errorMessage =
          "This domain is not authorized for Google sign-in. Please use email/password or deploy to an authorized domain."
      } else if (firebaseError.code === "auth/operation-not-allowed") {
        errorMessage = "Google sign-in is not enabled in Firebase."
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message
      }

      return { success: false, error: errorMessage }
    }
  }

  const signInWithApple = async (): Promise<{ success: boolean; error?: string }> => {
    const provider = new OAuthProvider("apple.com")
    provider.addScope("email")
    provider.addScope("name")
    provider.setCustomParameters({
      locale: "en",
    })

    try {
      console.log("[v0] Starting Apple sign-in...")
      const result = await signInWithPopup(auth, provider)
      console.log("[v0] Apple sign-in successful:", result.user.email)
      await handleGoogleUserDoc(result.user) // Reuse the same user doc handler
      return { success: true }
    } catch (error: unknown) {
      const firebaseError = error as AuthError
      console.error("[v0] Apple sign-in error:", firebaseError.code, firebaseError.message)

      // Handle account merging for Apple
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        return {
          success: false,
          error: "An account already exists with this email. Please sign in using your original method.",
        }
      }

      // Return user-friendly error messages
      let errorMessage = "Failed to sign in with Apple"

      if (firebaseError.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked. Please allow popups for this site."
      } else if (firebaseError.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in was cancelled."
      } else if (firebaseError.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in was cancelled."
      } else if (firebaseError.code === "auth/operation-not-allowed") {
        errorMessage = "Apple sign-in is not enabled in Firebase."
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message
      }

      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUserData(null)
  }

  const isAdmin = userData?.role === "admin"

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
