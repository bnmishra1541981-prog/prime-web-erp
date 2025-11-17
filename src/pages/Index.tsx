import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, BarChart3, FileText, Shield, Zap, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: 'Complete Voucher Management',
      description: 'Sales, Purchase, Payment, Receipt, and more with Tally-style entry flow',
    },
    {
      icon: BarChart3,
      title: 'Comprehensive Reports',
      description: 'Balance Sheet, P&L, Cash Book, and detailed ledger reports',
    },
    {
      icon: Shield,
      title: 'GST Compliant',
      description: 'Built-in GST calculation, e-invoice, and e-waybill support',
    },
    {
      icon: Zap,
      title: 'Real-time Notifications',
      description: 'Auto-sync vouchers between parties with Accept/Reject workflow',
    },
    {
      icon: Users,
      title: 'Multi-party System',
      description: 'Connect with customers and suppliers for seamless transaction flow',
    },
    {
      icon: Building2,
      title: 'Multi-company Support',
      description: 'Manage multiple companies from a single dashboard',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-gradient-to-b from-muted/50 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary rounded-xl shadow-lg">
                <Building2 className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground">
              Professional ERP System
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Complete accounting, inventory, and GST management with Tally Prime-inspired interface
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate('/auth')}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything You Need to Manage Your Business
          </h2>
          <p className="text-muted-foreground">
            Built with simplicity and power in mind
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="mb-4">
                <div className="inline-flex p-3 rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Start managing your accounting and inventory with professional-grade tools
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/auth')}
          >
            Create Your Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
