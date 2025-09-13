import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// --- ICONS ---
const CalculatorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-6 w-6"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="10" x2="8" y2="10"></line><line x1="16" y1="14" x2="8" y2="14"></line><line x1="16" y1="18" x2="8" y2="18"></line></svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);

// --- SHARED UTILITIES & COMPONENTS ---

// Conversion factors to base units (mcg for mass, mL for volume, kg for weight, hr for time)
const unitConversionFactors: {
  mass: Record<string, number>;
  volume: Record<string, number>;
  weight: Record<string, number>;
  time: Record<string, number>;
} = {
  mass: { g: 1000000, mg: 1000, mcg: 1 },
  volume: { L: 1000, mL: 1 },
  weight: { kg: 1, lbs: 0.453592 },
  time: { hr: 1, min: 1/60 }
};

/**
 * Reusable component for a labeled input field.
 */
const InputGroup = ({ label, value, onChange, children, placeholder = "0" }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
  placeholder?: string;
}) => (
  <div className="flex flex-col">
    <label className="mb-1 text-sm font-medium text-gray-600">{label}</label>
    <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 focus-within:ring-2 focus-within:ring-medical-primary">
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent p-3 text-gray-800 outline-none"
        min="0"
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {children}
    </div>
  </div>
);

/**
 * Reusable component for a unit selection dropdown.
 */
const UnitSelector = ({ value, onChange, options }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Record<string, number>;
}) => (
  <select
    value={value}
    onChange={onChange}
    className="cursor-pointer appearance-none rounded-r-lg border-l border-gray-300 bg-gray-100 p-3 font-medium text-gray-700 outline-none hover:bg-gray-200"
    data-testid={`select-unit-${value}`}
  >
    {Object.keys(options).map(unit => (
      <option key={unit} value={unit}>{unit}</option>
    ))}
  </select>
);

/**
 * Renders the Calculate and Reset buttons.
 */
const ActionButtons = ({ onCalculate, onReset }: {
  onCalculate: () => void;
  onReset: () => void;
}) => (
  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
    <button 
      onClick={onCalculate} 
      className="flex-1 rounded-lg bg-medical-primary px-6 py-3 text-center font-semibold text-white shadow-md transition hover:bg-medical-primary/90 focus:outline-none focus:ring-2 focus:ring-medical-primary focus:ring-offset-2"
      data-testid="button-calculate"
    >
      Calculate
    </button>
    <button 
      onClick={onReset} 
      className="flex-1 rounded-lg bg-gray-200 px-6 py-3 text-center font-semibold text-gray-700 transition hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
      data-testid="button-reset"
    >
      Reset
    </button>
  </div>
);

/**
 * Renders the result and the "Show Work" button.
 */
const ResultDisplay = ({ result, work, onToggleWork, showWork }: {
  result: string;
  work: { formula: string; steps: string[] } | null;
  onToggleWork: () => void;
  showWork: boolean;
}) => (
  <div className="space-y-3">
    <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4 text-center">
      <p className="text-lg font-medium text-gray-600">Result:</p>
      <p className="text-4xl font-bold text-green-700" data-testid="text-result">{result}</p>
    </div>
    <div className="flex justify-end">
      <button 
        onClick={onToggleWork} 
        className="flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold text-medical-primary hover:bg-medical-primary/10"
        data-testid="button-show-work"
      >
        <InfoIcon />
        {showWork ? 'Hide Work' : 'Show Work'}
      </button>
    </div>
    {showWork && work && (
      <div className="whitespace-pre-wrap rounded-lg bg-gray-100 p-4 font-mono text-sm text-gray-700" data-testid="div-work-shown">
        <p className="font-sans font-bold text-gray-800">Formula:</p>
        <p className="mb-2">{work.formula}</p>
        <p className="font-sans font-bold text-gray-800">Calculation:</p>
        {work.steps.map((step, index) => <p key={index}>{step}</p>)}
      </div>
    )}
  </div>
);

