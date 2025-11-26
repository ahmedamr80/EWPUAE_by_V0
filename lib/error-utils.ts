/**
 * Standardized Error Handling for EveryWherePadel
 * 
 * All API calls and server actions should return this format
 */

import { FirebaseError } from "firebase/app"
import { getFirebaseErrorMessage } from "./auth-utils"

/**
 * Standard API Response Format
 */
export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    message?: string
    error?: string
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data?: T, message?: string): ApiResponse<T> {
    return {
        success: true,
        data,
        message,
    }
}

/**
 * Create error response
 */
export function createErrorResponse(error: unknown, userMessage?: string): ApiResponse {
    // Log error to console (or send to Sentry in production)
    console.error("[API Error]:", error)

    let errorMessage = userMessage || "An unexpected error occurred. Please try again."

    // Handle Firebase errors
    if (error instanceof FirebaseError) {
        errorMessage = getFirebaseErrorMessage(error.code)
    }

    // Handle standard Error objects
    else if (error instanceof Error) {
        errorMessage = userMessage || error.message
    }

    // Handle string errors
    else if (typeof error === "string") {
        errorMessage = error
    }

    return {
        success: false,
        error: errorMessage,
        message: errorMessage,
    }
}

/**
 * Async wrapper that catches errors and returns standardized response
 * Usage: const result = await handleAsync(() => someAsyncFunction())
 */
export async function handleAsync<T>(
    fn: () => Promise<T>,
    userMessage?: string
): Promise<ApiResponse<T>> {
    try {
        const data = await fn()
        return createSuccessResponse(data)
    } catch (error) {
        return createErrorResponse(error, userMessage) as ApiResponse<T>
    }
}

/**
 * Validation errors
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ValidationError"
    }
}

/**
 * Permission errors
 */
export class PermissionError extends Error {
    constructor(message: string = "You don't have permission to perform this action") {
        super(message)
        this.name = "PermissionError"
    }
}

/**
 * Not found errors
 */
export class NotFoundError extends Error {
    constructor(resource: string = "Resource") {
        super(`${resource} not found`)
        this.name = "NotFoundError"
    }
}

/**
 * Conflict errors (e.g., already registered)
 */
export class ConflictError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ConflictError"
    }
}

/**
 * Validate required fields
 */
export function validateRequired(fields: Record<string, unknown>): void {
    const missing: string[] = []

    for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === "") {
            missing.push(key)
        }
    }

    if (missing.length > 0) {
        throw new ValidationError(`Missing required fields: ${missing.join(", ")}`)
    }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email address")
    }
}

/**
 * Validate phone format (UAE)
 */
export function validatePhone(phone: string): void {
    // UAE phone: +971-XX-XXX-XXXX or 05X-XXX-XXXX
    const phoneRegex = /^(\+971|971|0)?[5][0-9]{8}$/
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ""))) {
        throw new ValidationError("Invalid UAE phone number")
    }
}
