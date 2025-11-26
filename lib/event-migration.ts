/**
 * Event Visibility Migration Utility
 * 
 * Migrates legacy events (without isPublic field) to have isPublic: true
 * This ensures existing events remain visible after adding the visibility filter
 */

import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore"
import { db } from "./firebase"
import { handleAsync, type ApiResponse } from "./error-utils"

export interface MigrationResult {
    totalProcessed: number
    successCount: number
    failedCount: number
    errors: string[]
}

/**
 * Migrate all events without isPublic field to isPublic: true
 * 
 * This function:
 * 1. Finds all events where isPublic is undefined or null
 * 2. Updates them in batches to set isPublic: true
 * 3. Returns detailed migration results
 */
export async function migrateEventsToPublic(): Promise<ApiResponse<MigrationResult>> {
    return handleAsync(async () => {
        console.log("[Migration] Starting event visibility migration...")

        const result: MigrationResult = {
            totalProcessed: 0,
            successCount: 0,
            failedCount: 0,
            errors: [],
        }

        try {
            // Fetch all events
            const eventsRef = collection(db, "events")
            const allEventsSnapshot = await getDocs(eventsRef)

            // Filter events that don't have isPublic field
            const eventsToMigrate = allEventsSnapshot.docs.filter(
                (doc) => {
                    const data = doc.data()
                    return data.isPublic === undefined || data.isPublic === null
                }
            )

            result.totalProcessed = eventsToMigrate.length

            if (eventsToMigrate.length === 0) {
                console.log("[Migration] No events need migration")
                return result
            }

            console.log(`[Migration] Found ${eventsToMigrate.length} events to migrate`)

            // Firestore batches can handle up to 500 operations
            const batchSize = 500
            let batch = writeBatch(db)
            let operationCount = 0

            for (let i = 0; i < eventsToMigrate.length; i++) {
                const eventDoc = eventsToMigrate[i]

                try {
                    // Update event to set isPublic: true
                    batch.update(doc(db, "events", eventDoc.id), {
                        isPublic: true,
                    })

                    operationCount++
                    result.successCount++

                    // Commit batch when it reaches the limit or at the end
                    if (operationCount === batchSize || i === eventsToMigrate.length - 1) {
                        await batch.commit()
                        console.log(`[Migration] Committed batch of ${operationCount} updates`)

                        // Start new batch if there are more events
                        if (i < eventsToMigrate.length - 1) {
                            batch = writeBatch(db)
                            operationCount = 0
                        }
                    }
                } catch (error) {
                    result.failedCount++
                    const errorMsg = `Failed to update event ${eventDoc.id}: ${error}`
                    result.errors.push(errorMsg)
                    console.error(`[Migration] ${errorMsg}`)
                }
            }

            console.log(`[Migration] Complete. Success: ${result.successCount}, Failed: ${result.failedCount}`)
            return result
        } catch (error) {
            console.error("[Migration] Migration failed:", error)
            throw error
        }
    }, "Failed to migrate events")
}

/**
 * Get count of events that need migration
 */
export async function getEventsMigrationCount(): Promise<ApiResponse<number>> {
    return handleAsync(async () => {
        const eventsRef = collection(db, "events")
        const allEventsSnapshot = await getDocs(eventsRef)

        const count = allEventsSnapshot.docs.filter(
            (doc) => {
                const data = doc.data()
                return data.isPublic === undefined || data.isPublic === null
            }
        ).length

        return count
    }, "Failed to get migration count")
}

/**
 * Verify all events have isPublic field
 */
export async function verifyEventsMigration(): Promise<ApiResponse<{ allMigrated: boolean; remaining: number }>> {
    return handleAsync(async () => {
        const eventsRef = collection(db, "events")
        const allEventsSnapshot = await getDocs(eventsRef)

        const remaining = allEventsSnapshot.docs.filter(
            (doc) => {
                const data = doc.data()
                return data.isPublic === undefined || data.isPublic === null
            }
        ).length

        return {
            allMigrated: remaining === 0,
            remaining,
        }
    }, "Failed to verify migration")
}
