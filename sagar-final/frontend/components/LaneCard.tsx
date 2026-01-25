'use client';

import React, { useRef } from 'react';
import { TrafficLight } from './TrafficLight';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Bike, Bus, Truck, Upload, ImageIcon } from 'lucide-react';

interface LaneCardProps {
  laneId: string;
  lightState: 'green' | 'yellow' | 'red';
  leftState?: 'green' | 'yellow' | 'red';
  rightState?: 'green' | 'yellow' | 'red';
  secondsRemaining?: number;
  vehicleCounts?: { [key: string]: number };
  annotatedImage?: string;
  priority?: number;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  isActive?: boolean;
  config: { hasLeft: boolean; hasRight: boolean };
  onConfigChange: (config: { hasLeft: boolean; hasRight: boolean }) => void;
}

export function LaneCard({
  laneId,
  lightState,
  leftState,
  rightState,
  secondsRemaining,
  vehicleCounts,
  annotatedImage,
  priority,
  selectedFile,
  onFileSelect,
  isActive = false,
  config,
  onConfigChange,
}: LaneCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const totalVehicles = vehicleCounts 
    ? Object.values(vehicleCounts).reduce((a, b) => a + b, 0) 
    : 0;

  const formatLaneName = (id: string) => {
    return id.replace('lane', 'Lane ');
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${
      isActive 
        ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' 
        : 'hover:shadow-md'
    }`}>
      {/* Priority Badge */}
      {priority !== undefined && (
        <Badge 
          className={`absolute top-3 right-3 z-10 ${
            priority === 1 
              ? 'bg-amber-500 text-amber-950' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          #{priority} Priority
        </Badge>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-bold">{formatLaneName(laneId)}</span>
          {isActive && (
            <Badge variant="default" className="bg-green-600 text-white animate-pulse">
              ACTIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image Section with Traffic Light Overlay */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {annotatedImage ? (
            <img 
              src={`data:image/jpeg;base64,${annotatedImage}`} 
              alt={`${laneId} analysis`} 
              className="w-full h-full object-cover"
            />
          ) : selectedFile ? (
            <img 
              src={URL.createObjectURL(selectedFile) || "/placeholder.svg"} 
              alt={`${laneId} preview`} 
              className="w-full h-full object-cover opacity-70"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-sm">No image uploaded</span>
            </div>
          )}

          {/* Traffic Light Overlay */}
          <div className="absolute bottom-2 right-2">
            <TrafficLight 
              state={lightState} 
              leftState={leftState}
              rightState={rightState}
              size="sm" 
            />
          </div>

          {/* Timer Overlay */}
          {isActive && secondsRemaining !== undefined && (
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <span className="font-mono text-2xl font-bold text-foreground">
                {secondsRemaining}
              </span>
              <span className="text-muted-foreground text-sm ml-1">sec</span>
            </div>
          )}
        </div>

        {/* Config Section */}
        <div className="flex gap-4 p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id={`left-${laneId}`} 
              checked={config.hasLeft}
              onChange={(e) => onConfigChange({ ...config, hasLeft: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={`left-${laneId}`} className="text-xs cursor-pointer font-medium">Left Turn</label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id={`right-${laneId}`} 
              checked={config.hasRight}
              onChange={(e) => onConfigChange({ ...config, hasRight: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={`right-${laneId}`} className="text-xs cursor-pointer font-medium">Right Turn</label>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 bg-transparent"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {selectedFile ? 'Change Image' : 'Upload Image'}
          </Button>
          {selectedFile && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={selectedFile.name}>
              {selectedFile.name}
            </span>
          )}
        </div>

        {/* Vehicle Counts */}
        {vehicleCounts && (
          <div className="grid grid-cols-4 gap-2">
            <VehicleStat icon={Car} label="Cars" count={vehicleCounts['car'] || 0} color="text-blue-500" />
            <VehicleStat icon={Bike} label="Bikes" count={vehicleCounts['motorcycle'] || 0} color="text-amber-500" />
            <VehicleStat icon={Bus} label="Buses" count={vehicleCounts['bus'] || 0} color="text-green-500" />
            <VehicleStat icon={Truck} label="Trucks" count={vehicleCounts['truck'] || 0} color="text-orange-500" />
          </div>
        )}

        {/* Total Count */}
        {vehicleCounts && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Total Vehicles</span>
            <span className="font-bold text-lg">{totalVehicles}</span>
          </div>
        )}

        {/* Pending indicator */}
        {selectedFile && !annotatedImage && (
          <div className="text-center text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
            New image ready for next cycle
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VehicleStat({ 
  icon: Icon, 
  label, 
  count, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  count: number; 
  color: string;
}) {
  return (
    <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <span className="font-bold text-sm">{count}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
