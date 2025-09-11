import { useState, useEffect } from 'react';
import type { MapSettings } from '@/types/map';

const SETTINGS_STORAGE_KEY = 'paper-map-generator-settings';

const defaultSettings: MapSettings = {
  gridStyle: 'square',
  unitOfMeasurement: 'imperial',
  paperSize: 'a4',
  gridOverlay: false,
  backgroundColor: '#ffffff',
  averageBackgroundColor: false,
  gridMarkerColor: '#ffffff',
  guideColor: '#ffffff',
  generateBacksideNumbers: true,
  outlineStyle: 'dash',
  outlineThickness: 3,
  outlineColor: '#ffffff'
};

export function useSharedSettings() {
  const [settings, setSettings] = useState<MapSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        const mergedSettings = { ...defaultSettings, ...parsedSettings };
        setSettings(mergedSettings);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (newSettings: MapSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  };

  return {
    settings,
    updateSettings
  };
}