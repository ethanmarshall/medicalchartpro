import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Patient, type Medicine, type Prescription, type Administration } from "@shared/schema";
import { NextDoseCountdown } from "./next-dose-countdown";
import { useAuth } from "@/hooks/useAuth";

interface MedicationAdminProps {
  patient: Patient;
}

interface LogEntry {
  message: string;
  type: 'success' | 'warning' | 'error';
  timestamp: string;
}

export function MedicationAdmin({ patient }: MedicationAdminProps) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const medScannerRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMedicine, setDuplicateMedicine] = useState<{medicine: Medicine, administration: Administration} | null>(null);
  const [showNotPrescribedWarning, setShowNotPrescribedWarning] = useState(false);
  const [notPrescribedMedicine, setNotPrescribedMedicine] = useState<{medicine: Medicine, scannedId: string} | null>(null);

  useEffect(() => {
    medScannerRef.current?.focus();
  }, []);

  // Get prescriptions for this patient
  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['/api/patients', patient.id, 'prescriptions'],
  });

  // Get all medicines for lookup
  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines'],
  });

  // Get administrations for this patient
  const { data: administrations = [] } = useQuery<Administration[]>({
    queryKey: ['/api/patients', patient.id, 'administrations'],
  });

  const createAdministrationMutation = useMutation({
    mutationFn: async (data: { patientId: string; medicineId: string; status: string; message: string; prescriptionId?: string }) => {
      console.log('Sending administration data:', data);
      const result = await apiRequest('/api/administrations', 'POST', data);
      console.log('Administration result:', result);
      return result;
    },
    onSuccess: (result) => {
      console.log('Administration saved successfully:', result);
      // Invalidate both administrations and medication alerts to update overdue tracker
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'administrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medication-alerts'] });
    },
    onError: (error) => {
      console.error('Administration save failed:', error);
      addLogEntry(`ERROR: Failed to save administration - ${error.message}`, 'error');
    },
  });

  const addLogEntry = (message: string, type: LogEntry['type']) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prevLog => [{ message, type, timestamp }, ...prevLog]);
  };

  // Get time simulation status for accurate time calculations
  const { data: timeStatus } = useQuery<{currentTime: Date, isSimulating: boolean}>({
    queryKey: ['/api/time-simulation/status'],
    refetchInterval: 10000,
    staleTime: 5000
  });

  // Helper function to determine if a medication dose is ready for re-administration
  const isDueDoseReady = (lastAdministeredAt: Date | string, periodicity: string): boolean => {
    const lastDose = new Date(lastAdministeredAt);
    const periodicityLower = periodicity.toLowerCase();
    
    // Use simulated time if available, otherwise real time
    const now = timeStatus?.currentTime ? new Date(timeStatus.currentTime) : new Date();
    
    let intervalHours = 0;
    
    if (periodicityLower.includes('every')) {
      const hourMatch = periodicityLower.match(/every\s+(\d+)\s+hours?/);
      if (hourMatch) {
        intervalHours = parseInt(hourMatch[1]);
      } else {
        intervalHours = 6; // Default to 6 hours if we can't parse
      }
    } else if (periodicityLower.includes('daily') || periodicityLower.includes('once daily')) {
      intervalHours = 24;
    } else if (periodicityLower.includes('twice daily')) {
      intervalHours = 12;
    } else if (periodicityLower.includes('three times daily')) {
      intervalHours = 8;
    } else if (periodicityLower.includes('four times daily')) {
      intervalHours = 6;
    } else if (periodicityLower.includes('as needed') || periodicityLower.includes('as Needed') || periodicityLower.includes('prn')) {
      // For PRN medications, mark as pending again after 6 hours
      intervalHours = 6;
    } else {
      intervalHours = 6; // Default to 6 hours
    }
    
    const nextDoseTime = new Date(lastDose.getTime() + intervalHours * 60 * 60 * 1000);
    return now >= nextDoseTime;
  };
  
  const handleContinueWithDuplicate = () => {
    if (duplicateMedicine) {
      const warningMessage = `WARNING: Duplicate administration of '${duplicateMedicine.medicine.name}' - Previously administered at ${new Date(duplicateMedicine.administration.administeredAt || '').toLocaleString()}`;
      addLogEntry(warningMessage, 'warning');
      createAdministrationMutation.mutate({
        patientId: patient.id,
        medicineId: duplicateMedicine.medicine.id,
        status: 'warning',
        message: warningMessage
      });
    }
    setShowDuplicateWarning(false);
    setDuplicateMedicine(null);
  };
  
  const handleCancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setDuplicateMedicine(null);
  };

  const handleNotPrescribedCancel = () => {
    setShowNotPrescribedWarning(false);
    setNotPrescribedMedicine(null);
  };

  const handleNotPrescribedProceed = () => {
    if (notPrescribedMedicine) {
      const errorMessage = `DANGER: Administered '${notPrescribedMedicine.medicine.name}' - NOT prescribed for this patient.`;
      addLogEntry(errorMessage, 'error');
      createAdministrationMutation.mutate({
        patientId: patient.id,
        medicineId: notPrescribedMedicine.scannedId,
        status: 'error',
        message: errorMessage
      });
    }
    setShowNotPrescribedWarning(false);
    setNotPrescribedMedicine(null);
  };

  const handleMedKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const medId = e.currentTarget.value.trim();
      if (!medId) return;

      const medicine = medicines.find(m => m.id === medId);
      const prescribedIds = prescriptions.map(p => p.medicineId);

      if (!medicine) {
        const errorMessage = `ERROR: Scanned barcode ${medId} is not a known medicine.`;
        addLogEntry(errorMessage, 'error');
        createAdministrationMutation.mutate({
          patientId: patient.id,
          medicineId: medId,
          status: 'error',
          message: errorMessage
        });
      } else if (!prescribedIds.includes(medId)) {
        // Show warning popup for medicine not prescribed to this patient
        setNotPrescribedMedicine({ medicine, scannedId: medId });
        setShowNotPrescribedWarning(true);
      } else {
        // Check if medicine has been successfully administered before
        const existingAdmin = administrations.find(
          adm => adm.medicineId === medId && adm.status === 'administered'
        );
        
        if (existingAdmin) {
          // Check if medication is due for re-administration based on periodicity
          const prescription = prescriptions.find(p => p.medicineId === medId);
          if (prescription && isDueDoseReady(existingAdmin.administeredAt || new Date(), prescription.periodicity)) {
            // Medication is due - allow re-administration
            const successMessage = `SUCCESS: Administered '${medicine.name}' (next scheduled dose).`;
            addLogEntry(successMessage, 'success');
            createAdministrationMutation.mutate({
              patientId: patient.id,
              medicineId: medId,
              prescriptionId: prescription.id,
              status: 'administered',
              message: successMessage
            });
          } else {
            // Show warning popup for early duplicate administration
            setDuplicateMedicine({ medicine, administration: existingAdmin });
            setShowDuplicateWarning(true);
          }
        } else {
          const prescription = prescriptions.find(p => p.medicineId === medId);
          const successMessage = `SUCCESS: Administered '${medicine.name}'.`;
          addLogEntry(successMessage, 'success');
          createAdministrationMutation.mutate({
            patientId: patient.id,
            medicineId: medId,
            prescriptionId: prescription?.id,
            status: 'administered',
            message: successMessage
          });
        }
      }
      
      e.currentTarget.value = '';
    }
  };

  const prescribedMedicines = prescriptions.map(p => {
    const medicine = medicines.find(m => m.id === p.medicineId);
    return { ...p, medicine };
  }).filter(p => p.medicine);

  // Calculate progress based on current medication status (accounting for overdue)
  const currentlyAdministeredCount = prescribedMedicines.filter(prescription => {
    const successfulAdmin = administrations.find(
      adm => adm.medicineId === prescription.medicineId && adm.status === 'administered'
    );
    const isDueForNext = successfulAdmin ? 
      isDueDoseReady(successfulAdmin.administeredAt || new Date(), prescription.periodicity) : 
      true;
    return !!successfulAdmin && !isDueForNext;
  }).length;
  
  const administeredCount = currentlyAdministeredCount;
  const totalCount = prescribedMedicines.length;
  const progressPercentage = totalCount > 0 ? Math.round((administeredCount / totalCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Scanner & Log */}
      <div className="space-y-6">
        {/* Medicine Scanner */}
        <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
          <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
            <i className="fas fa-pills text-medical-primary mr-2"></i>Medication Administration
          </h3>
          
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <input 
                ref={medScannerRef}
                type="text" 
                placeholder="Scan or Enter Medicine ID..." 
                onKeyPress={handleMedKeyPress}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.value = target.value.replace(/[^0-9]/g, '').slice(0, 8);
                }}
                maxLength={8}
                pattern="[0-9]{1,8}"
                inputMode="numeric"
                className="flex-1 text-center text-lg p-4 border-2 border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent transition duration-200 font-mono"
                data-testid="input-medicine-scanner"
              />
              <button
                onClick={() => {
                  const input = medScannerRef.current;
                  if (input && input.value.trim()) {
                    handleMedKeyPress({ key: 'Enter', currentTarget: input } as React.KeyboardEvent<HTMLInputElement>);
                  }
                }}
                disabled={!medScannerRef.current?.value?.trim()}
                className="px-6 py-4 bg-medical-primary hover:bg-medical-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                data-testid="button-submit-medicine-id"
              >
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-medical-text-primary mb-2">Scanning Instructions:</h4>
              <ul className="text-sm text-medical-text-muted space-y-1">
                <li>• Scan medicine package barcode</li>
                <li>• System will verify against prescribed medications</li>
                <li>• Confirmation will be logged automatically</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Verification Log */}
        <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
          <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
            <i className="fas fa-clipboard-list text-medical-primary mr-2"></i>Verification Log
          </h3>
          
          <div className="h-64 overflow-y-auto bg-slate-50 border border-medical-border rounded-lg p-4 space-y-3">
            {log.length === 0 ? (
              <div className="text-center py-8 text-medical-text-muted">
                <i className="fas fa-clipboard-list text-3xl mb-2 opacity-50"></i>
                <p className="text-sm">Scan history will appear here...</p>
              </div>
            ) : (
              log.map((entry, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    entry.type === 'success' ? 'bg-medical-success' : 
                    entry.type === 'warning' ? 'bg-medical-warning' : 'bg-medical-danger'
                  }`}></div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      entry.type === 'success' ? 'text-medical-success' : 
                      entry.type === 'warning' ? 'text-medical-warning' : 'text-medical-danger font-bold'
                    }`}>
                      {entry.message}
                    </p>
                    <p className="text-xs text-medical-text-muted font-mono">[{entry.timestamp}]</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Prescribed Medicines & Summary */}
      <div className="space-y-6">
        {/* Prescribed Medicines */}
        <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
          <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
            <i className="fas fa-prescription-bottle-alt text-medical-primary mr-2"></i>Prescribed Medicines
          </h3>
          
          <div className="space-y-3">
            {prescribedMedicines.length === 0 ? (
              <p className="text-medical-text-muted italic text-center py-4">
                No medications prescribed for this patient.
              </p>
            ) : (
              prescribedMedicines.map((prescription) => {
                // Check if this medicine has been successfully administered
                const successfulAdmin = administrations.find(
                  adm => adm.medicineId === prescription.medicineId && adm.status === 'administered'
                );
                
                // Check if medication is due for next dose (overdue medications should show as pending)
                // PRN medications are never considered overdue - they reset to "Pending" after the interval
                const isPrnMedication = prescription.periodicity.toLowerCase().includes('as needed') || 
                                       prescription.periodicity.toLowerCase().includes('prn');
                
                // Protocol delayed medications (null start/end dates) should never be overdue
                const isProtocolDelayed = prescription.startDate === null || prescription.endDate === null;
                
                const isDueForNextDose = successfulAdmin ? 
                  (isPrnMedication ? false : isDueDoseReady(successfulAdmin.administeredAt || new Date(), prescription.periodicity)) : 
                  (!isPrnMedication && !isProtocolDelayed); // PRN meds and protocol delayed meds show as pending, not overdue
                  
                const isAdministered = !!successfulAdmin && !isDueDoseReady(successfulAdmin.administeredAt || new Date(), prescription.periodicity);
                
                return (
                  <div 
                    key={prescription.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isAdministered 
                        ? 'bg-green-50 border-green-200' 
                        : isDueForNextDose 
                        ? 'bg-red-50 border-red-200'
                        : isProtocolDelayed
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                    data-testid={`medicine-${prescription.medicineId}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isAdministered ? 'bg-medical-success' : isDueForNextDose ? 'bg-red-500' : isProtocolDelayed ? 'bg-orange-500' : 'bg-medical-warning'
                      }`}></div>
                      <div>
                        <p className="font-medium text-medical-text-primary">{prescription.medicine?.name}</p>
                        <p className="text-xs text-medical-text-muted font-mono">ID: {prescription.medicineId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
                        isAdministered ? 'bg-medical-success' : isDueForNextDose ? 'bg-red-500' : isProtocolDelayed ? 'bg-orange-500' : 'bg-medical-warning'
                      }`}>
                        <i className={`fas ${isAdministered ? 'fa-check' : isDueForNextDose ? 'fa-exclamation-triangle' : isProtocolDelayed ? 'fa-hourglass-half' : 'fa-clock'} mr-1`}></i>
                        {isAdministered ? 'Administered' : isDueForNextDose ? 'Pending (Overdue)' : isProtocolDelayed ? 'Pending' : 'Pending'}
                      </span>
                      <div className="mt-1 space-y-1">
                        {successfulAdmin && successfulAdmin.administeredAt && (
                          <p className="text-xs text-medical-text-muted">
                            Last: {new Date(successfulAdmin.administeredAt).toLocaleString([], { 
                              timeZone: 'America/New_York',
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        )}
                        {/* Show countdown timer for all medications (except PRN/as needed) */}
                        {(successfulAdmin && successfulAdmin.administeredAt) ? (
                          <NextDoseCountdown 
                            lastAdministeredAt={successfulAdmin.administeredAt}
                            periodicity={prescription.periodicity}
                          />
                        ) : prescription.startDate === null || prescription.endDate === null ? (
                          (() => {
                            // For protocol delayed medications, show countdown from activation time
                            // Find the trigger medication administration time (assume first admin was the trigger)
                            const triggerAdmin = administrations.find(adm => adm.status === 'administered');
                            const protocolDelayHours = 4; // 4 hour delay
                            
                            if (triggerAdmin && triggerAdmin.administeredAt) {
                              const triggerTime = new Date(triggerAdmin.administeredAt);
                              // Allow collection 1 hour before delay expires (subtract 1 hour = 3600000ms)
                              const activationTime = new Date(triggerTime.getTime() + protocolDelayHours * 60 * 60 * 1000 - (60 * 60 * 1000));
                              const now = new Date();
                              const timeLeft = activationTime.getTime() - now.getTime();
                              
                              if (timeLeft > 0) {
                                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                                const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                
                                return (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                    <i className="fas fa-hourglass-half mr-1"></i>
                                    Pending • {timeDisplay}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    <i className="fas fa-clock mr-1"></i>
                                    Due now
                                  </span>
                                );
                              }
                            } else {
                              return (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                  <i className="fas fa-hourglass-half mr-1"></i>
                                  Pending • 4h
                                </span>
                              );
                            }
                          })()
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <i className="fas fa-clock mr-1"></i>
                            Due now
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Administration Summary */}
        <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
          <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
            <i className="fas fa-chart-pie text-medical-primary mr-2"></i>Administration Summary
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-medical-success" data-testid="count-administered">{administeredCount}</p>
              <p className="text-xs text-medical-text-muted font-medium">Administered</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-medical-warning" data-testid="count-pending">{totalCount - administeredCount}</p>
              <p className="text-xs text-medical-text-muted font-medium">Pending</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-medical-text-primary" data-testid="count-total">{totalCount}</p>
              <p className="text-xs text-medical-text-muted font-medium">Total</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-medical-success h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-medical-text-muted">
            <span data-testid="progress-percentage">{progressPercentage}% Complete</span> • 
            Last updated: <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>
      </div>

      {/* Duplicate Medicine Warning Modal */}
      {showDuplicateWarning && duplicateMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-medical-text-primary">Duplicate Administration Warning</h3>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-800 mb-2">
                <strong>{duplicateMedicine.medicine.name}</strong> has already been administered to this patient.
              </p>
              <p className="text-xs text-gray-600">
                Previous administration: {new Date(duplicateMedicine.administration.administeredAt || '').toLocaleString()}
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6 text-center">
              Do you want to continue with this duplicate administration?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelDuplicate}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                data-testid="button-cancel-duplicate"
              >
                Cancel
              </button>
              <button
                onClick={handleContinueWithDuplicate}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                data-testid="button-continue-duplicate"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not Prescribed Medicine Warning Modal */}
      {showNotPrescribedWarning && notPrescribedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-medical-text-primary">Medicine Not Prescribed</h3>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-800 mb-2">
                <strong>WARNING:</strong> <span className="text-red-700">{notPrescribedMedicine.medicine.name}</span> is <strong>NOT prescribed</strong> for this patient.
              </p>
              <p className="text-xs text-gray-600 mb-2">
                <strong>Scanned ID:</strong> {notPrescribedMedicine.scannedId}
              </p>
              <p className="text-xs text-red-600 font-medium">
                Administering this medication could be dangerous!
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6 text-center">
              This medicine is not in the patient's current prescriptions. Do you still want to proceed?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleNotPrescribedCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                data-testid="button-cancel-not-prescribed"
              >
                Cancel
              </button>
              <button
                onClick={handleNotPrescribedProceed}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                data-testid="button-proceed-not-prescribed"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
