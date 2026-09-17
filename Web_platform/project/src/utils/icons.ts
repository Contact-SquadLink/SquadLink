import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function getCategoryIcon(name: string): LucideIcon {
  const iconLib = Icons as unknown as Record<string, LucideIcon>;
  return iconLib[name] || Icons.Tag;
}
