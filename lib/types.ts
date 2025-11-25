import type { Timestamp } from "firebase/firestore"

// User / Player types
export interface User {
  uid: string
  email: string
  fullName: string
  nickname?: string | null
  phone?: string | null
  photoUrl?: string | null
  dateOfBirth?: Timestamp | null
  gender?: "Male" | "Female" | null
  hand?: "Left" | "Right" | null
  position?: "Left" | "Right" | "Both" | null
  skillLevel?: "Beginner" | "Intermediate" | "Advanced" | "Pro" | null
  location?: string | null
  notes?: string | null
  role: "player" | "admin"
  registrationStatus: "active" | "inactive" | "suspended"
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
}

// Club types
export interface Club {
  id: string
  name: string
  location: {
    address: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  phone?: string | null
  pictureUrl?: string | null
  notes?: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Event types
export interface Event {
  eventId: string
  eventName: string
  adminId: string
  dateTime: Timestamp
  duration: string
  locationName: string
  logoUrl?: string | null
  isPublic: boolean
  isTeamRegistration: boolean
  unitType: "Players" | "Teams"
  slotsAvailable: number
  pricePerPlayer: number
  status: "Upcoming" | "Active" | "Past" | "Cancelled"
  termsAndConditions?: string | null
  cancellationMessage?: string | null
  aiSummary?: string | null
  createdAt: Timestamp
}

// Registration types
export type RegistrationStatus = "CONFIRMED" | "WAITLIST" | "WITHDRAWN"
export type PartnerStatus = "PENDING" | "CONFIRMED" | "DENIED" | "NONE"

export interface Registration {
  registrationId: string
  eventId: string
  playerId: string
  isPrimary: boolean
  status: RegistrationStatus
  partnerStatus?: PartnerStatus
  player2Id?: string | null
  teamId?: string | null
  waitlistPosition?: number | null
  registeredAt: Timestamp
  confirmedAt?: Timestamp | null
}

// Team types
export interface Team {
  teamId: string
  eventId: string
  player1Id: string
  player2Id: string
  player1Confirmed: boolean
  player2Confirmed: boolean
  createdAt: Timestamp
}

// Notification types
export interface Notification {
  id: string
  userId: string
  type:
    | "partner_invite"
    | "partner_accepted"
    | "partner_denied"
    | "waitlist_promotion"
    | "event_cancelled"
    | "team_cancelled"
  title: string
  message: string
  eventId?: string
  fromUserId?: string
  read: boolean
  createdAt: Timestamp
}
