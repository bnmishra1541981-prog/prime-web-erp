import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceNumberSettingsProps {
  onSave: (prefix: string, startNumber: number) => void;
  currentPrefix?: string;
  currentNumber?: number;
}

export const InvoiceNumberSettings = ({ onSave, currentPrefix = '', currentNumber = 1 }: InvoiceNumberSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState(currentPrefix);
  const [startNumber, setStartNumber] = useState(currentNumber.toString());

  const handleSave = () => {
    if (!prefix.trim()) {
      toast.error('Please enter a prefix');
      return;
    }
    
    const num = parseInt(startNumber);
    if (isNaN(num) || num < 1) {
      toast.error('Please enter a valid starting number');
      return;
    }

    onSave(prefix, num);
    setOpen(false);
    toast.success('Invoice numbering settings saved');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Numbering
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice Numbering Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prefix">Invoice Number Prefix</Label>
            <Input
              id="prefix"
              placeholder="ME/TI/25-26/00"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: ME/TI/25-26/00 will generate ME/TI/25-26/001, ME/TI/25-26/002, etc.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startNumber">Starting Number</Label>
            <Input
              id="startNumber"
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The first invoice will use this number
            </p>
          </div>
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-2 bg-muted rounded text-sm font-mono">
              {prefix}{startNumber.padStart(3, '0')}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
