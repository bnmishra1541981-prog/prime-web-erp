import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Companies from "./pages/Companies";
import Ledgers from "./pages/Ledgers";
import SalesVoucher from "./pages/vouchers/SalesVoucher";
import PurchaseVoucher from "./pages/vouchers/PurchaseVoucher";
import PaymentVoucher from "./pages/vouchers/PaymentVoucher";
import ReceiptVoucher from "./pages/vouchers/ReceiptVoucher";
import DayBook from "./pages/reports/DayBook";
import LedgerReport from "./pages/reports/LedgerReport";
import TrialBalance from "./pages/reports/TrialBalance";
import ProfitAndLoss from "./pages/reports/ProfitAndLoss";
import BalanceSheet from "./pages/reports/BalanceSheet";
import InvoiceDemo from "./pages/InvoiceDemo";
import Notifications from "./pages/Notifications";
import ProductionOrders from "./pages/production/ProductionOrders";
import OrderDetail from "./pages/production/OrderDetail";
import UserManagement from "./pages/production/UserManagement";
import OrderAssignment from "./pages/production/OrderAssignment";
import OrderManagement from "./pages/production/OrderManagement";
import ProductionDashboard from "./pages/production/ProductionDashboard";
import StockGroups from "./pages/masters/StockGroups";
import StockItems from "./pages/masters/StockItems";
import Godowns from "./pages/masters/Godowns";
import GSTRates from "./pages/masters/GSTRates";
import CostCenters from "./pages/masters/CostCenters";
import LedgerGroups from "./pages/masters/LedgerGroups";
import JournalVoucher from "./pages/vouchers/JournalVoucher";
import ContraVoucher from "./pages/vouchers/ContraVoucher";
import InvoiceView from "./pages/vouchers/InvoiceView";
import { MainLayout } from "./components/MainLayout";
import { useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Index />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <Companies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ledgers"
        element={
          <ProtectedRoute>
            <Ledgers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vouchers/sales"
        element={
          <ProtectedRoute>
            <SalesVoucher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vouchers/purchase"
        element={
          <ProtectedRoute>
            <PurchaseVoucher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vouchers/payment"
        element={
          <ProtectedRoute>
            <PaymentVoucher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vouchers/receipt"
        element={
          <ProtectedRoute>
            <ReceiptVoucher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/daybook"
        element={
          <ProtectedRoute>
            <DayBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/ledger"
        element={
          <ProtectedRoute>
            <LedgerReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/trialbalance"
        element={
          <ProtectedRoute>
            <TrialBalance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/profitandloss"
        element={
          <ProtectedRoute>
            <ProfitAndLoss />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/balancesheet"
        element={
          <ProtectedRoute>
            <BalanceSheet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/orders"
        element={
          <ProtectedRoute>
            <ProductionOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/orders/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/users"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/assign-orders/:userId"
        element={
          <ProtectedRoute>
            <OrderAssignment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/manage-orders"
        element={
          <ProtectedRoute>
            <OrderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/dashboard"
        element={
          <ProtectedRoute>
            <ProductionDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/ledger-groups"
        element={
          <ProtectedRoute>
            <LedgerGroups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/stock-groups"
        element={
          <ProtectedRoute>
            <StockGroups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/stock-items"
        element={
          <ProtectedRoute>
            <StockItems />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/godowns"
        element={
          <ProtectedRoute>
            <Godowns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/gst-rates"
        element={
          <ProtectedRoute>
            <GSTRates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/cost-centers"
        element={
          <ProtectedRoute>
            <CostCenters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vouchers/journal"
        element={
          <ProtectedRoute>
            <JournalVoucher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vouchers/contra"
        element={
          <ProtectedRoute>
            <ContraVoucher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice/:id"
        element={
          <ProtectedRoute>
            <InvoiceView />
          </ProtectedRoute>
        }
      />
      <Route path="/invoice-demo" element={<InvoiceDemo />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
