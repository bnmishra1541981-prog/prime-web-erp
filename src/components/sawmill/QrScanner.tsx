import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

const QrScanner = ({ open, onClose, onScan }: QrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountId = "qr-reader";

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(mountId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (!cancelled) {
              onScan(decodedText);
              stopScanner();
              onClose();
            }
          },
          () => {} // ignore scan failures
        );
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Camera access denied or not available");
        }
      }
    };

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(startScanner, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [open]);

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null;
  };

  const handleClose = () => {
    stopScanner();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Scan QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div id={mountId} className="w-full rounded-md overflow-hidden" />
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Point your camera at the QR code on the log tag
          </p>
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QrScanner;
