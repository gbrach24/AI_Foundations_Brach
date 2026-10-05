interface QuantityStepperProps {
  value: number
  max: number
  onChange: (value: number) => void
  label: string
  /** Allow going to 0 (the Bag page uses 0 to mean "remove"). */
  allowZero?: boolean
}

export default function QuantityStepper({ value, max, onChange, label, allowZero = false }: QuantityStepperProps) {
  const min = allowZero ? 0 : 1
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        +
      </button>
    </div>
  )
}
