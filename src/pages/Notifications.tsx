import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, Check, X, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Notification {
  id: string;
  voucher_id: string;
  from_company_id: string;
  to_user_email: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'reviewed' | 'hold' | 'ignored';
  created_at: string;
  voucher: {
    voucher_number: string;
    voucher_date: string;
    voucher_type: string;
    total_amount: number;
  };
}

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voucher_notifications',
          filter: `to_user_email=eq.${user?.email}`,
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_notifications')
        .select(`
          *,
          voucher:vouchers (
            voucher_number,
            voucher_date,
            voucher_type,
            total_amount
          )
        `)
        .eq('to_user_email', user?.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch notifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (notificationId: string, action: 'accepted' | 'rejected' | 'reviewed' | 'hold' | 'ignored') => {
    try {
      const notes = reviewNotes[notificationId] || '';
      
      const { error } = await supabase
        .from('voucher_notifications')
        .update({
          status: action,
          responded_at: new Date().toISOString(),
          reviewer_notes: notes,
        })
        .eq('id', notificationId);

      if (error) throw error;

      toast.success(`Voucher ${action}`);
      fetchNotifications();
      setReviewNotes(prev => ({ ...prev, [notificationId]: '' }));
    } catch (error: any) {
      toast.error(`Failed to ${action} voucher`);
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'default',
      accepted: 'default',
      rejected: 'destructive',
      reviewed: 'secondary',
      hold: 'outline',
      ignored: 'secondary',
    };

    const icons: Record<string, JSX.Element> = {
      pending: <Clock className="h-3 w-3" />,
      accepted: <Check className="h-3 w-3" />,
      rejected: <X className="h-3 w-3" />,
      reviewed: <Bell className="h-3 w-3" />,
      hold: <Clock className="h-3 w-3" />,
      ignored: <X className="h-3 w-3" />,
    };

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {icons[status]}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const pendingNotifications = notifications.filter(n => n.status === 'pending');
  const respondedNotifications = notifications.filter(n => n.status !== 'pending');

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">Manage incoming voucher notifications</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="responded">
            Responded ({respondedNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending notifications</p>
              </CardContent>
            </Card>
          ) : (
            pendingNotifications.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {notification.voucher.voucher_type.toUpperCase()} - {notification.voucher.voucher_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Amount: ₹{notification.voucher.total_amount.toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(notification.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Message:</p>
                    <p className="text-sm">{notification.message}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Notes (optional)
                    </label>
                    <Textarea
                      placeholder="Add notes before responding..."
                      value={reviewNotes[notification.id] || ''}
                      onChange={(e) => setReviewNotes(prev => ({
                        ...prev,
                        [notification.id]: e.target.value
                      }))}
                      className="mb-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleAction(notification.id, 'accepted')}
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleAction(notification.id, 'hold')}
                      variant="outline"
                      className="w-full"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Hold
                    </Button>
                    <Button
                      onClick={() => handleAction(notification.id, 'reviewed')}
                      variant="secondary"
                      className="w-full"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                    <Button
                      onClick={() => handleAction(notification.id, 'ignored')}
                      variant="ghost"
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Ignore
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Received: {new Date(notification.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="responded" className="space-y-4 mt-4">
          {respondedNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No responded notifications</p>
              </CardContent>
            </Card>
          ) : (
            respondedNotifications.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {notification.voucher.voucher_type.toUpperCase()} - {notification.voucher.voucher_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Amount: ₹{notification.voucher.total_amount.toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(notification.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Responded: {new Date(notification.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
