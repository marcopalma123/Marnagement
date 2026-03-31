import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'marnagement — Freelancer Time & Finance',
  description: 'A personal freelancer time and finance management assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
