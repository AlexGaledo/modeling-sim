"use client";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

export default function Slider({ label, value, min, max, step = 1, format, onChange }: Props) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs">
        <span className="text-[#888]">{label}</span>
        <span className="font-mono text-[#555]">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full accent-[#00704A]"
      />
    </label>
  );
}
