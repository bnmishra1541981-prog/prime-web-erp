import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const LedgerGroups = () => {
  const ledgerGroups = {
    "Capital & Liability Groups": [
      { value: "capital_account", label: "Capital Account" },
      { value: "reserves_and_surplus", label: "Reserves & Surplus" },
      { value: "secured_loans", label: "Secured Loans" },
      { value: "unsecured_loans", label: "Unsecured Loans" },
      { value: "duties_and_taxes", label: "Duties & Taxes" },
      { value: "sundry_creditors", label: "Sundry Creditors" },
      { value: "suspense_account", label: "Suspense A/c" },
    ],
    "Assets Groups": [
      { value: "fixed_assets", label: "Fixed Assets" },
      { value: "investments", label: "Investments" },
      { value: "current_assets", label: "Current Assets" },
      { value: "sundry_debtors", label: "Sundry Debtors" },
      { value: "cash_in_hand", label: "Cash-in-Hand" },
      { value: "bank_accounts", label: "Bank Accounts" },
      { value: "stock_in_hand", label: "Stock-in-Hand" },
      { value: "deposits_assets", label: "Deposits (Asset)" },
      { value: "loans_and_advances_assets", label: "Loans & Advances (Asset)" },
    ],
    "Income Groups": [
      { value: "sales_accounts", label: "Sales Accounts" },
      { value: "direct_incomes", label: "Direct Incomes" },
      { value: "indirect_incomes", label: "Indirect Incomes" },
    ],
    "Expense Groups": [
      { value: "purchase_accounts", label: "Purchase Accounts" },
      { value: "direct_expenses", label: "Direct Expenses" },
      { value: "indirect_expenses", label: "Indirect Expenses" },
    ],
    "Non-Revenue Groups": [
      { value: "branch_divisions", label: "Branch / Divisions" },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ledger Groups</h1>
        <p className="text-muted-foreground mt-2">
          Predefined accounting groups for ledger classification
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(ledgerGroups).map(([category, groups]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div
                      key={group.value}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <span className="text-sm font-medium">{group.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {group.value.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> These are system-defined ledger groups that are used when creating ledgers.
            Each ledger must be assigned to one of these groups for proper accounting classification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LedgerGroups;
