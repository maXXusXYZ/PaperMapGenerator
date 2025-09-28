import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MapProject, MapSettings } from "@/types/map";
import { Upload, RotateCcw } from "lucide-react";

interface SettingsPanelProps {
  project: MapProject | null;
  onSettingsUpdate: (settings: MapSettings) => void;
  onReplaceMap: () => void;
  onResetMap: () => void;
  batchMode?: boolean;
  settings?: MapSettings;
}

export default function SettingsPanel({ 
  project, 
  onSettingsUpdate, 
  onReplaceMap, 
  onResetMap,
  batchMode = false,
  settings: externalSettings
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<MapSettings>({
    gridStyle: 'square',
    unitOfMeasurement: 'imperial',
    paperSize: 'a4',
    gridOverlay: false,
    backgroundColor: '#ffffff',
    averageBackgroundColor: false,
    gridMarkerColor: '#000000',
    guideColor: '#000000',
    generateBacksideNumbers: true,
    outlineStyle: 'dash',
    outlineThickness: 3,
    outlineColor: '#000000',
  });

  const { toast } = useToast();

  useEffect(() => {
    if (batchMode && externalSettings) {
      setSettings(externalSettings);
    } else if (project) {
      setSettings(project.settings);
    } else if (externalSettings) {
      // Use external settings when no project (for shared settings on single-map page)
      setSettings(externalSettings);
    }
  }, [project, batchMode, externalSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: MapSettings) => {
      if (!project) throw new Error('No project selected');
      
      const response = await fetch(`/api/maps/${project.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      onSettingsUpdate(settings);
    },
    onError: (error) => {
      toast({
        title: "Settings update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: keyof MapSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Always call parent callback immediately for localStorage persistence
    onSettingsUpdate(newSettings);
    
    if (batchMode) {
      // In batch mode, we're done - parent handles localStorage
    } else if (project) {
      // Normal mode: also update via API for database persistence
      updateSettingsMutation.mutate(newSettings);
    }
  };

  const syncColorInputs = (colorKey: keyof MapSettings, colorValue: string, textInputId: string) => {
    const textInput = document.getElementById(textInputId) as HTMLInputElement;
    if (textInput) {
      textInput.value = colorValue.toUpperCase();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4" data-testid="text-settings-title">Settings</h2>
        
        {/* Style Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="grid-style" className="text-sm font-medium mb-2 block">
                Grid Style
              </Label>
              <Select 
                value={settings.gridStyle} 
                onValueChange={(value) => handleSettingChange('gridStyle', value)}
                data-testid="select-grid-style"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="hexagon">Hexagon</SelectItem>
                  <SelectItem value="isometric">Isometric</SelectItem>
                  <SelectItem value="universal">Universal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit-measurement" className="text-sm font-medium mb-2 block">
                Unit of Measurement
              </Label>
              <Select 
                value={settings.unitOfMeasurement} 
                onValueChange={(value) => handleSettingChange('unitOfMeasurement', value)}
                data-testid="select-unit-measurement"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Imperial</SelectItem>
                  <SelectItem value="metric">Metric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paper-size" className="text-sm font-medium mb-2 block">
                Paper Size
              </Label>
              <Select 
                value={settings.paperSize} 
                onValueChange={(value) => handleSettingChange('paperSize', value)}
                data-testid="select-paper-size"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                  <SelectItem value="a2">A2</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="tabloid">Tabloid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="grid-overlay" className="text-sm font-medium">
                Grid Overlay
              </Label>
              <Switch
                id="grid-overlay"
                checked={settings.gridOverlay}
                onCheckedChange={(checked) => handleSettingChange('gridOverlay', checked)}
                data-testid="switch-grid-overlay"
              />
            </div>
          </CardContent>
        </Card>

        {/* Background Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Background
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Background Color</Label>
              <div className="flex items-center space-x-3">
                <input 
                  type="color" 
                  value={settings.backgroundColor}
                  onChange={(e) => {
                    handleSettingChange('backgroundColor', e.target.value);
                    syncColorInputs('backgroundColor', e.target.value, 'bg-color-text');
                  }}
                  className="w-10 h-8 rounded border border-input cursor-pointer"
                  data-testid="input-background-color"
                />
                <Input 
                  id="bg-color-text"
                  type="text" 
                  value={settings.backgroundColor.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                    if (/^#[0-9A-F]{6}$/i.test(value)) {
                      handleSettingChange('backgroundColor', value);
                    }
                  }}
                  className="flex-1"
                  data-testid="input-background-color-text"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Average Background Color</Label>
              <Switch
                checked={settings.averageBackgroundColor}
                onCheckedChange={(checked) => handleSettingChange('averageBackgroundColor', checked)}
                data-testid="switch-average-background"
              />
            </div>
          </CardContent>
        </Card>

        {/* Guides Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Guides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Grid Marker Color</Label>
              <div className="flex items-center space-x-3">
                <input 
                  type="color" 
                  value={settings.gridMarkerColor}
                  onChange={(e) => {
                    handleSettingChange('gridMarkerColor', e.target.value);
                    syncColorInputs('gridMarkerColor', e.target.value, 'marker-color-text');
                  }}
                  className="w-10 h-8 rounded border border-input cursor-pointer"
                  data-testid="input-grid-marker-color"
                />
                <Input 
                  id="marker-color-text"
                  type="text" 
                  value={settings.gridMarkerColor.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                    if (/^#[0-9A-F]{6}$/i.test(value)) {
                      handleSettingChange('gridMarkerColor', value);
                    }
                  }}
                  className="flex-1"
                  data-testid="input-grid-marker-color-text"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Guide Color</Label>
              <div className="flex items-center space-x-3">
                <input 
                  type="color" 
                  value={settings.guideColor}
                  onChange={(e) => {
                    handleSettingChange('guideColor', e.target.value);
                    syncColorInputs('guideColor', e.target.value, 'guide-color-text');
                  }}
                  className="w-10 h-8 rounded border border-input cursor-pointer"
                  data-testid="input-guide-color"
                />
                <Input 
                  id="guide-color-text"
                  type="text" 
                  value={settings.guideColor.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                    if (/^#[0-9A-F]{6}$/i.test(value)) {
                      handleSettingChange('guideColor', value);
                    }
                  }}
                  className="flex-1"
                  data-testid="input-guide-color-text"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Generate Backside Numbers</Label>
              <Switch
                checked={settings.generateBacksideNumbers}
                onCheckedChange={(checked) => handleSettingChange('generateBacksideNumbers', checked)}
                data-testid="switch-backside-numbers"
              />
            </div>
          </CardContent>
        </Card>

        {/* Outline Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Outline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Outline Style</Label>
              <Select 
                value={settings.outlineStyle} 
                onValueChange={(value) => handleSettingChange('outlineStyle', value)}
                data-testid="select-outline-style"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dash">Dash</SelectItem>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Outline Thickness</Label>
              <Slider
                value={[settings.outlineThickness]}
                onValueChange={(value) => handleSettingChange('outlineThickness', value[0])}
                max={10}
                min={1}
                step={1}
                className="mb-2"
                data-testid="slider-outline-thickness"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Thin</span>
                <span>Thick</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Outline Color</Label>
              <div className="flex items-center space-x-3">
                <input 
                  type="color" 
                  value={settings.outlineColor}
                  onChange={(e) => {
                    handleSettingChange('outlineColor', e.target.value);
                    syncColorInputs('outlineColor', e.target.value, 'outline-color-text');
                  }}
                  className="w-10 h-8 rounded border border-input cursor-pointer"
                  data-testid="input-outline-color"
                />
                <Input 
                  id="outline-color-text"
                  type="text" 
                  value={settings.outlineColor.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                    if (/^#[0-9A-F]{6}$/i.test(value)) {
                      handleSettingChange('outlineColor', value);
                    }
                  }}
                  className="flex-1"
                  data-testid="input-outline-color-text"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Controls Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Map Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={onReplaceMap}
              data-testid="button-replace-map"
            >
              <Upload className="mr-2 h-4 w-4" />
              Replace Map
            </Button>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={onResetMap}
              disabled={!project}
              data-testid="button-reset-map"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Map
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
