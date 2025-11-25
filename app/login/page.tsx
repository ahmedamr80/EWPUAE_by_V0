"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { Spinner } from "@/components/ui/spinner"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // If user is already logged in, redirect to dashboard
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <Image src="/logo.svg" alt="EveryWherePadel" width={80} height={96} className="mx-auto mb-4 h-24 w-auto" />
        <h1 className="text-4xl font-bold tracking-tight text-primary">EveryWherePadel</h1>
        <p className="mt-2 text-muted-foreground">Tournament Registration Platform</p>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {"Don't have an account? "}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}
