// FILE: app/admin/geo/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Map, Flame, MapPin, Ticket, X, Send } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

// Define the type for our village data
interface VillageProperties {
  name: string;
  users: number;
  anomalies: number;
  theftPct: number;
}

export default function GeoPage() {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<"pins" | "heatmap">("pins")
  const [isLoaded, setIsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [geoData, setGeoData] = useState<any>(null)
  
  const { toast } = useToast()
  const [selectedVillage, setSelectedVillage] = useState<VillageProperties | null>(null)
  const [ticketNotes, setTicketNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/geo-data');
        if (!response.ok) {
          throw new Error('Failed to fetch geo data');
        }
        const data = await response.json();
        setGeoData(data);
      } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  // Initialize the map
  useEffect(() => {
    if (mapRef.current || !containerRef.current || !geoData) return;

    // --- THIS IS THE FIX ---
    // 1. Get the API key from your environment
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!apiKey) {
      console.error("MapTiler API key is missing. Please add NEXT_PUBLIC_MAPTILER_KEY to .env.local");
      toast({
        title: "Map Error",
        description: "MapTiler API key is missing. The map cannot be loaded.",
        variant: "destructive"
      });
      return;
    }

    // 2. Use the new, better-looking "streets-v2" style
    const mapStyle = `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;
    
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle, // <-- USE THE NEW STYLE
      center: [74.35, 14.72], // <-- This is already centered on Ankola
      zoom: 10,
    })
    mapRef.current = map
    // --- END OF FIX ---

    map.on("load", () => {
      setIsLoaded(true)
      map.addSource("villages", {
        type: "geojson",
        data: geoData,
      })

      map.addLayer({
        id: "villages-circle",
        type: "circle",
        source: "villages",
        layout: { visibility: mode === "pins" ? "visible" : "none" },
        paint: {
          "circle-radius": 10,
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "theftPct"],
            0, "#22c55e",
            0.1, "#eab308",
            0.2, "#ef4444",
          ],
          "circle-opacity": 0.8,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1,
        },
      })

      map.addLayer({
        id: "villages-heat",
        type: "heatmap",
        source: "villages",
        maxzoom: 15,
        layout: { visibility: mode === "heatmap" ? "visible" : "none" },
        paint: {
          "heatmap-weight": ["get", "theftPct"],
          "heatmap-intensity": 2,
          "heatmap-radius": 30,
        },
      })

      map.on("click", "villages-circle", (e) => {
        const f = e.features?.[0]
        if (!f) return
        setSelectedVillage(f.properties as VillageProperties)
        setTicketNotes("") 
      })

      map.getCanvas().style.cursor = "pointer"
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [geoData, toast]) // Added toast dependency

  // Layer toggle effect
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isLoaded) return
    try {
      if (map.getLayer("villages-circle")) {
        map.setLayoutProperty("villages-circle", "visibility", mode === "pins" ? "visible" : "none")
      }
      if (map.getLayer("villages-heat")) {
        map.setLayoutProperty("villages-heat", "visibility", mode === "heatmap" ? "visible" : "none")
      }
    } catch (e) {
      console.warn("Layer toggle skipped:", e)
    }
  }, [mode, isLoaded])

  // Function to create ticket
  const handleCreateTicket = async () => {
    if (!selectedVillage) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/investigation-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_name: selectedVillage.name,
          notes: ticketNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: "Ticket Already Pending",
            description: result.error,
          })
        } else {
          throw new Error(result.error || "Failed to create ticket");
        }
      } else {
        toast({
          title: "Ticket Created!",
          description: `Investigation ticket for ${selectedVillage.name} has been created.`,
        })
      }
      
      setSelectedVillage(null);
      setTicketNotes("");

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Geo View</h1>
          <p className="text-muted-foreground">Color-coded by anomaly percentage. Click markers for details.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === "pins" ? "default" : "outline"} onClick={() => setMode("pins")}>
            <MapPin className="h-4 w-4 mr-2" /> Pins
          </Button>
          <Button variant={mode ==="heatmap" ? "default" : "outline"} onClick={() => setMode("heatmap")}>
            <Flame className="h-4 w-4 mr-2" /> Heatmap
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Ankola & Nearby
          </CardTitle>
          <CardDescription>Live anomaly data from database</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <Skeleton className="w-full h-[520px] rounded-md" />
          )}
          <div 
            ref={containerRef} 
            className={cn(
              "w-full h-[520px] rounded-md overflow-hidden",
              loading && "hidden"
            )}
          />
        </CardContent>
      </Card>

      {/* Actionable Card */}
      {selectedVillage && (
        <Card className="border-2 border-primary">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Action Center: {selectedVillage.name}
              </CardTitle>
              <CardDescription>
                Review stats and create an investigation ticket.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedVillage(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold">{selectedVillage.anomalies}</div>
                <div className="text-sm text-muted-foreground">Anomalies</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold">{selectedVillage.users}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-red-500">
                  {(selectedVillage.theftPct * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Anomaly Rate</div>
              </div>
            </div>
            <div className="space-y-2">
              <Textarea 
                placeholder="Add optional notes for the investigation team..."
                value={ticketNotes}
                onChange={(e) => setTicketNotes(e.target.value)}
              />
              <Button 
                onClick={handleCreateTicket} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0.0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Create Investigation Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}