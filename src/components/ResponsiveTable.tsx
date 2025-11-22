import { Table } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable = ({ children, className }: ResponsiveTableProps) => {
  return (
    <div className="w-full overflow-auto">
      <div className="min-w-[640px]">
        <Table className={cn(className)}>
          {children}
        </Table>
      </div>
    </div>
  );
};
