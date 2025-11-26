/**
 * Event Visibility Migration Utility
 *
 * Migrates legacy events (without isPublic field) to have isPublic: true
 * and ensures the dateTime field is stored as a Firestore Timestamp.
 * This guarantees existing events remain visible after adding the visibility filter.
 */

import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { handleAsync, type ApiResponse } from "./error-utils";

export interface MigrationResult {
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    errors: string[];
}

/**
 * Migrate all events that are missing the `isPublic` flag or have a `dateTime`
 * stored as a string. The function sets `isPublic: true` and converts the
 * string to a Firestore Timestamp.
 */
export async function migrateEventsToPublic(): Promise<ApiResponse<MigrationResult>> {
    return handleAsync(async () => {
        console.log("[Migration] Starting event visibility and dateTime migration...");

        const result: MigrationResult = {
            totalProcessed: 0,
            successCount: 0,
            failedCount: 0,
            errors: [],
        };

        const eventsRef = collection(db, "events");
        const snapshot = await getDocs(eventsRef);

        // Identify events needing migration
        const eventsToMigrate = snapshot.docs.filter((docSnap) => {
            const data = docSnap.data();
            const needsPublic = data.isPublic === undefined || data.isPublic === null;
            const needsDateTime = typeof data.dateTime === "string";
            return needsPublic || needsDateTime;
        });

        result.totalProcessed = eventsToMigrate.length;
        if (eventsToMigrate.length === 0) {
            console.log("[Migration] No events require migration");
            return result;
        }

        console.log(`[Migration] Found ${eventsToMigrate.length} events to migrate`);

        const batchSize = 500;
        let batch = writeBatch(db);
        let ops = 0;

        for (let i = 0; i < eventsToMigrate.length; i++) {
            const docSnap = eventsToMigrate[i];
            const data = docSnap.data();
            const updates: any = {};

            // Ensure isPublic flag
            if (data.isPublic === undefined || data.isPublic === null) {
                updates.isPublic = true;
            }

            // Convert dateTime if stored as string
            if (typeof data.dateTime === "string") {
                const parsed = new Date(data.dateTime);
                if (!isNaN(parsed.getTime())) {
                    updates.dateTime = Timestamp.fromDate(parsed);
                } else {
                    result.failedCount++;
                    result.errors.push(`Invalid dateTime string for event ${docSnap.id}`);
                    continue; // skip this document
                }
            }

            if (Object.keys(updates).length > 0) {
                batch.update(doc(db, "events", docSnap.id), updates);
                ops++;
                result.successCount++;
            }

            // Commit batch when limit reached or at the end
            if (ops === batchSize || i === eventsToMigrate.length - 1) {
                await batch.commit();
                console.log(`[Migration] Committed batch of ${ops} updates`);
                if (i < eventsToMigrate.length - 1) {
                    batch = writeBatch(db);
                    ops = 0;
                }
            }
        }

        console.log(`[Migration] Completed. Success: ${result.successCount}, Failed: ${result.failedCount}`);
        return result;
    }, "Failed to migrate events");
}

/**
 * Get count of events that need migration (missing isPublic or dateTime string).
 */
export async function getEventsMigrationCount(): Promise<ApiResponse<number>> {
    return handleAsync(async () => {
        const eventsRef = collection(db, "events");
        const snapshot = await getDocs(eventsRef);
        const count = snapshot.docs.filter((docSnap) => {
            const data = docSnap.data();
            const needsPublic = data.isPublic === undefined || data.isPublic === null;
            const needsDateTime = typeof data.dateTime === "string";
            return needsPublic || needsDateTime;
        }).length;
        return count;
    }, "Failed to get migration count");
}

/**
 * Verify that all events have the `isPublic` flag and a proper Timestamp for `dateTime`.
 */
export async function verifyEventsMigration(): Promise<ApiResponse<{ allMigrated: boolean; remaining: number }>> {
    return handleAsync(async () => {
        const eventsRef = collection(db, "events");
        const snapshot = await getDocs(eventsRef);
        const remaining = snapshot.docs.filter((docSnap) => {
            const data = docSnap.data();
            const needsPublic = data.isPublic === undefined || data.isPublic === null;
            const needsDateTime = typeof data.dateTime === "string";
            return needsPublic || needsDateTime;
        }).length;
        return { allMigrated: remaining === 0, remaining };
    }, "Failed to verify migration");
}
