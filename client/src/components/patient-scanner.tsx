import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Patient } from "@shared/schema";

interface PatientScannerProps {
  onPatientFound: (patient: Patient) => void;
}

export function PatientScanner({ onPatientFound }: PatientScannerProps) {
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { refetch: fetchPatient } = useQuery({
    queryKey: ['/api/patients', patientId],
    enabled: false,
    retry: false,
  });

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const id = patientId.trim();
      if (!id) return;

      try {
        const result = await fetchPatient();
        if (result.data) {
          onPatientFound(result.data);
          setError("");
          setPatientId("");
        } else {
          setError("Patient ID not found. Please try again.");
          inputRef.current?.select();
        }
      } catch (err) {
        setError("Patient ID not found. Please try again.");
        inputRef.current?.select();
      }
    }
  };

  return (
    <div className="text-center max-w-lg mx-auto">
      <div className="mb-6">
        <i className="fas fa-qrcode text-6xl text-medical-primary mb-4"></i>
        <h3 className="text-2xl font-bold text-medical-text-primary mb-2">Scan Patient Barcode</h3>
        <p className="text-medical-text-muted">Use your scanner or manually enter the patient ID below</p>
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-3 items-center">
          <input 
            ref={inputRef}
            type="text" 
            value={patientId}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
              setPatientId(value);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Scan or Enter Patient ID..." 
            maxLength={12}
            pattern="[0-9]{1,12}"
            inputMode="numeric"
            className="flex-1 text-center text-lg p-4 border-2 border-medical-border rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent transition duration-200 font-mono"
            data-testid="input-patient-id"
          />
          <button
            onClick={() => handleKeyPress({ key: 'Enter' } as React.KeyboardEvent)}
            disabled={!patientId.trim()}
            className="px-6 py-4 bg-medical-primary hover:bg-medical-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            data-testid="button-submit-patient-id"
          >
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700" data-testid="error-patient-not-found">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-slate-50 rounded-lg">
        <h4 className="font-semibold text-medical-text-primary mb-3">How to Use Scanner:</h4>
        <ul className="text-sm text-medical-text-muted space-y-2 text-left">
          <li><i className="fas fa-circle text-xs mr-2"></i>Point scanner at patient wristband barcode</li>
          <li><i className="fas fa-circle text-xs mr-2"></i>Wait for successful beep confirmation</li>
          <li><i className="fas fa-circle text-xs mr-2"></i>Patient information will load automatically</li>
        </ul>
      </div>
    </div>
  );
}
