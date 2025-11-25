/**
 * Firebase Authentication Error Handler
 * Converts Firebase error codes to user-friendly messages
 */
export function getFirebaseErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
        // Auth errors - Generic
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled": "This account has been disabled. Please contact support.",
        "auth/user-not-found": "Invalid email or password.",
        "auth/wrong-password": "Invalid email or password.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/invalid-login-credentials": "Invalid email or password.",

        // Email/Password errors
        "auth/email-already-in-use": "This email is already registered. Please sign in instead.",
        "auth/weak-password": "Password must be at least 6 characters long.",
        "auth/operation-not-allowed": "This sign-in method is not enabled. Please contact support.",

        // Google Sign-In errors
        "auth/popup-blocked": "Popup was blocked. Please allow popups for this site.",
        "auth/popup-closed-by-user": "Sign-in was cancelled.",
        "auth/cancelled-popup-request": "Sign-in was cancelled.",
        "auth/unauthorized-domain": "This domain is not authorized. Please contact support.",

        // Apple Sign-In errors
        "auth/account-exists-with-different-credential": "An account already exists with this email. Please sign in using your original method.",

        // Network errors
        "auth/network-request-failed": "Network error. Please check your connection and try again.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",

        // Other
        "auth/requires-recent-login": "Please sign out and sign in again to perform this action.",
    }

    return errorMessages[errorCode] || "An unexpected error occurred. Please try again."
}

/**
 * Local Storage Manager for Remember Me functionality
 */
export const rememberMeStorage = {
    KEY: "ewp_remember_me",

    save: (email: string) => {
        try {
            localStorage.setItem(rememberMeStorage.KEY, email)
        } catch (error) {
            console.error("Failed to save email:", error)
        }
    },

    get: (): string | null => {
        try {
            return localStorage.getItem(rememberMeStorage.KEY)
        } catch (error) {
            console.error("Failed to get email:", error)
            return null
        }
    },

    clear: () => {
        try {
            localStorage.removeItem(rememberMeStorage.KEY)
        } catch (error) {
            console.error("Failed to clear email:", error)
        }
    },
}

/**
 * Redirect URL Manager for intelligent redirects
 */
export const redirectManager = {
    PARAM_KEY: "returnUrl",

    getReturnUrl: (searchParams: URLSearchParams): string => {
        return searchParams.get(redirectManager.PARAM_KEY) || "/dashboard"
    },

    buildLoginUrl: (returnUrl?: string): string => {
        if (!returnUrl) return "/login"
        const url = new URL("/login", window.location.origin)
        url.searchParams.set(redirectManager.PARAM_KEY, returnUrl)
        return url.pathname + url.search
    },
}
