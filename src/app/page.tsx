import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return <AppShell user={user} />;
}
