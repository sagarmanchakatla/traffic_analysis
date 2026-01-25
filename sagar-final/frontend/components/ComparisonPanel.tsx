'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Timer, Car, TrendingUp } from 'lucide-react';
import type { CycleResponse } from '@/lib/api';

interface ComparisonPanelProps {
  timings: CycleResponse | null;
  activeLane: string | null;
}

export function ComparisonPanel({ timings, activeLane }: ComparisonPanelProps) {
  if (!timings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4" />
            Lane Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            Start simulation to see lane comparisons
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total vehicles per lane for comparison
  const laneStats = timings.priority.map((lane, index) => {
    const counts = timings.vehicleCounts[lane] || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const timing = timings.timings[lane];
    const greenTime = timing?.green || 0;
    
    return {
      lane,
      priority: index + 1,
      totalVehicles: total,
      greenTime,
      counts,
    };
  });

  const maxVehicles = Math.max(...laneStats.map(s => s.totalVehicles), 1);
  const maxGreenTime = Math.max(...laneStats.map(s => s.greenTime), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-4 h-4" />
          Lane Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            icon={Timer} 
            label="Total Cycle" 
            value={`${timings.totalTime}s`} 
          />
          <StatCard 
            icon={Car} 
            label="Total Vehicles" 
            value={laneStats.reduce((a, b) => a + b.totalVehicles, 0).toString()} 
          />
          <StatCard 
            icon={TrendingUp} 
            label="Priority Lane" 
            value={timings.priority[0].replace('lane', 'L')} 
          />
        </div>

        {/* Lane Comparisons */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Traffic Density</h4>
          {laneStats.map((stat) => (
            <div 
              key={stat.lane} 
              className={`p-3 rounded-lg border transition-colors ${
                stat.lane === activeLane 
                  ? 'border-green-500 bg-green-500/5' 
                  : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{stat.lane.replace('lane', 'Lane ')}</span>
                  <Badge 
                    variant={stat.priority === 1 ? 'default' : 'secondary'} 
                    className={stat.priority === 1 ? 'bg-amber-500 text-amber-950' : ''}
                  >
                    #{stat.priority}
                  </Badge>
                  {stat.lane === activeLane && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Active
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {stat.totalVehicles} vehicles
                </span>
              </div>
              <Progress 
                value={(stat.totalVehicles / maxVehicles) * 100} 
                className="h-2"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Green: {stat.greenTime}s</span>
                <span className="flex gap-2">
                  <span>Cars: {stat.counts['car'] || 0}</span>
                  <span>Bikes: {stat.counts['motorcycle'] || 0}</span>
                  <span>Buses: {stat.counts['bus'] || 0}</span>
                  <span>Trucks: {stat.counts['truck'] || 0}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Timing Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Green Time Allocation</h4>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {laneStats.map((stat, index) => {
              const percentage = (stat.greenTime / timings.totalTime) * 100;
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-amber-500',
                'bg-purple-500',
              ];
              return (
                <div
                  key={stat.lane}
                  className={`${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-medium transition-all ${
                    stat.lane === activeLane ? 'ring-2 ring-white ring-offset-1' : ''
                  }`}
                  style={{ width: `${percentage}%` }}
                  title={`${stat.lane}: ${stat.greenTime}s (${percentage.toFixed(1)}%)`}
                >
                  {percentage > 15 && `${stat.greenTime}s`}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {laneStats.map((stat, index) => {
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-amber-500',
                'bg-purple-500',
              ];
              return (
                <div key={stat.lane} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`} />
                  <span className="capitalize">{stat.lane.replace('lane', 'L')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
      <div className="font-bold text-lg">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
