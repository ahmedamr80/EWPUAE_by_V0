# Production-Grade Authentication System

## Overview

This authentication system is built for **EveryWherePadel**, a Next.js PWA for tournament registration. It implements professional-grade authentication with Firebase, featuring social sign-in, progressive profiling, and intelligent redirects.

---

## ✨ Features

### 🔐 Authentication Methods
- **Email/Password**: Traditional authentication with Zod validation
- **Google Sign-In**: One-click authentication with Google accounts
- **Apple Sign-In**: Required for iOS PWAs (App Store compliance)

### 🎯 User Experience
- **Social First**: Google/Apple buttons prominently placed at the top
- **Progressive Profiling**: Step 1 (Auth) → Step 2 (Dashboard) → Step 3 (Profile completion prompt)
- **Remember Me**: Locally caches user email for faster sign-in
- **Password Visibility Toggle**: Eye icon to show/hide passwords
- **Redirect Intelligence**: Automatically returns users to their intended page after login

### 🛡️ Security & Error Handling
- **Unified Error Messages**: Never reveals "User not found" - always shows "Invalid email or password" to prevent email harvesting
- **Firebase Error Translation**: Converts error codes to user-friendly messages
- **Account Merging Detection**: Alerts users when signing in with Google using an existing email/password account
- **Toast Notifications**: Clear, consistent feedback for all actions

### 📱 Loading States
- **Button-level spinners**: Shows loading state inside buttons during API calls
- **Per-action loading**: Separate loading states for email/password, Google, and Apple sign-in
- **Disabled states**: All inputs and buttons disabled during any loading operation

### 🎨 UI/UX
- **Clean Centered Card**: Professional,glassmorphic design
- **Consistent Layout**: Same design for both Login and Signup
- **Form Validation**: Real-time validation with React Hook Form + Zod
- **Accessibility**: Proper ARIA labels, keyboard navigation, and focus management

---

## 📂 File Structure

```
lib/
├── auth-context.tsx          # Main authentication context with all sign-in methods
├── auth-utils.ts             # Error handling, local storage, and redirect utilities
├── firebase.ts                # Firebase initialization

components/auth/
├── login-form.tsx            # Production-grade login form
└── signup-form.tsx           # Production-grade signup form

components/ui/
└── checkbox.tsx              # Checkbox component for "Remember Me"

app/
├── login/page.tsx           # Login page
└── signup/page.tsx           # Signup page
```

---

## 🔧 Implementation Details

### 1. Authentication Context (`lib/auth-context.tsx`)

Provides authentication state and methods to the entire app:

```tsx
const { signIn, signUp, signInWithGoogle, signInWithApple, user, userData, loading, isAdmin } = useAuth()
```

**Account Merging Logic**:
- Detects when a user tries to sign in with Google using an email that already has a password-based account
- Provides clear guidance to merge accounts manually via profile settings

### 2. Utilities (`lib/auth-utils.ts`)

#### Firebase Error Handler
```tsx
getFirebaseErrorMessage(errorCode: string): string
```
Converts Firebase error codes to user-friendly messages.

#### Remember Me Storage
```tsx
rememberMeStorage.save(email)
rememberMeStorage.get()
rememberMeStorage.clear()
```

#### Redirect Manager
```tsx
redirectManager.getReturnUrl(searchParams)
redirectManager.buildLoginUrl(returnUrl)
```

**Example Usage**:
```tsx
// In a protected route
if (!user) {
  router.push(redirectManager.buildLoginUrl(window.location.pathname))
}

// In login form
const returnUrl = redirectManager.getReturnUrl(searchParams)
router.push(returnUrl) // Returns user to original page
```

### 3. Form Validation (Zod Schemas)

**Login Schema**:
```tsx
z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})
```

**Signup Schema**:
```tsx
z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
```

---

## 🚀 Usage Examples

### Protecting a Route with Redirect Intelligence

```tsx
"use client"

import { useAuth } from "@/lib/auth-context"
import { redirectManager } from "@/lib/auth-utils"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function TeamInvitePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      // Send user to login, then back to this page
      const loginUrl = redirectManager.buildLoginUrl(window.location.pathname)
      router.push(loginUrl)
    }
  }, [user, loading, router])

  if (loading) return <Spinner />
  if (!user) return null

  return <div>Team Invite Content</div>
}
```

