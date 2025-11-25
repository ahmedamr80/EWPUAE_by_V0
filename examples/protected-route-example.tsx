/**
 * Example: Protected Route with Redirect Intelligence
 * 
 * This example shows how to protect a route and automatically redirect
 * unauthenticated users to login, then bring them back to this page.
 * 
 * Usage: Copy this pattern to any protected route in your app
 */

"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { redirectManager } from "@/lib/auth-utils"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

export default function ProtectedPageExample() {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            // User is not logged in - redirect to login with return URL
            const currentPath = window.location.pathname + window.location.search
            const loginUrl = redirectManager.buildLoginUrl(currentPath)
            router.push(loginUrl)
        }
    }, [user, loading, router])

    // Show loading while checking auth status
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    // Don't render content until user is authenticated
    if (!user) {
        return null
    }

    // User is authenticated - render protected content
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Protected Page</h1>
            <p>This content is only visible to authenticated users.</p>
            <p className="mt-4 text-sm text-muted-foreground">
                If you clicked a "Join Team" link while logged out, you were sent to login
                and automatically brought back here after signing in.
            </p>
        </div>
    )
}
