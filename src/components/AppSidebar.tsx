import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Receipt,
  BookOpen,
  DollarSign,
  TrendingUp,
  Wrench,
  Settings,
  Building2,
  ChevronDown,
  Bell,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import solviserLogo from '@/assets/solviser-logo.png';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Notifications', url: '/notifications', icon: Bell },
  {
    title: 'Production',
    icon: Package,
    subItems: [
      { title: 'Dashboard', url: '/production/dashboard', icon: TrendingUp },
      { title: 'My Orders', url: '/production/orders', icon: Package },
      { title: 'Manage Orders', url: '/production/manage-orders', icon: FileText },
      { title: 'Machines', url: '/production/machines', icon: Wrench },
      { title: 'User Management', url: '/production/users', icon: Users },
    ],
  },
  {
    title: 'Masters',
    icon: Building2,
    subItems: [
      { title: 'Companies', url: '/companies', icon: Building2 },
      { title: 'Ledgers', url: '/ledgers', icon: Users },
      { title: 'Ledger Groups', url: '/masters/ledger-groups', icon: FileText },
      { title: 'Stock Groups', url: '/masters/stock-groups', icon: Package },
      { title: 'Stock Items', url: '/masters/stock-items', icon: Package },
      { title: 'Godowns', url: '/masters/godowns', icon: Building2 },
      { title: 'GST Rates', url: '/masters/gst-rates', icon: FileText },
      { title: 'Cost Centers', url: '/masters/cost-centers', icon: Settings },
    ],
  },
  {
    title: 'Vouchers',
    icon: FileText,
    subItems: [
      { title: 'Sales', url: '/vouchers/sales', icon: Receipt },
      { title: 'Purchase', url: '/vouchers/purchase', icon: Package },
      { title: 'Payment', url: '/vouchers/payment', icon: DollarSign },
      { title: 'Receipt', url: '/vouchers/receipt', icon: DollarSign },
      { title: 'Journal', url: '/vouchers/journal', icon: FileText },
      { title: 'Contra', url: '/vouchers/contra', icon: DollarSign },
    ],
  },
  {
    title: 'Reports',
    icon: TrendingUp,
    subItems: [
      { title: 'Day Book', url: '/reports/daybook', icon: FileText },
      { title: 'Ledger Report', url: '/reports/ledger', icon: Users },
      { title: 'Trial Balance', url: '/reports/trialbalance', icon: FileText },
      { title: 'Profit & Loss', url: '/reports/profitandloss', icon: TrendingUp },
      { title: 'Balance Sheet', url: '/reports/balancesheet', icon: FileText },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<string[]>(['Vouchers', 'Masters']);
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;
  
  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title]
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <img 
            src={solviserLogo} 
            alt="Solviser" 
            className={`transition-all ${isCollapsed ? 'h-8' : 'h-10'}`}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuItems.map((item) => (
          <SidebarGroup key={item.title}>
            {item.subItems ? (
              <Collapsible
                open={openGroups.includes(item.title)}
                onOpenChange={() => toggleGroup(item.title)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between w-full px-3 py-2 hover:bg-sidebar-accent rounded-md cursor-pointer">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openGroups.includes(item.title) ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuItem key={subItem.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={subItem.url}
                              end
                              className="hover:bg-sidebar-accent"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <subItem.icon className="h-4 w-4 mr-2" />
                              {!isCollapsed && <span>{subItem.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