// --- CALCULATOR TYPE COMPONENTS ---

/**
 * Basic Dose Calculator (Want / Have * Volume)
 */
const BasicDoseCalculator = ({ onCalculation }: {
  onCalculation: (result: { result?: string; error?: string; work?: { formula: string; steps: string[] } | null }) => void;
}) => {
  const [orderedDose, setOrderedDose] = useState('');
  const [orderedUnit, setOrderedUnit] = useState('mg');
  const [stockDose, setStockDose] = useState('');
  const [stockUnit, setStockUnit] = useState('mg');
  const [stockVolume, setStockVolume] = useState('');
  const [stockVolumeUnit, setStockVolumeUnit] = useState('mL');

  const handleCalculate = () => {
    const inputs = [orderedDose, stockDose, stockVolume];
    if (inputs.some(input => input === '' || isNaN(parseFloat(input)) || parseFloat(input) <= 0)) {
      onCalculation({ error: 'Please fill all fields with valid, positive numbers.' });
      return;
    }
    
    const orderedDoseInBase = parseFloat(orderedDose) * unitConversionFactors.mass[orderedUnit];
    const stockDoseInBase = parseFloat(stockDose) * unitConversionFactors.mass[stockUnit];

    if (stockDoseInBase === 0) {
      onCalculation({ error: 'The dose on hand cannot be zero.' });
      return;
    }

    const calculatedAmount = (orderedDoseInBase / stockDoseInBase) * parseFloat(stockVolume);
    
    onCalculation({
      result: `${calculatedAmount.toFixed(2)} ${stockVolumeUnit}`,
      work: {
        formula: "(Dose Ordered / Dose on Hand) × Volume",
        steps: [
          `(${orderedDose} ${orderedUnit} / ${stockDose} ${stockUnit}) × ${stockVolume} ${stockVolumeUnit}`,
          `= ${calculatedAmount.toFixed(2)} ${stockVolumeUnit}`
        ]
      }
    });
  };

  const handleReset = () => {
    setOrderedDose(''); setOrderedUnit('mg');
    setStockDose(''); setStockUnit('mg');
    setStockVolume(''); setStockVolumeUnit('mL');
    onCalculation({ result: undefined, error: undefined, work: null });
  };

  return (
    <div className="space-y-4">
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold text-medical-primary">Dose Ordered</legend>
        <InputGroup label="Provider's Order" value={orderedDose} onChange={(e) => setOrderedDose(e.target.value)}>
          <UnitSelector value={orderedUnit} onChange={(e) => setOrderedUnit(e.target.value)} options={unitConversionFactors.mass} />
        </InputGroup>
      </fieldset>
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold text-medical-primary">Dose on Hand</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputGroup label="Concentration" value={stockDose} onChange={(e) => setStockDose(e.target.value)}>
            <UnitSelector value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} options={unitConversionFactors.mass} />
          </InputGroup>
          <InputGroup label="Volume" value={stockVolume} onChange={(e) => setStockVolume(e.target.value)}>
            <UnitSelector value={stockVolumeUnit} onChange={(e) => setStockVolumeUnit(e.target.value)} options={unitConversionFactors.volume} />
          </InputGroup>
        </div>
      </fieldset>
      <ActionButtons onCalculate={handleCalculate} onReset={handleReset} />
    </div>
  );
};

/**
 * Weight-Based Dose Calculator (mg/kg)
 */
