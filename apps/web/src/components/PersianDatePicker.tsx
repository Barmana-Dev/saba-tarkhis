import { useMemo, useRef } from "react";
import { X } from "lucide-react";
import DatePickerPackage, {
  type DateObject,
  type DatePickerRef,
} from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/colors/teal.css";
import { cn } from "../lib/cn";
import { inputClass } from "./ui";

// The package is CJS; Vite's dev prebundle can expose the component on
// `default.default`. Resolve both shapes so dev and build agree.
const DatePicker =
  (DatePickerPackage as unknown as { default?: typeof DatePickerPackage })
    .default ?? DatePickerPackage;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, "0");

/** Local-time ISO date (YYYY-MM-DD), so the selected day never shifts by timezone. */
function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseISO(value: string): Date | undefined {
  if (!ISO_DATE.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

type PersianDatePickerProps = {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
  /** Shows a small clear (×) button once a date is selected. */
  clearable?: boolean;
};

/**
 * Jalali date picker. The UI is the Persian calendar, while the value handed
 * to callers (and the API) stays a Gregorian ISO date (YYYY-MM-DD).
 */
export function PersianDatePicker({
  id,
  value,
  onChange,
  className,
  placeholder = "انتخاب تاریخ",
  invalid,
  ariaLabel,
  clearable = true,
}: PersianDatePickerProps) {
  const dateValue = useMemo(() => parseISO(value), [value]);
  const pickerRef = useRef<DatePickerRef>(null);

  return (
    <div className="relative w-full">
      <DatePicker
        ref={pickerRef}
        id={id}
        value={dateValue}
        onChange={(date: DateObject | DateObject[] | null) => {
          const selected = Array.isArray(date) ? date[0] : date;
          onChange(selected ? toISO(selected.toDate()) : "");
          // Let the picker finish its own click handling first, then close it.
          window.setTimeout(() => pickerRef.current?.closeCalendar(), 0);
        }}
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-right"
        format="YYYY/MM/DD"
        editable={false}
        // Opening an empty picker must not silently apply today's date.
        onOpenPickNewDate={false}
        className="saba-datepicker"
        containerClassName="w-full"
        inputClass={cn(
          inputClass,
          "cursor-pointer select-none pe-9",
          invalid && "border-rose-300",
          className,
        )}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {clearable && value ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            pickerRef.current?.closeCalendar();
            onChange("");
          }}
          aria-label="پاک کردن تاریخ"
          title="پاک کردن تاریخ"
          className="absolute end-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-rose-600"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
