import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import Chatbot from '../components/Chatbot';
import CookieConsent from '../components/CookieConsent';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });

export const metadata = {
  title: 'Medicaps University — Admissions Portal',
  description: 'Apply, track, and manage your application to Medicaps University.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        {children}
        <CookieConsent />
        <Chatbot />
      </body>
    </html>
  );
}