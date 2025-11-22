import { ReactNode, useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;

    const fetchNotificationCount = async () => {
      const { count } = await supabase
        .from('voucher_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_email', user.email)
        .eq('status', 'pending');
      
      setNotificationCount(count || 0);
    };

    fetchNotificationCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notification-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voucher_notifications',
          filter: `to_user_email=eq.${user.email}`,
        },
        () => fetchNotificationCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-2 sm:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-base sm:text-lg font-semibold text-foreground hidden sm:block">ERP System</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
              <div className="text-xs sm:text-sm text-muted-foreground hidden md:block max-w-[150px] truncate">
                {user?.email}
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 sm:h-10 sm:w-10">
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
