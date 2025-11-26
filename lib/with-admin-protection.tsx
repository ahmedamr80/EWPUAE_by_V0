"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/spinner"

/**
 * Higher-Order Component (HOC) for protecting admin routes
 * 
 * Usage:
 * export default withAdminProtection(AdminDashboard)
 */
export function withAdminProtection<P extends object>(
    WrappedComponent: React.ComponentType<P>
) {
    return function AdminProtectedComponent(props: P) {
        const { user, userData, loading } = useAuth()
        const router = useRouter()

        useEffect(() => {
            if (!loading) {
                // Not logged in - redirect to login
                if (!user) {
                    router.push("/login")
                    return
                }

                // Not an admin - redirect to events page
                if (userData?.role !== "admin") {
                    router.push("/events")
                    return
                }
            }
        }, [user, userData, loading, router])

        // Show loading while checking auth
        if (loading) {
            return (
                <div className="flex min-h-screen items-center justify-center">
                    <Spinner size="lg" />
                </div>
            )
        }

        // Not authenticated or not admin
        if (!user || userData?.role !== "admin") {
            return null
        }

        // User is admin - render component
        return <WrappedComponent {...props} />
    }
}

/**
 * Hook for checking if current user is admin
 */
export function useIsAdmin(): boolean {
    const { userData } = useAuth()
    return userData?.role === "admin"
}

/**
 * Hook for requiring admin access (throws if not admin)
 */
export function useRequireAdmin(): void {
    const { user, userData, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && (!user || userData?.role !== "admin")) {
            router.push("/events")
        }
    }, [user, userData, loading, router])
}
