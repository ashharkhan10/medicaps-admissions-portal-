'use client';

import { useRouter } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const navClass = "no-print flex justify-between items-center px-6 py-3 bg-white border-b border-[#1B2A4A]/10";
const dashBtn = "flex items-center gap-2 border border-[#1B2A4A]/25 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition px-4 py-2 rounded-lg text-sm font-medium";
const logoutBtn = "bg-[#1B2A4A] hover:bg-[#243758] transition text-white px-4 py-2 rounded-lg text-sm font-medium";

export default function FormNav() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/signin');
  }

  return (
    <nav className={navClass}>
      <a href="/signin"><img src="/logo.png" alt="Medicaps University" className="h-10 mix-blend-multiply" /></a>
      <div className="flex items-center gap-2">
        <a href="/dashboard" className={dashBtn}><LayoutDashboard size={15} /> <span className="hidden sm:inline">My Dashboard</span></a>
        <button onClick={handleLogout} className={logoutBtn}>Log Out</button>
      </div>
    </nav>
  );
}