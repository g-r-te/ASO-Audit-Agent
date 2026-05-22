import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASO Audit Agent',
  description: 'App Store Optimization audit powered by Mastra',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
