import type { ReactNode } from 'react';
import { appMetadata } from '@/lib/appMetadata';

// Chrome-free: this page is embedded by the web terminal and the mobile
// app's WebView, so it must render nothing but the chart.
export async function generateMetadata() {
  return appMetadata('Chart');
}

export default function ChartLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
