"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Club } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { MapPin, Phone, ExternalLink, Building2 } from "lucide-react"
import Image from "next/image"

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "clubs"), orderBy("name", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clubsData: Club[] = []
      snapshot.forEach((doc) => {
        clubsData.push({ id: doc.id, ...doc.data() } as Club)
      })
      setClubs(clubsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const openInMaps = (club: Club) => {
    const { lat, lng } = club.location.coordinates
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Clubs</h1>
        <p className="text-sm text-muted-foreground">Discover Padel venues in the UAE</p>
      </div>

      {clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No clubs found</h3>
          <p className="text-sm text-muted-foreground">Check back later for new venues</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {clubs.map((club) => (
            <Card key={club.id} className="overflow-hidden">
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={club.pictureUrl || `/placeholder.svg?height=200&width=400&query=padel club ${club.name}`}
                  alt={club.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-lg font-bold">{club.name}</h3>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{club.location.address}</span>
                  </div>
                  {club.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <a href={`tel:${club.phone}`} className="hover:text-foreground">
                        {club.phone}
                      </a>
                    </div>
                  )}
                </div>
                <Button variant="outline" className="mt-4 w-full bg-transparent" onClick={() => openInMaps(club)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Maps
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
