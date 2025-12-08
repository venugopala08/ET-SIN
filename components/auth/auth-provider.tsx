"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: number // Use number for the database ID
  email: string
  name: string
  role: "user" | "admin"
  rrno?: string // Added rrno
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, role: "user" | "admin") => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string, role: "user" | "admin"): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("user_data", JSON.stringify(data.user))
        setUser(data.user)
        setLoading(false);
        return true
      }
      setLoading(false);
      return false
    } catch (error) {
      console.error("Login error:", error)
      setLoading(false);
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("user_data")
    setUser(null)
    router.push("/auth")
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}