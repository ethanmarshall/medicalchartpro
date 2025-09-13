import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Patient, type Prescription, type Medicine, type Administration } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { NextDoseCountdown } from "./next-dose-countdown";
import { useAuth } from "@/hooks/useAuth";

interface PrescriptionManagerProps {
  patient: Patient;
}

export function PrescriptionManager({ patient }: PrescriptionManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [dosage, setDosage] = useState("");
  const [periodicity, setPeriodicity] = useState("");
  const [duration, setDuration] = useState("");
  const [route, setRoute] = useState("Oral");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [availableProtocols, setAvailableProtocols] = useState<any[]>([]);
  const [pendingPrescription, setPendingPrescription] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEditPrescriptions = user?.role === 'instructor' || user?.role === 'admin';

  // Client-side dose calculation helpers
  const calculateTotalDoses = (periodicity: string, duration: string | null): number | null => {
    // Return null for PRN/as needed medications
    if (periodicity.toLowerCase().includes('as needed') || periodicity.toLowerCase().includes('prn')) {
      return null;
    }
    
    if (!duration) {
      return null;
    }
    
    // Parse duration (e.g., "5 days", "2 weeks", "1 month")
    const durationLower = duration.toLowerCase();
    let totalDays = 0;
    
    const dayMatch = durationLower.match(/(\d+)\s*days?/);
    const weekMatch = durationLower.match(/(\d+)\s*weeks?/);
    const monthMatch = durationLower.match(/(\d+)\s*months?/);
    
    if (dayMatch) {
      totalDays = parseInt(dayMatch[1]);
    } else if (weekMatch) {
      totalDays = parseInt(weekMatch[1]) * 7;
    } else if (monthMatch) {
      totalDays = parseInt(monthMatch[1]) * 30; // Approximate
    } else {
      return null; // Can't parse duration
    }
    
    // Parse frequency (e.g., "Every 4 hours", "Twice daily", "Once daily")
    const periodicityLower = periodicity.toLowerCase();
    let dosesPerDay = 0;
    
    // Check specific patterns BEFORE generic 'daily' check to prevent false matches
    if (periodicityLower.includes('four times daily') || periodicityLower.includes('qid')) {
      dosesPerDay = 4;
    } else if (periodicityLower.includes('three times daily') || periodicityLower.includes('tid')) {
      dosesPerDay = 3;
    } else if (periodicityLower.includes('twice daily') || periodicityLower.includes('bid')) {
      dosesPerDay = 2;
    } else if (periodicityLower.includes('once daily') || (periodicityLower.includes('daily') && !periodicityLower.includes('times'))) {
      dosesPerDay = 1;
    } else {
      // Parse "every X hours" format (including "hrs" abbreviation)
      const hourMatch = periodicityLower.match(/every\s+(\d+)\s+(hours?|hrs?)/);
      if (hourMatch) {
        const hours = parseInt(hourMatch[1]);
        // Use Math.floor to avoid overestimating doses, and clamp to minimum 1
        dosesPerDay = Math.max(1, Math.floor(24 / hours));
      } else {
        return null; // Can't parse frequency
      }
    }
    
    return totalDays * dosesPerDay;
  };

  const calculateRemainingDoses = (prescription: any): string => {
    const totalDoses = prescription.totalDoses;
    if (totalDoses === null || totalDoses === undefined) {
      return 'PRN';
    }
    
    // Count administered doses for this prescription (primary method)
    let administeredCount = administrations.filter(
      admin => admin.prescriptionId === prescription.id && (admin.status === 'administered' || admin.status === 'success')
    ).length;
    
    // Fallback for legacy data: if no administrations found via prescriptionId,
    // count administrations that match patient+medicine (for existing null prescription_id records)
    if (administeredCount === 0) {
      administeredCount = administrations.filter(admin => 
        admin.patientId === prescription.patientId && 
        admin.medicineId === prescription.medicineId && 
        (admin.status === 'administered' || admin.status === 'success') &&
        !admin.prescriptionId // Only count legacy records without prescription link
      ).length;
    }
    
    const remaining = Math.max(0, totalDoses - administeredCount);
    return `Doses Left: ${remaining}`;
  };

  // Weight-based dosing calculation for medication 10000064
  const calculateWeightBasedDose = (medicineId: string, patientWeight: string): string => {
    if (medicineId !== '10000064') return '';
    
    // Parse weight to number (assuming it's in format like "3.2kg" or "3.2")
    const weightStr = patientWeight.toLowerCase().replace(/[^0-9.]/g, '');
    const weight = parseFloat(weightStr);
    
    if (isNaN(weight)) return '';
    
    // Apply weight-based dosing ranges
    if (weight >= 2 && weight < 2.5) {
      return '1mL';
    } else if (weight >= 2.5 && weight < 3) {
      return '1.25mL';
    } else if (weight >= 3 && weight < 3.5) {
      return '1.5mL';
    } else if (weight >= 3.5 && weight < 4) {
      return '1.75mL';
    } else if (weight >= 4 && weight <= 4.5) {
      return '2mL';
    } else if (weight > 4.5) {
      return '2.25mL';
    } else {
      return ''; // Weight below 2kg - no auto-dose
    }
  };

  // Get prescriptions for this patient
  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['/api/patients', patient.id, 'prescriptions'],
  });

  // Get all medicines for lookup
  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines'],
  });

  // Get administrations for countdown timers
  const { data: administrations = [] } = useQuery<Administration[]>({
    queryKey: ['/api/patients', patient.id, 'administrations'],
  });

  const addPrescriptionMutation = useMutation({
    mutationFn: async ({ medicineId, dosage, periodicity, duration, route, startDate, endDate, pin }: { medicineId: string, dosage: string, periodicity: string, duration: string, route: string, startDate: string, endDate: string, pin: string }) => {
      return await apiRequest(`/api/patients/${patient.id}/prescriptions`, 'POST', {
        medicineId,
        dosage,
        periodicity,
        duration,
        route,
        startDate,
        endDate,
        pin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'prescriptions'] });
      setShowAddModal(false);
      setSelectedMedicine(null);
      setDosage("");
      setPeriodicity("");
      setDuration("");
      setRoute("Oral");
      setStartDate("");
      setEndDate("");
      setPin("");
      setError("");
    },
    onError: (error: any) => {
      if (error.message.includes("401")) {
        setError("Invalid PIN code");
      } else {
        setError("Failed to add prescription");
      }
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ prescriptionId, dosage, periodicity, duration, route, startDate, endDate, pin }: { prescriptionId: string, dosage: string, periodicity: string, duration: string, route: string, startDate: string, endDate: string, pin: string }) => {
      return await apiRequest(`/api/patients/${patient.id}/prescriptions/${prescriptionId}`, 'PATCH', {
        dosage,
        periodicity,
        duration,
        route,
        startDate,
        endDate,
        pin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'prescriptions'] });
      setShowEditModal(false);
      setSelectedPrescription(null);
      setDosage("");
      setPeriodicity("");
      setDuration("");
      setStartDate("");
      setEndDate("");
      setPin("");
      setError("");
    },
    onError: (error: any) => {
      if (error.message.includes("401")) {
        setError("Invalid PIN code");
      } else {
        setError("Failed to update prescription");
      }
    },
  });

  const removePrescriptionMutation = useMutation({
    mutationFn: async ({ prescriptionId, pin }: { prescriptionId: string, pin: string }) => {
      return await apiRequest(`/api/patients/${patient.id}/prescriptions/${prescriptionId}`, 'DELETE', {
        pin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'prescriptions'] });
      setShowEditModal(false);
      setSelectedPrescription(null);
      setDosage("");
      setPeriodicity("");
      setDuration("");
      setStartDate("");
      setEndDate("");
      setPin("");
      setError("");
    },
    onError: (error: any) => {
      if (error.message.includes("401")) {
        setError("Invalid PIN code");
      } else {
        setError("Failed to remove prescription");
      }
    },
  });

  // Mutation to instantiate medication protocols
  const instantiateProtocolMutation = useMutation({
    mutationFn: async ({ linkId, triggerPrescriptionId }: { linkId: string, triggerPrescriptionId: string }) => {
      return await apiRequest(`/api/patients/${patient.id}/protocols/instantiate`, 'POST', {
        linkId,
        triggerPrescriptionId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'prescriptions'] });
      setShowProtocolModal(false);
      setAvailableProtocols([]);
      setPendingPrescription(null);
    },
    onError: (error: any) => {
      console.error('Failed to instantiate protocol:', error);
      setError("Failed to activate medication protocol");
    },
  });

  // Function to check for available medication protocols
  const checkForProtocols = async (medicineId: string) => {
    try {
      const response = await apiRequest(`/api/medication-links?triggerMedicineId=${medicineId}`, 'GET');
      return response || [];
    } catch (error) {
      console.error('Error checking for protocols:', error);
      return [];
    }
  };

  const handleAddPrescription = async () => {
    if (!selectedMedicine || !dosage || !periodicity || !duration || !route || (!pin && user?.role !== 'admin')) {
      setError("Please fill in all fields");
      return;
    }
    
    // Admin users bypass PIN requirement
    const effectivePin = user?.role === 'admin' ? '0000' : pin;
    
    // Check for available medication protocols
    const protocols = await checkForProtocols(selectedMedicine.id);
    
    if (protocols.length > 0) {
      // Store the prescription data and show protocol modal
      setPendingPrescription({ 
        medicineId: selectedMedicine.id, 
        dosage, 
        periodicity, 
        duration, 
        route, 
        startDate, 
        endDate, 
        pin: effectivePin 
      });
      setAvailableProtocols(protocols);
      setShowProtocolModal(true);
    } else {
      // No protocols found, create prescription directly
      addPrescriptionMutation.mutate({ medicineId: selectedMedicine.id, dosage, periodicity, duration, route, startDate, endDate, pin: effectivePin });
    }
  };

  // Function to create prescription and optionally instantiate protocols
  const createPrescriptionWithProtocols = async (protocolsToActivate: string[] = []) => {
    if (!pendingPrescription) return;
    
    try {
      // First create the prescription
      const prescription = await apiRequest(`/api/patients/${patient.id}/prescriptions`, 'POST', pendingPrescription);
      
      // If protocols should be activated, instantiate them
      for (const linkId of protocolsToActivate) {
        await instantiateProtocolMutation.mutateAsync({ 
          linkId, 
          triggerPrescriptionId: prescription.id 
        });
      }
      
      // Refresh prescriptions and close modals
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'prescriptions'] });
      setShowAddModal(false);
      setShowProtocolModal(false);
      setSelectedMedicine(null);
      setDosage("");
      setPeriodicity("");
      setDuration("");
      setRoute("Oral");
      setStartDate("");
      setEndDate("");
      setPin("");
      setError("");
      setAvailableProtocols([]);
      setPendingPrescription(null);
      
    } catch (error: any) {
      console.error('Error creating prescription with protocols:', error);
      setError("Failed to create prescription");
    }
  };

  const handleUpdatePrescription = () => {
    if (!selectedPrescription || !dosage || !periodicity || !duration || !route || (!pin && user?.role !== 'admin')) {
      setError("Please fill in all fields");
      return;
    }
    // Admin users bypass PIN requirement
    const effectivePin = user?.role === 'admin' ? '0000' : pin;
    updatePrescriptionMutation.mutate({ prescriptionId: selectedPrescription.id, dosage, periodicity, duration, route, startDate, endDate, pin: effectivePin });
  };

  const handleRemovePrescription = () => {
    if (!selectedPrescription || (!pin && user?.role !== 'admin')) {
      setError("Please enter PIN");
      return;
    }
    // Admin users bypass PIN requirement
    const effectivePin = user?.role === 'admin' ? '0000' : pin;
    removePrescriptionMutation.mutate({ prescriptionId: selectedPrescription.id, pin: effectivePin });
  };

  // Function to calculate end date based on start date and duration
  const calculateEndDate = (startDateStr: string, durationStr: string): string => {
    if (!startDateStr || !durationStr || durationStr === "As needed" || durationStr === "Ongoing") {
      return "";
    }

    const startDate = new Date(startDateStr);
    let endDate = new Date(startDate);

    // Parse duration and add to start date
    const durationLower = durationStr.toLowerCase();
    
    if (durationLower.includes("day")) {
      const days = parseInt(durationLower.match(/\d+/)?.[0] || "0");
      endDate.setDate(startDate.getDate() + days - 1); // -1 because we include the start day
    } else if (durationLower.includes("week")) {
      const weeks = parseInt(durationLower.match(/\d+/)?.[0] || "0");
      endDate.setDate(startDate.getDate() + (weeks * 7) - 1);
    } else if (durationLower.includes("month")) {
      const months = parseInt(durationLower.match(/\d+/)?.[0] || "0");
      endDate.setMonth(startDate.getMonth() + months);
      endDate.setDate(startDate.getDate() - 1);
    }

    return endDate.toISOString().split('T')[0];
  };

  // Handle start date change and auto-calculate end date
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    if (newStartDate && duration) {
      const calculatedEndDate = calculateEndDate(newStartDate, duration);
      setEndDate(calculatedEndDate);
    }
  };

  // Handle duration change and auto-calculate end date
  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration);
    if (startDate && newDuration) {
      const calculatedEndDate = calculateEndDate(startDate, newDuration);
      setEndDate(calculatedEndDate);
    }
  };

  const handleEditClick = (prescription: any) => {
    setSelectedPrescription(prescription);
    setDosage(prescription.dosage || "");
    setPeriodicity(prescription.periodicity || "");
    setDuration(prescription.duration || "");
    setRoute(prescription.route || "Oral");
    setStartDate(prescription.startDate ? new Date(prescription.startDate).toISOString().split('T')[0] : "");
    setEndDate(prescription.endDate ? new Date(prescription.endDate).toISOString().split('T')[0] : "");
    setShowEditModal(true);
  };

  const handlePrintMedicationList = () => {
    const printContent = prescribedMedicines.map(prescription => `
      Medication: ${prescription.medicine?.name}
      Dosage: ${prescription.dosage}
      Route: ${prescription.route}
      Frequency: ${prescription.periodicity}
      Duration: ${prescription.duration || 'Not specified'}
      Start Date: ${prescription.startDate ? new Date(prescription.startDate).toLocaleDateString() : 'Not specified'}
      End Date: ${prescription.endDate ? new Date(prescription.endDate).toLocaleDateString() : 'Not specified'}
      ---
    `).join('');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medication List - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2 { color: #1f2937; }
              .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
              .medication { margin-bottom: 20px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Medication List</h1>
              <h2>Patient: ${patient.name}</h2>
              <p>Medical Record Number: ${patient.id}</p>
              <p>Date of Birth: ${patient.dob || 'Not specified'}</p>
              <p>Printed: ${new Date().toLocaleString()}</p>
            </div>
            <pre>${printContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const prescribedMedicines = prescriptions.map(p => {
    const medicine = medicines.find(m => m.id === p.medicineId);
    return { ...p, medicine };
  }).filter(p => p.medicine);

  const unprescribedMedicines = medicines.filter(m => 
    !prescriptions.some(p => p.medicineId === m.id)
  );

  return (
    <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-medical-text-primary">
          <i className="fas fa-prescription-bottle text-medical-primary mr-2"></i>Prescription Management
        </h3>
        <div className="flex items-center space-x-3">
          {prescribedMedicines.length > 0 && (
            <button
              onClick={handlePrintMedicationList}
              className="px-3 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors"
              data-testid="button-print-medication-list"
            >
              <i className="fas fa-print mr-2"></i>Print Medication List
            </button>
          )}
          {canEditPrescriptions && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors font-medium"
              data-testid="button-add-prescription"
            >
              <i className="fas fa-plus mr-2"></i>Add Medicine
            </button>
          )}
        </div>
      </div>

      {/* Current Prescriptions */}
      <div className="space-y-3">
        {prescribedMedicines.length === 0 ? (
          <div className="text-center py-8 text-medical-text-muted">
            <i className="fas fa-prescription-bottle text-4xl mb-4 opacity-30"></i>
            <p className="text-lg font-medium mb-2">No Prescriptions</p>
            <p className="text-sm">Add medicines to this patient's prescription list.</p>
          </div>
        ) : (
          prescribedMedicines.map((prescription) => (
            <div 
              key={prescription.id} 
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border"
              data-testid={`prescription-${prescription.id}`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-medical-primary/10 rounded-full flex items-center justify-center">
                  <i className="fas fa-pills text-medical-primary"></i>
                </div>
                <div>
                  <h4 className="font-medium text-medical-text-primary">
                    {prescription.medicine?.name}
                  </h4>
                  <p className="text-sm text-medical-text-secondary">
                    <strong>Dosage:</strong> {prescription.dosage}
                  </p>
                  <p className="text-sm text-medical-text-secondary">
                    <strong>Frequency:</strong> {prescription.periodicity}
                  </p>
                  {prescription.duration && (
                    <p className="text-sm text-medical-text-secondary">
                      <strong>Duration:</strong> {prescription.duration}
                    </p>
                  )}
                  {prescription.startDate && (
                    <p className="text-sm text-medical-text-secondary">
                      <strong>Start:</strong> {new Date(prescription.startDate).toLocaleDateString()}
                      {prescription.endDate && ` - End: ${new Date(prescription.endDate).toLocaleDateString()}`}
                    </p>
                  )}
                  <p className="text-xs text-medical-text-muted font-mono">
                    ID: {prescription.medicineId}
                  </p>
                  <p className="text-sm text-medical-text-secondary">
                    <i className="fas fa-pills mr-1"></i>
                    <strong>{calculateRemainingDoses(prescription)}</strong>
                  </p>
                  {(() => {
                    const successfulAdmin = administrations.find(
                      adm => adm.medicineId === prescription.medicineId && adm.status === 'success'
                    );
                    return successfulAdmin && successfulAdmin.administeredAt && (
                      <p className="text-sm text-medical-text-secondary">
                        <strong>Next Dose:</strong> <NextDoseCountdown 
                          lastAdministeredAt={successfulAdmin.administeredAt}
                          periodicity={prescription.periodicity}
                        />
                      </p>
                    );
                  })()}
                </div>
              </div>
              {canEditPrescriptions && (
                <button
                  onClick={() => handleEditClick(prescription)}
                  className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  data-testid={`button-edit-${prescription.id}`}
                >
                  <i className="fas fa-edit mr-1"></i>Edit
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Prescription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-plus text-green-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-medical-text-primary">Add Prescription</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-medical-text-primary mb-2">
                  Select Medicine
                </label>
                <select
                  value={selectedMedicine?.id || ''}
                  onChange={(e) => {
                    const medicine = unprescribedMedicines.find(m => m.id === e.target.value);
                    setSelectedMedicine(medicine || null);
                    
                    // Auto-fill dosage, route, and frequency from selected medicine
                    if (medicine) {
                      // Check if this is medication 10000064 for weight-based dosing
                      if (medicine.id === '10000064') {
                        const weightBasedDose = calculateWeightBasedDose(medicine.id, patient.doseWeight);
                        if (weightBasedDose) {
                          setDosage(weightBasedDose);
                        } else {
                          // If weight calculation fails, use default dose
                          setDosage(medicine.dose || '');
                        }
                      } else {
                        // For all other medications, use the default dose
                        if (medicine.dose) {
                          setDosage(medicine.dose);
                        }
                      }
                      
                      if (medicine.route) {
                        setRoute(medicine.route);
                      }
                      if (medicine.frequency) {
                        setPeriodicity(medicine.frequency);
                      }
                    }
                  }}
                  className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-add-medicine"
                >
                  <option value="">Choose a medicine...</option>
                  {unprescribedMedicines.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(medicine => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} (ID: {medicine.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g., 10mg, 2 tablets"
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    data-testid="input-dosage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    Frequency
                  </label>
                  {selectedMedicine?.is_prn === 1 ? (
                    <select
                      value={periodicity}
                      onChange={(e) => setPeriodicity(e.target.value)}
                      className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                      data-testid="select-periodicity"
                    >
                      <option value="">Select frequency...</option>
                      {selectedMedicine?.frequency && (
                        <option value={selectedMedicine.frequency}>
                          {selectedMedicine.frequency}
                        </option>
                      )}
                      <option value="As Needed">As Needed</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={periodicity}
                      onChange={(e) => setPeriodicity(e.target.value)}
                      placeholder="Frequency (auto-filled)"
                      className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                      data-testid="input-periodicity"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-medical-text-primary mb-2">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-duration"
                >
                  <option value="">Select duration...</option>
                  <option value="1 day">1 day</option>
                  <option value="3 days">3 days</option>
                  <option value="5 days">5 days</option>
                  <option value="7 days">7 days</option>
                  <option value="10 days">10 days</option>
                  <option value="14 days">14 days</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="3 weeks">3 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="2 months">2 months</option>
                  <option value="3 months">3 months</option>
                  <option value="6 months">6 months</option>
                  <option value="As Needed">As Needed</option>
                  <option value="Ongoing">Ongoing</option>
                </select>
                
                {/* Dose Calculation Preview */}
                {periodicity && duration && (
                  <div className="mt-2 p-3 bg-medical-primary/5 border border-medical-primary/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-calculator text-medical-primary text-sm"></i>
                      <span className="text-sm font-medium text-medical-text-primary">
                        {(() => {
                          const totalDoses = calculateTotalDoses(periodicity, duration);
                          if (totalDoses === null) {
                            return 'PRN medication (as needed)';
                          } else {
                            return `Total doses: ${totalDoses}`;
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-medical-text-primary mb-2">
                  Route
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-route"
                >
                  <option value="PO">PO (Oral)</option>
                  <option value="IV">IV (Intravenous)</option>
                  <option value="IVP">IVP (Intravenous Push)</option>
                  <option value="IM">IM (Intramuscular)</option>
                  <option value="PR">PR (Rectally)</option>
                  <option value="Vaginal Insert">Vaginal Insert (Vaginally)</option>
                  <option value="Intracervical">Intracervical</option>
                  <option value="SC">SC (Subcutaneous)</option>
                  <option value="Buccal">Buccal</option>
                  <option value="Topical">Topical</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    data-testid="input-end-date"
                    placeholder="Auto-calculated from duration"
                  />
                </div>
              </div>

              {/* PIN Code - only required for non-admin users */}
              {user?.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    PIN Code
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary text-center tracking-widest"
                    maxLength={4}
                    data-testid="input-add-pin"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedMedicine(null);
                  setDosage("");
                  setPeriodicity("");
                  setDuration("");
                  setStartDate("");
                  setEndDate("");
                  setPin("");
                  setError("");
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                data-testid="button-cancel-add"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPrescription}
                disabled={addPrescriptionMutation.isPending}
                className="flex-1 px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                data-testid="button-confirm-add"
              >
                {addPrescriptionMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Adding...</>
                ) : (
                  <><i className="fas fa-plus mr-2"></i>Add Prescription</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prescription Modal */}
      {showEditModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-edit text-blue-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-medical-text-primary">Edit Prescription</h3>
              <p className="text-sm text-medical-text-secondary mt-1">
                {medicines.find(m => m.id === selectedPrescription.medicineId)?.name}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g., 10mg, 2 tablets"
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    data-testid="input-edit-dosage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    Frequency
                  </label>
                  <select
                    value={periodicity}
                    onChange={(e) => setPeriodicity(e.target.value)}
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    data-testid="select-edit-periodicity"
                  >
                    <option value="">Select frequency...</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Four times daily">Four times daily</option>
                    <option value="Every 2 hours">Every 2 hours</option>
                    <option value="Every 4 hours">Every 4 hours</option>
                    <option value="Every 6 hours">Every 6 hours</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="Every 12 hours">Every 12 hours</option>
                    <option value="As Needed">As Needed</option>
                    <option value="Every 4 hours as needed">Every 4 hours as needed</option>
                    <option value="Every 6 hours as needed">Every 6 hours as needed</option>
                    <option value="Continuous">Continuous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-medical-text-primary mb-2">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-edit-duration"
                >
                  <option value="">Select duration...</option>
                  <option value="1 day">1 day</option>
                  <option value="3 days">3 days</option>
                  <option value="5 days">5 days</option>
                  <option value="7 days">7 days</option>
                  <option value="10 days">10 days</option>
                  <option value="14 days">14 days</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="3 weeks">3 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="2 months">2 months</option>
                  <option value="3 months">3 months</option>
                  <option value="6 months">6 months</option>
                  <option value="As Needed">As Needed</option>
                  <option value="Ongoing">Ongoing</option>
                </select>
                
                {/* Dose Calculation Preview */}
                {periodicity && duration && (
                  <div className="mt-2 p-3 bg-medical-primary/5 border border-medical-primary/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-calculator text-medical-primary text-sm"></i>
                      <span className="text-sm font-medium text-medical-text-primary">
                        {(() => {
                          const totalDoses = calculateTotalDoses(periodicity, duration);
                          if (totalDoses === null) {
                            return 'PRN medication (as needed)';
                          } else {
                            return `Total doses: ${totalDoses}`;
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-medical-text-primary mb-2">
                  Route
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-route"
                >
                  <option value="PO">PO (Oral)</option>
                  <option value="IV">IV (Intravenous)</option>
                  <option value="IVP">IVP (Intravenous Push)</option>
                  <option value="IM">IM (Intramuscular)</option>
                  <option value="PR">PR (Rectally)</option>
                  <option value="Vaginal Insert">Vaginal Insert (Vaginally)</option>
                  <option value="Intracervical">Intracervical</option>
                  <option value="SC">SC (Subcutaneous)</option>
                  <option value="Buccal">Buccal</option>
                  <option value="Topical">Topical</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    data-testid="input-edit-start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    data-testid="input-edit-end-date"
                    placeholder="Auto-calculated from duration"
                  />
                </div>
              </div>

              {/* PIN Code - only required for non-admin users */}
              {user?.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-medical-text-primary mb-2">
                    PIN Code
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary text-center tracking-widest"
                    maxLength={4}
                    data-testid="input-edit-pin"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPrescription(null);
                  setDosage("");
                  setPeriodicity("");
                  setDuration("");
                  setStartDate("");
                  setEndDate("");
                  setPin("");
                  setError("");
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                data-testid="button-cancel-edit"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePrescription}
                disabled={removePrescriptionMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                data-testid="button-remove-from-edit"
              >
                {removePrescriptionMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-1"></i>Remove</>
                ) : (
                  <><i className="fas fa-trash mr-1"></i>Remove</>
                )}
              </button>
              <button
                onClick={handleUpdatePrescription}
                disabled={updatePrescriptionMutation.isPending}
                className="flex-1 px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                data-testid="button-confirm-edit"
              >
                {updatePrescriptionMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Updating...</>
                ) : (
                  <><i className="fas fa-save mr-2"></i>Update Prescription</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Prescription Modal - This is now only called from Edit modal */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-trash text-red-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-medical-text-primary">Remove Prescription</h3>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-800 mb-2">
                Are you sure you want to remove <strong>{medicines.find(m => m.id === selectedPrescription?.medicineId)?.name}</strong> from this patient's prescriptions?
              </p>
              <div className="text-xs text-gray-600 mb-2">
                <p><strong>Dosage:</strong> {selectedPrescription?.dosage}</p>
                <p><strong>Frequency:</strong> {selectedPrescription?.periodicity}</p>
              </div>
              <p className="text-xs text-gray-600">
                This action cannot be undone.
              </p>
            </div>

            {/* PIN Code - only required for non-admin users */}
            {user?.role !== 'admin' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-medical-text-primary mb-2">
                  PIN Code Required
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary text-center tracking-widest"
                  maxLength={4}
                  data-testid="input-remove-pin"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setSelectedPrescription(null);
                  setPin("");
                  setError("");
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                data-testid="button-cancel-remove"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePrescription}
                disabled={removePrescriptionMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                data-testid="button-confirm-remove"
              >
                {removePrescriptionMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Removing...</>
                ) : (
                  <><i className="fas fa-trash mr-2"></i>Remove Prescription</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Protocol Prompting Modal */}
      {showProtocolModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-lg mx-4 w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-link text-blue-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-medical-text-primary">Medication Protocol Available</h3>
              <p className="text-sm text-medical-text-secondary mt-2">
                Follow-up protocols are available for {selectedMedicine?.name}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Available Protocols:</h4>
                <div className="space-y-3">
                  {availableProtocols.map((protocol: any) => {
                    const followMedicine = medicines.find(m => m.id === protocol.followMedicineId);
                    return (
                      <div key={protocol.id} className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              Follow-up: {followMedicine?.name || 'Unknown Medicine'}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              • Delay: {protocol.delayMinutes} minutes after administration
                            </div>
                            <div className="text-sm text-gray-600">
                              • Frequency: {protocol.followFrequency}
                            </div>
                            <div className="text-sm text-gray-600">
                              • Duration: {protocol.followDurationHours} hours
                            </div>
                            {protocol.defaultDoseOverride && (
                              <div className="text-sm text-gray-600">
                                • Dose: {protocol.defaultDoseOverride}
                              </div>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked={true}
                            className="mt-1 h-4 w-4 text-medical-primary focus:ring-medical-primary border-gray-300 rounded"
                            data-testid={`checkbox-protocol-${protocol.id}`}
                            onChange={(e) => {
                              // Update selection state
                              const protocolElement = e.target.closest('[data-protocol-id]') as HTMLElement;
                              if (protocolElement) {
                                protocolElement.setAttribute('data-selected', e.target.checked ? 'true' : 'false');
                              }
                            }}
                            data-protocol-id={protocol.id}
                            data-selected="true"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start">
                  <i className="fas fa-info-circle text-amber-600 mt-0.5 mr-2"></i>
                  <div className="text-sm text-amber-800">
                    <div className="font-medium">What happens next?</div>
                    <div>Selected protocols will create follow-up prescriptions that become active after the initial dose is administered.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  // Create prescription without protocols
                  createPrescriptionWithProtocols([]);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                data-testid="button-skip-protocols"
              >
                <i className="fas fa-times mr-2"></i>Skip Protocols
              </button>
              <button
                onClick={() => {
                  // Get selected protocol IDs
                  const selectedProtocolIds: string[] = [];
                  const protocolElements = document.querySelectorAll('[data-protocol-id]');
                  protocolElements.forEach((element) => {
                    const isSelected = element.getAttribute('data-selected') === 'true';
                    if (isSelected) {
                      const protocolId = element.getAttribute('data-protocol-id');
                      if (protocolId) selectedProtocolIds.push(protocolId);
                    }
                  });
                  
                  // Create prescription with selected protocols
                  createPrescriptionWithProtocols(selectedProtocolIds);
                }}
                className="flex-1 px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 font-medium transition-colors"
                data-testid="button-activate-protocols"
              >
                <i className="fas fa-check mr-2"></i>Activate Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}