const WeightBasedCalculator = ({ onCalculation }: {
  onCalculation: (result: { result?: string; error?: string; work?: { formula: string; steps: string[] } | null }) => void;
}) => {
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [orderedDose, setOrderedDose] = useState('');
  const [orderedUnit, setOrderedUnit] = useState('mg/kg');
  const [stockDose, setStockDose] = useState('');
  const [stockUnit, setStockUnit] = useState('mg');
  const [stockVolume, setStockVolume] = useState('');
  const [stockVolumeUnit, setStockVolumeUnit] = useState('mL');

  const handleCalculate = () => {
    const inputs = [weight, orderedDose, stockDose, stockVolume];
    if (inputs.some(input => input === '' || isNaN(parseFloat(input)) || parseFloat(input) <= 0)) {
      onCalculation({ error: 'Please fill all fields with valid, positive numbers.' });
      return;
    }

    const weightInKg = parseFloat(weight) * unitConversionFactors.weight[weightUnit];
    const totalOrderedDose = weightInKg * parseFloat(orderedDose);
    
    const stockDoseInMg = parseFloat(stockDose) * (unitConversionFactors.mass[stockUnit] / 1000);

    if (stockDoseInMg === 0) {
      onCalculation({ error: 'The dose on hand cannot be zero.' });
      return;
    }

    const calculatedAmount = (totalOrderedDose / stockDoseInMg) * parseFloat(stockVolume);
    
    onCalculation({
      result: `${calculatedAmount.toFixed(2)} ${stockVolumeUnit}`,
      work: {
        formula: "Total Dose = Weight × Ordered Dose\nAdminister = (Total Dose / Concentration) × Volume",
        steps: [
          `Total Dose = ${weight} ${weightUnit} × ${orderedDose} ${orderedUnit} = ${totalOrderedDose.toFixed(2)} mg`,
          `Administer = (${totalOrderedDose.toFixed(2)} mg / ${stockDose} ${stockUnit}) × ${stockVolume} ${stockVolumeUnit}`,
          `= ${calculatedAmount.toFixed(2)} ${stockVolumeUnit}`
        ]
      }
    });
  };
  
  const handleReset = () => {
    setWeight(''); setWeightUnit('kg');
    setOrderedDose(''); setOrderedUnit('mg/kg');
    setStockDose(''); setStockUnit('mg');
    setStockVolume(''); setStockVolumeUnit('mL');
    onCalculation({ result: undefined, error: undefined, work: null });
  };

  return (
    <div className="space-y-4">
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold text-medical-primary">Patient & Order</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputGroup label="Patient Weight" value={weight} onChange={(e) => setWeight(e.target.value)}>
            <UnitSelector value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} options={unitConversionFactors.weight} />
          </InputGroup>
          <InputGroup label="Dose Ordered" value={orderedDose} onChange={(e) => setOrderedDose(e.target.value)}>
            <select 
              className="cursor-pointer appearance-none rounded-r-lg border-l border-gray-300 bg-gray-100 p-3 font-medium text-gray-700 outline-none hover:bg-gray-200" 
              value={orderedUnit} 
              onChange={e => setOrderedUnit(e.target.value)}
              data-testid="select-ordered-unit"
            >
              <option>mg/kg</option>
              <option>mcg/kg</option>
            </select>
          </InputGroup>
        </div>
      </fieldset>
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold text-medical-primary">Dose on Hand</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputGroup label="Concentration" value={stockDose} onChange={(e) => setStockDose(e.target.value)}>
            <UnitSelector value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} options={unitConversionFactors.mass} />
          </InputGroup>
          <InputGroup label="Per Volume" value={stockVolume} onChange={(e) => setStockVolume(e.target.value)}>
            <UnitSelector value={stockVolumeUnit} onChange={(e) => setStockVolumeUnit(e.target.value)} options={unitConversionFactors.volume} />
          </InputGroup>
        </div>
      </fieldset>
      <ActionButtons onCalculate={handleCalculate} onReset={handleReset} />
    </div>
  );
};

/**
 * IV Drip Rate Calculator (mL/hr)
 */
