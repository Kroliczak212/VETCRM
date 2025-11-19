import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");

    React.useEffect(() => {
      // Format the value for display
      if (value) {
        // Remove all non-digit characters
        const digits = value.replace(/\D/g, "");

        // If it starts with 48, it's already in international format
        if (digits.startsWith("48")) {
          setDisplayValue(formatPhoneNumber(digits.substring(2)));
        } else {
          setDisplayValue(formatPhoneNumber(digits));
        }
      } else {
        setDisplayValue("");
      }
    }, [value]);

    const formatPhoneNumber = (digits: string) => {
      // Format as: XXX XXX XXX (9 digits)
      if (digits.length <= 3) {
        return digits;
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;

      // Remove all non-digit characters
      const digits = input.replace(/\D/g, "");

      // Limit to 9 digits
      const limitedDigits = digits.slice(0, 9);

      // Update display
      setDisplayValue(formatPhoneNumber(limitedDigits));

      // Call onChange with full international format
      if (onChange) {
        if (limitedDigits) {
          onChange(`+48${limitedDigits}`);
        } else {
          onChange("");
        }
      }
    };

    return (
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          +48
        </div>
        <Input
          type="text"
          className={cn("pl-12", className)}
          value={displayValue}
          onChange={handleChange}
          placeholder="123 456 789"
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
