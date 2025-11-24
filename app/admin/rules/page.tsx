"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Settings, Save, Sliders, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

interface RuleConfig {
  spike_multiplier: number
  voltage_min: number
  voltage_max: number
  power_factor_min: number
  enabled: boolean
}

export default function RulesPage() {
  const { toast } = useToast()
  
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>({
    spike_multiplier: 2.0,
    voltage_min: 200,
    voltage_max: 250,
    power_factor_min: 0.7,
    enabled: true,
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchRules() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/rules');
        if (!response.ok) {
          throw new Error('Failed to fetch rules');
        }
        const data = await response.json();
        
        setRuleConfig({
          spike_multiplier: parseFloat(data.spike_multiplier),
          voltage_min: parseFloat(data.voltage_min),
          voltage_max: parseFloat(data.voltage_max),
          power_factor_min: parseFloat(data.power_factor_min),
          enabled: data.enabled,
        });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchRules();
  }, [toast]);

  const handleRuleUpdate = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to save rules');
      }

      toast({
        title: "Rules updated",
        description: "Detection rules have been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update detection rules.",
        variant: "destructive",
      })
    } finally {
      setSaving(false);
    }
  }

  const handleSliderChange = (key: keyof RuleConfig, value: number[]) => {
    setRuleConfig((prev) => ({ ...prev, [key]: value[0] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rule Engine Configuration</h1>
        <p className="text-muted-foreground">Configure detection rules and thresholds for anomaly detection</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Rule Engine Configuration
          </CardTitle>
          <CardDescription>Configure detection rules and thresholds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Rule-Based Detection</Label>
                  <p className="text-sm text-muted-foreground">Use rule-based anomaly detection alongside ML</p>
                </div>
                <Switch
                  checked={ruleConfig.enabled}
                  onCheckedChange={(checked) => setRuleConfig((prev) => ({ ...prev, enabled: checked }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Consumption Spike Multiplier: {ruleConfig.spike_multiplier.toFixed(1)}x</Label>
                  <Slider
                    value={[ruleConfig.spike_multiplier]}
                    onValueChange={(val) => handleSliderChange("spike_multiplier", val)}
                    max={5}
                    min={1.5}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Flag consumption above {ruleConfig.spike_multiplier.toFixed(1)}x rolling average
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Minimum Voltage: {ruleConfig.voltage_min}V</Label>
                    <Slider
                      value={[ruleConfig.voltage_min]}
                      onValueChange={(val) => handleSliderChange("voltage_min", val)}
                      max={220}
                      min={180}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Voltage: {ruleConfig.voltage_max}V</Label>
                    <Slider
                      value={[ruleConfig.voltage_max]}
                      onValueChange={(val) => handleSliderChange("voltage_max", val)}
                      max={280}
                      min={240}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Minimum Power Factor: {ruleConfig.power_factor_min.toFixed(2)}</Label>
                  <Slider
                    value={[ruleConfig.power_factor_min]}
                    onValueChange={(val) => handleSliderChange("power_factor_min", val)}
                    max={0.95}
                    min={0.5}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Flag power factor below {ruleConfig.power_factor_min.toFixed(2)}
                  </p>
                </div>
              </div>

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Rule changes will affect future anomaly detection.
                </AlertDescription>
              </Alert>

              <Button onClick={handleRuleUpdate} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Rule Configuration
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}