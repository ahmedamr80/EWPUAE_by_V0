"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/lib/auth-context"
import { getFirebaseErrorMessage, rememberMeStorage, redirectManager } from "@/lib/auth-utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Mail, Lock, Eye, EyeOff, Apple } from "lucide-react"
import { FirebaseError } from "firebase/app"

// Zod validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAppleLoading, setIsAppleLoading] = useState(false)

  const { signIn, signInWithGoogle, signInWithApple } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const returnUrl = redirectManager.getReturnUrl(searchParams)

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Load saved email if exists
  useEffect(() => {
    const savedEmail = rememberMeStorage.get()
    if (savedEmail) {
      setValue("email", savedEmail)
      setRememberMe(true)
    }
  }, [setValue])

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data.email, data.password)

      // Handle remember me
      if (rememberMe) {
        rememberMeStorage.save(data.email)
      } else {
        rememberMeStorage.clear()
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      })

      router.push(returnUrl)
    } catch (error) {
      const errorCode = (error as FirebaseError).code || "unknown"
      const errorMessage = getFirebaseErrorMessage(errorCode)

      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: errorMessage,
      })
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)

    const result = await signInWithGoogle()

    if (result.success) {
      toast({
        title: "Welcome!",
        description: "You've successfully signed in with Google.",
      })
      router.push(returnUrl)
    } else {
      toast({
        variant: "destructive",
        title: "Google sign-in failed",
        description: result.error || "Failed to sign in with Google",
      })
    }

    setIsGoogleLoading(false)
  }

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true)

    const result = await signInWithApple()

    if (result.success) {
      toast({
        title: "Welcome!",
        description: "You've successfully signed in with Apple.",
      })
      router.push(returnUrl)
    } else {
      toast({
        variant: "destructive",
        title: "Apple sign-in failed",
        description: result.error || "Failed to sign in with Apple",
      })
    }

    setIsAppleLoading(false)
  }

  const isAnyLoading = isSubmitting || isGoogleLoading || isAppleLoading

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Sign in to your EveryWherePadel account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Social Sign-In First */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-transparent"
            onClick={handleGoogleSignIn}
            disabled={isAnyLoading}
          >
            {isGoogleLoading ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-transparent"
            onClick={handleAppleSignIn}
            disabled={isAnyLoading}
          >
            {isAppleLoading ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <Apple className="mr-2 h-4 w-4" />
            )}
            Continue with Apple
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                disabled={isAnyLoading}
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                disabled={isAnyLoading}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isAnyLoading}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
