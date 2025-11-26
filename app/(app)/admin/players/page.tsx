"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { User } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  MoreHorizontal,
  Plus,
  Search,
  Trash,
  UserCog,
  Shield,
  ShieldAlert,
  Loader2,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["admin", "player"]),
  hand: z.enum(["Right", "Left"]).optional(),
  skillLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Pro"]).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  position: z.enum(["Left", "Right", "Both"]).optional(),
})

export default function AdminPlayersPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [players, setPlayers] = useState<User[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)

  // Form for adding/editing players
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "player",
    },
  })

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/events")
    }
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    if (!isAdmin) return

    const q = query(collection(db, "users"), orderBy("fullName", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const playersData: User[] = []
      snapshot.forEach((doc) => {
        playersData.push({ uid: doc.id, ...doc.data() } as User)
      })
      setPlayers(playersData)
      setFilteredPlayers(playersData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [isAdmin])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPlayers(players)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredPlayers(
        players.filter(
          (p) =>
            p.fullName?.toLowerCase().includes(query) ||
            p.email?.toLowerCase().includes(query) ||
            p.phone?.includes(query),
        ),
      )
    }
  }, [searchQuery, players])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (selectedPlayer) {
        // Edit existing player
        await updateDoc(doc(db, "users", selectedPlayer.uid), {
          ...values,
          updatedAt: serverTimestamp(),
        })
        toast({
          title: "Player updated",
          description: "Player profile has been successfully updated.",
        })
        setIsEditDialogOpen(false)
      } else {
        // Create new shadow player
        // We use the email as the ID or generate a new one. 
        // Using a generated ID is safer for shadow accounts to avoid collision if they sign up later with same email but different UID (though we handle merge later).
        // Actually, for shadow accounts, we should probably generate a random ID.
        const newPlayerRef = doc(collection(db, "users"))
        await setDoc(newPlayerRef, {
          uid: newPlayerRef.id,
          ...values,
          isShadow: true,
          registrationStatus: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: "admin",
        })
        toast({
          title: "Player added",
          description: "Shadow player account created successfully.",
        })
        setIsAddDialogOpen(false)
      }
      form.reset()
      setSelectedPlayer(null)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to save player. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (player: User) => {
    if (!confirm("Are you sure you want to delete this player? This action cannot be undone.")) return

    try {
      // Step 1: Delete Firestore Document (Allowed by Rules)
      await deleteDoc(doc(db, "users", player.uid))

      // Step 2: Check for Self-Delete (Auth)
      const { currentUser } = await import("firebase/auth").then((module) => ({ currentUser: module.getAuth().currentUser }))

      if (currentUser && currentUser.uid === player.uid) {
        // Self-delete: Delete Auth User
        await currentUser.delete()
        toast({
          title: "Account deleted",
          description: "Your account has been permanently deleted.",
        })
        router.push("/login")
      } else {
        // Admin deleting another user: Only Firestore doc is deleted
        toast({
          title: "Profile deleted",
          description: "Profile deleted. Login credentials remain active until Cloud Functions are deployed.",
        })
      }
    } catch (error) {
      console.error("Error deleting player:", error)
      toast({
        title: "Error",
        description: "Failed to delete player. Check console for details.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (player: User) => {
    setSelectedPlayer(player)
    form.reset({
      fullName: player.fullName,
      email: player.email,
      phone: player.phone || "",
      role: player.role,
      hand: player.hand || undefined,
      skillLevel: player.skillLevel || undefined,
      gender: player.gender || undefined,
      position: player.position || undefined,
    })
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    setSelectedPlayer(null)
    form.reset({
      fullName: "",
      email: "",
      phone: "",
      role: "player",
    })
    setIsAddDialogOpen(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Player Management</h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, and shadow accounts.</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Player
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No players found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPlayers.map((player) => (
                <TableRow key={player.uid}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={player.photoUrl || ""} />
                        <AvatarFallback>{getInitials(player.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{player.fullName}</span>
                        <span className="text-xs text-muted-foreground">{player.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={player.role === "admin" ? "default" : "secondary"}>
                      {player.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">Level: {player.skillLevel || "N/A"}</span>
                      <span className="text-muted-foreground">Hand: {player.hand || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {player.isShadow ? (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                        Shadow
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        Verified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(player)}>
                          <UserCog className="mr-2 h-4 w-4" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(player)}
                        >
                          <Trash className="mr-2 h-4 w-4" /> Delete Player
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false)
          setIsEditDialogOpen(false)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? "Edit Player" : "Add New Player"}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? "Update player profile information."
                : "Create a shadow account for a player. They can claim this later."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+971..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="player">Player</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="skillLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hand</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Right">Right</SelectItem>
                          <SelectItem value="Left">Left</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditDialogOpen ? "Save Changes" : "Create Player"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
