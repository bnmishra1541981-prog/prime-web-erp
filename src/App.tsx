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
import InvoiceDemo from "./pages/InvoiceDemo";
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