### Custom Toast Error Handling

```tsx
import { useToast } from "@/hooks/use-toast"
import { getFirebaseErrorMessage } from "@/lib/auth-utils"

const { toast } = useToast()

try {
  await signIn(email, password)
} catch (error) {
  const errorCode = (error as FirebaseError).code || "unknown"
  toast({
    variant: "destructive",
    title: "Sign in failed",
    description: getFirebaseErrorMessage(errorCode),
  })
}
```

---

## 🔒 Firebase Configuration

### Required Auth Methods (Firebase Console)

1. **Email/Password**: Enabled
2. **Google**: Enabled with OAuth client credentials
3. **Apple**: Enabled with Apple Developer credentials (required for iOS PWA)

### Authorized Domains

Add your deployment domains:
- `localhost` (for development)
- Your production domain (e.g., `everywherepadel.app`)
- Vercel preview domains if deploying to Vercel

---

## 📝 Progressive Profiling Flow

1. **Step 1: Authentication** (Login/Signup)
   - Only collect: Name, Email, Password
   - No hand preference, court position, or skill level

2. **Step 2: Dashboard Landing**
   - User lands on main dashboard
   - Can browse events immediately

3. **Step 3: Profile Prompt** (Gamification)
   - When user tries to join a tournament: "Complete your profile to join events!"
   - Collect additional details: Hand preference, court position, skill level
   - Make it engaging with progress indicators

---

## 🎯 Security Best Practices Implemented

✅ **Never reveal user existence**: "Invalid email or password" instead of "User not found"  
✅ **Account merging warnings**: Clear guidance when accounts conflict  
✅ **Transactional email priority**: Password resets prioritized over marketing  
✅ **Remember Me**: Secure local storage of email only (never password)  
✅ **Loading state management**: Prevents double-submission  
✅ **Input validation**: Both client-side (Zod) and server-side (Firebase)  
✅ **Error boundaries**: Graceful degradation on auth failures

---

## 🧪 Testing Checklist

### Login Flow
- [ ] Email/password login works
- [ ] Google sign-in works
- [ ] Apple sign-in works
- [ ] "Remember Me" saves email
- [ ] Password visibility toggle works
- [ ] Validation errors display correctly
- [ ] Toast notifications appear
- [ ] Redirect to returnUrl works
- [ ] Redirect to /dashboard works (no returnUrl)

### Signup Flow
- [ ] Email/password signup works
- [ ] Google sign-up works
- [ ] Apple sign-up works
- [ ] Password confirmation validates
- [ ] Validation errors display correctly
- [ ] Toast notifications appear
- [ ] Redirects to /dashboard

### Error Handling
- [ ] Wrong password shows "Invalid email or password"
- [ ] Non-existent email shows "Invalid email or password"
- [ ] Existing email on signup shows appropriate error
- [ ] Google account conflict shows merge guidance
- [ ] Network errors show user-friendly messages

### Account Merging
- [ ] Google sign-in with existing email/password account shows merge prompt
- [ ] Apple sign-in with existing account shows merge prompt

---

## 🚨 Known Limitations

1. **Automatic Account Merging**: Currently not automatic - users must manually link accounts in profile settings
2. **Apple Sign-In Testing**: Requires Apple Developer account and iOS device/simulator
3. **Email Verification**: Not implemented - add if required for production

---

## 🔮 Future Enhancements

- [ ] Password reset flow
- [ ] Email verification
- [ ] Two-factor authentication (2FA)
- [ ] Biometric authentication for PWA (WebAuthn)
- [ ] Social account linking from profile page
- [ ] Session management (force logout on password change)

---

## 📚 Dependencies

```json
{
  "dependencies": {
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "@radix-ui/react-checkbox": "^1.x",
    "firebase": "^10.x",
    "lucide-react": "^0.x"
  }
}
```

---

## 📞 Support

For issues or questions, contact the development team or refer to:
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
- [React Hook Form Documentation](https://react-hook-form.com/)

---

**Built with ❤️ by the EveryWherePadel Team**