const IVDripRateCalculator = ({ onCalculation }: {
  onCalculation: (result: { result?: string; error?: string; work?: { formula: string; steps: string[] } | null }) => void;
}) => {
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('mL');
  const [time, setTime] = useState('');
  const [timeUnit, setTimeUnit] = useState('hr');

  const handleCalculate = () => {
    const inputs = [volume, time];
    if (inputs.some(input => input === '' || isNaN(parseFloat(input)) || parseFloat(input) <= 0)) {
      onCalculation({ error: 'Please fill all fields with valid, positive numbers.' });
      return;
    }

    const volumeInMl = parseFloat(volume) * unitConversionFactors.volume[volumeUnit];
    const timeInHr = parseFloat(time) * unitConversionFactors.time[timeUnit];

    if (timeInHr === 0) {
      onCalculation({ error: 'Time cannot be zero.' });
      return;
    }

    const dripRate = volumeInMl / timeInHr;
    
    onCalculation({
      result: `${dripRate.toFixed(2)} mL/hr`,
      work: {
        formula: "Rate = Total Volume / Total Time",
        steps: [
          `(${volume} ${volumeUnit} / ${time} ${timeUnit})`,
          `= ${dripRate.toFixed(2)} mL/hr`
        ]
      }
    });
  };

  const handleReset = () => {
    setVolume(''); setVolumeUnit('mL');
    setTime(''); setTimeUnit('hr');
    onCalculation({ result: undefined, error: undefined, work: null });
  };

  return (
    <div className="space-y-4">
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold text-medical-primary">Infusion Details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputGroup label="Total Volume to Infuse" value={volume} onChange={(e) => setVolume(e.target.value)}>
            <UnitSelector value={volumeUnit} onChange={(e) => setVolumeUnit(e.target.value)} options={unitConversionFactors.volume} />
          </InputGroup>
          <InputGroup label="Over Time" value={time} onChange={(e) => setTime(e.target.value)}>
            <UnitSelector value={timeUnit} onChange={(e) => setTimeUnit(e.target.value)} options={unitConversionFactors.time} />
          </InputGroup>
        </div>
      </fieldset>
      <ActionButtons onCalculate={handleCalculate} onReset={handleReset} />
    </div>
  );
};

// --- MAIN DOSE CALCULATOR COMPONENT ---
export function DoseCalculator({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [calcType, setCalcType] = useState('basic');
  const [result, setResult] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [work, setWork] = useState<{ formula: string; steps: string[] } | null>(null);
  const [showWork, setShowWork] = useState(false);

  const handleCalculation = ({ result, error, work }: {
    result?: string;
    error?: string;
    work?: { formula: string; steps: string[] } | null;
  }) => {
    setResult(result);
    setError(error);
    setWork(work || null);
    if (error) {
      setShowWork(false);
    }
  };

  const handleTabChange = (type: string) => {
    setCalcType(type);
    setResult(undefined);
    setError(undefined);
    setWork(null);
    setShowWork(false);
  };

  const calculators: Record<string, { name: string; component: React.ReactNode }> = {
    basic: {
      name: 'Basic Dose',
      component: <BasicDoseCalculator onCalculation={handleCalculation} />
    },
    weightBased: {
      name: 'Weight-Based',
      component: <WeightBasedCalculator onCalculation={handleCalculation} />
    },
    ivDrip: {
      name: 'IV Drip Rate',
      component: <IVDripRateCalculator onCalculation={handleCalculation} />
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-medical-text-primary">
            <CalculatorIcon />
            Medication Dose Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate medication doses, weight-based dosing, and IV drip rates with step-by-step calculations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              {Object.entries(calculators).map(([key, { name }]) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    calcType === key
                      ? 'border-medical-primary text-medical-primary'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                  data-testid={`tab-${key}`}
                >
                  {name}
                </button>
              ))}
            </nav>
          </div>

          {/* Calculator Body */}
          <div>
            {calculators[calcType].component}
          </div>

          {/* Result & Error Display */}
          {error && (
            <div className="flex items-center rounded-lg border-l-4 border-red-500 bg-red-50 p-4 text-red-800" data-testid="div-error">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <p>{error}</p>
            </div>
          )}
          {result && !error && (
            <ResultDisplay 
              result={result} 
              work={work} 
              showWork={showWork} 
              onToggleWork={() => setShowWork(!showWork)} 
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}