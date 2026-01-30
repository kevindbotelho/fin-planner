import { useRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({ value, onChange, placeholder = "0,00", className }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert internal value (like "343.65") to display format ("343,65")
  const formatDisplay = (val: string): string => {
    if (!val || val === '0' || val === '0.00') return '0,00';
    
    // Parse the numeric value
    const numericValue = parseFloat(val);
    if (isNaN(numericValue)) return '0,00';
    
    // Format with 2 decimal places and use comma
    return numericValue.toFixed(2).replace('.', ',');
  };

  // Get display value from stored value
  const displayValue = formatDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove all non-numeric characters
    const digitsOnly = inputValue.replace(/\D/g, '');
    
    if (!digitsOnly) {
      onChange('0');
      return;
    }
    
    // Convert to number with 2 decimal places (divide by 100)
    const numericValue = parseInt(digitsOnly, 10) / 100;
    
    // Store as dot-separated value for database compatibility
    onChange(numericValue.toString());
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text on focus for easy replacement
    e.target.select();
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={cn(className)}
    />
  );
}
