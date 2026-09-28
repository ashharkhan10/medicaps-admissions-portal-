import { redirect } from 'next/navigation';

// The home page sends visitors straight to Sign In
export default function Home() {
  redirect('/signin');
}