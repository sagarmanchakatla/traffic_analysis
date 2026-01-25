'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Terminal, AlertCircle, CheckCircle2, Info, ArrowRight } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'transition';
  details?: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  maxHeight?: string;
}

export function LogPanel({ logs, maxHeight = '300px' }: LogPanelProps) {
  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'transition':
        return <ArrowRight className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Info className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-500/5';
      case 'warning':
        return 'border-l-amber-500 bg-amber-500/5';
      case 'error':
        return 'border-l-red-500 bg-red-500/5';
      case 'transition':
        return 'border-l-blue-500 bg-blue-500/5';
      default:
        return 'border-l-muted-foreground bg-muted/30';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="w-4 h-4" />
          Activity Log
          <Badge variant="secondary" className="ml-auto text-xs">
            {logs.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="rounded-lg border border-border bg-muted/20" style={{ height: maxHeight }}>
          <div className="p-2 space-y-1">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No activity yet. Upload images and start the simulation.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 p-2 rounded border-l-2 ${getTypeColor(log.type)}`}
                >
                  <div className="mt-0.5">{getIcon(log.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
