import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface SelectWithCreateProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  onAddNew?: (value: string) => void;
}

export const SelectWithCreate = ({ 
  value, 
  onValueChange, 
  options, 
  placeholder = "Select", 
  onAddNew 
}: SelectWithCreateProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleSelectChange = (val: string) => {
    if (val === '__add_new__') {
      setIsAdding(true);
    } else {
      onValueChange(val);
    }
  };

  const handleAddNew = () => {
    if (newValue.trim()) {
      onAddNew?.(newValue.trim());
      onValueChange(newValue.trim());
      setIsAdding(false);
      setNewValue('');
    }
  };

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Enter new value"
          className="flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddNew();
            } else if (e.key === 'Escape') {
              setIsAdding(false);
              setNewValue('');
            }
          }}
        />
        <button
          type="button"
          onClick={handleAddNew}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAdding(false);
            setNewValue('');
          }}
          className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleSelectChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
        <SelectItem value="__add_new__" className="text-primary font-semibold">
          + Add New
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
