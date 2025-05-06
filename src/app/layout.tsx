import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseAuthProvider } from '@/hooks/use-auth'; // Import the provider

export const metadata: Metadata = {
  title: 'Kovia Connect',
  description: 'QR contact-capture app for live entertainers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} antialiased`}>
        <FirebaseAuthProvider> {/* Wrap children with the Auth Provider */}
          {children}
          <Toaster />
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
