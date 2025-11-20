import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell, CheckCircle, XCircle, Eye, Mail, MessageSquare, Smartphone, ArrowRight, FileText, ShoppingCart } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNo: string;
  buyerName: string;
  amount: number;
  gst: number;
  items: string;
  date: string;
  status: "pending" | "accepted" | "review" | "rejected";
}

interface Notification {
  id: string;
  invoiceId: string;
  type: "whatsapp" | "email" | "inapp";
  message: string;
  status: "unread" | "read";
}

export default function InvoiceDemo() {
  const [userView, setUserView] = useState<"A" | "B">("A");
  
  // User A state
  const [salesEntries, setSalesEntries] = useState<Invoice[]>([]);
  
  // User B state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reviewQueue, setReviewQueue] = useState<Invoice[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<Invoice[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    buyerName: "",
    invoiceNo: "",
    amount: "",
    gst: "",
    items: "",
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNo: formData.invoiceNo,
      buyerName: formData.buyerName,
      amount: parseFloat(formData.amount),
      gst: parseFloat(formData.gst),
      items: formData.items,
      date: new Date().toLocaleDateString(),
      status: "pending",
    };

    // Add to User A's sales entries
    setSalesEntries([...salesEntries, newInvoice]);

    // Create notifications for User B
    const notificationTypes: Array<"whatsapp" | "email" | "inapp"> = ["whatsapp", "email", "inapp"];
    const newNotifications = notificationTypes.map((type) => ({
      id: `${newInvoice.id}-${type}`,
      invoiceId: newInvoice.id,
      type,
      message: `New invoice #${newInvoice.invoiceNo} from User A for ₹${newInvoice.amount + newInvoice.gst}`,
      status: "unread" as const,
    }));

    setNotifications([...notifications, ...newNotifications]);

    toast.success("Invoice created! Notifications sent to User B");

    // Reset form
    setFormData({
      buyerName: "",
      invoiceNo: "",
      amount: "",
      gst: "",
      items: "",
    });
  };

  const handleAction = (invoiceId: string, action: "accept" | "review" | "reject") => {
    // Find the invoice
    const invoice = salesEntries.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    // Mark notifications as read
    setNotifications(notifications.map((n) => 
      n.invoiceId === invoiceId ? { ...n, status: "read" as const } : n
    ));

    if (action === "accept") {
      // Update invoice status
      setSalesEntries(salesEntries.map((inv) => 
        inv.id === invoiceId ? { ...inv, status: "accepted" } : inv
      ));

      // Auto-create purchase entry in User B's account
      setPurchaseEntries([...purchaseEntries, { ...invoice, status: "accepted" }]);
      
      toast.success("Invoice accepted! Purchase entry auto-created", {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      });
    } else if (action === "review") {
      // Update invoice status
      setSalesEntries(salesEntries.map((inv) => 
        inv.id === invoiceId ? { ...inv, status: "review" } : inv
      ));

      // Add to review queue
      setReviewQueue([...reviewQueue, { ...invoice, status: "review" }]);
      
      toast.info("Invoice moved to Review & Approval section");
    } else if (action === "reject") {
      // Update invoice status
      setSalesEntries(salesEntries.map((inv) => 
        inv.id === invoiceId ? { ...inv, status: "rejected" } : inv
      ));
      
      toast.error("Invoice rejected", {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
      });
    }
  };

  const handleReviewAction = (invoiceId: string, action: "accept" | "reject") => {
    const invoice = reviewQueue.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    if (action === "accept") {
      // Remove from review queue
      setReviewQueue(reviewQueue.filter((inv) => inv.id !== invoiceId));
      
      // Update sales entry status
      setSalesEntries(salesEntries.map((inv) => 
        inv.id === invoiceId ? { ...inv, status: "accepted" } : inv
      ));

      // Add to purchase entries
      setPurchaseEntries([...purchaseEntries, { ...invoice, status: "accepted" }]);
      
      toast.success("Invoice accepted from review! Purchase entry created");
    } else {
      // Remove from review queue
      setReviewQueue(reviewQueue.filter((inv) => inv.id !== invoiceId));
      
      // Update sales entry status
      setSalesEntries(salesEntries.map((inv) => 
        inv.id === invoiceId ? { ...inv, status: "rejected" } : inv
      ));
      
      toast.error("Invoice rejected from review");
    }
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants = {
      pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      accepted: "bg-green-500/10 text-green-700 dark:text-green-400",
      review: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
    };
    
    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    const icons = {
      whatsapp: <Smartphone className="h-5 w-5 text-green-600" />,
      email: <Mail className="h-5 w-5 text-blue-600" />,
      inapp: <Bell className="h-5 w-5 text-solviser-primary" />,
    };
    return icons[type];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-solviser-primary to-solviser-primary-hover bg-clip-text text-transparent">
            Solviser ERP
          </h1>
          <p className="text-muted-foreground text-lg">
            Cross-Party Invoice Auto-Verification & Sync System Demo
          </p>
          
          {/* User Toggle */}
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => setUserView("A")}
              variant={userView === "A" ? "default" : "outline"}
              className={userView === "A" ? "bg-solviser-primary hover:bg-solviser-primary-hover" : ""}
            >
              <FileText className="h-4 w-4 mr-2" />
              User A (Seller)
            </Button>
            <Button
              onClick={() => setUserView("B")}
              variant={userView === "B" ? "default" : "outline"}
              className={userView === "B" ? "bg-solviser-primary hover:bg-solviser-primary-hover" : ""}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              User B (Buyer)
            </Button>
          </div>
        </div>

        {/* User A View */}
        {userView === "A" && (
          <div className="space-y-6">
            {/* Invoice Creation Form */}
            <Card className="border-solviser-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-solviser-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-solviser-primary" />
                  Create New Invoice
                </CardTitle>
                <CardDescription>
                  Create an invoice for User B. Notifications will be sent automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="buyerName">Buyer Name (User B)</Label>
                      <Input
                        id="buyerName"
                        value={formData.buyerName}
                        onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                        placeholder="Enter buyer company name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNo">Invoice Number</Label>
                      <Input
                        id="invoiceNo"
                        value={formData.invoiceNo}
                        onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                        placeholder="INV-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="10000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gst">GST (₹)</Label>
                      <Input
                        id="gst"
                        type="number"
                        value={formData.gst}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                        placeholder="1800"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="items">Items/Description</Label>
                    <Textarea
                      id="items"
                      value={formData.items}
                      onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                      placeholder="List of items or services"
                      required
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-solviser-primary hover:bg-solviser-primary-hover">
                    Create Invoice & Send Notifications
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sales Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Your Sales Entries</CardTitle>
                <CardDescription>All invoices created by you</CardDescription>
              </CardHeader>
              <CardContent>
                {salesEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No sales entries yet. Create an invoice to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {salesEntries.map((invoice) => (
                      <Card key={invoice.id} className="border-l-4 border-l-solviser-primary">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-lg">Invoice #{invoice.invoiceNo}</h4>
                                {getStatusBadge(invoice.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">Buyer: {invoice.buyerName}</p>
                              <p className="text-sm">Items: {invoice.items}</p>
                              <div className="flex gap-4 text-sm pt-2">
                                <span>Amount: ₹{invoice.amount}</span>
                                <span>GST: ₹{invoice.gst}</span>
                                <span className="font-semibold text-solviser-primary">
                                  Total: ₹{invoice.amount + invoice.gst}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">{invoice.date}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* User B View */}
        {userView === "B" && (
          <div className="space-y-6">
            {/* Notifications */}
            <Card className="border-solviser-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-solviser-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-solviser-primary" />
                  Pending Notifications
                  {notifications.filter((n) => n.status === "unread").length > 0 && (
                    <Badge className="bg-solviser-primary">
                      {notifications.filter((n) => n.status === "unread").length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  New invoice notifications from User A
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {notifications.filter((n) => n.status === "unread").length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No pending notifications
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Array.from(new Set(notifications.filter((n) => n.status === "unread").map((n) => n.invoiceId))).map((invoiceId) => {
                      const invoice = salesEntries.find((inv) => inv.id === invoiceId);
                      if (!invoice || invoice.status !== "pending") return null;
                      
                      const relatedNotifications = notifications.filter((n) => n.invoiceId === invoiceId);
                      
                      return (
                        <Card key={invoiceId} className="border-2 border-solviser-primary/30">
                          <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-lg">Invoice #{invoice.invoiceNo}</h4>
                              <p className="text-sm">From: User A</p>
                              <p className="text-sm">Items: {invoice.items}</p>
                              <div className="flex gap-4 text-sm">
                                <span>Amount: ₹{invoice.amount}</span>
                                <span>GST: ₹{invoice.gst}</span>
                                <span className="font-semibold text-solviser-primary">
                                  Total: ₹{invoice.amount + invoice.gst}
                                </span>
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                              <p className="text-sm font-medium">Notifications received via:</p>
                              <div className="flex gap-2">
                                {relatedNotifications.map((notification) => (
                                  <div
                                    key={notification.id}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted"
                                  >
                                    {getNotificationIcon(notification.type)}
                                    <span className="text-sm capitalize">{notification.type}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                              <p className="text-sm font-medium">Choose Action:</p>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  onClick={() => handleAction(invoiceId, "accept")}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accept & Auto-Create Purchase
                                </Button>
                                <Button
                                  onClick={() => handleAction(invoiceId, "review")}
                                  variant="outline"
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review Later
                                </Button>
                                <Button
                                  onClick={() => handleAction(invoiceId, "reject")}
                                  variant="outline"
                                  className="border-red-500 text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Review & Approval Queue
                  {reviewQueue.length > 0 && (
                    <Badge>{reviewQueue.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Invoices pending your review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewQueue.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No invoices in review queue
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviewQueue.map((invoice) => (
                      <Card key={invoice.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-lg">Invoice #{invoice.invoiceNo}</h4>
                              <p className="text-sm text-muted-foreground">From: User A</p>
                              <p className="text-sm">Items: {invoice.items}</p>
                              <div className="flex gap-4 text-sm pt-2">
                                <span>Amount: ₹{invoice.amount}</span>
                                <span>GST: ₹{invoice.gst}</span>
                                <span className="font-semibold">Total: ₹{invoice.amount + invoice.gst}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReviewAction(invoice.id, "accept")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                onClick={() => handleReviewAction(invoice.id, "reject")}
                                variant="outline"
                                className="border-red-500 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Entries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Entries (Auto-Synced)
                </CardTitle>
                <CardDescription>
                  Automatically created from accepted invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {purchaseEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No purchase entries yet. Accept an invoice to auto-create entries.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {purchaseEntries.map((invoice) => (
                      <Card key={invoice.id} className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-lg">Purchase Entry #{invoice.invoiceNo}</h4>
                                <Badge className="bg-green-600">Auto-Created</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">Seller: User A</p>
                              <p className="text-sm">Items: {invoice.items}</p>
                              <div className="flex gap-4 text-sm pt-2">
                                <span>Amount: ₹{invoice.amount}</span>
                                <span>GST: ₹{invoice.gst}</span>
                                <span className="font-semibold text-green-600">
                                  Total: ₹{invoice.amount + invoice.gst}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">{invoice.date}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
