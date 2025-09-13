import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, Medicine, Prescription, Administration, MedicationLink } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { NextDoseCountdown } from "./next-dose-countdown";

// Helper function to calculate total doses on client side
function calculateTotalDoses(periodicity: string, duration: string | null): number | null {
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
}

// Helper function to calculate remaining doses for a prescription
function calculateRemainingDoses(prescription: Prescription, administrations: Administration[]): string {
  // If it's PRN/as needed, show PRN
  if (prescription.periodicity.toLowerCase().includes('as needed') || 
      prescription.periodicity.toLowerCase().includes('prn')) {
    return 'PRN';
  }
  
  // Use server-calculated totalDoses if available, otherwise calculate on client side
  let totalDoses = prescription.totalDoses;
  if (totalDoses === null || totalDoses === undefined) {
    totalDoses = calculateTotalDoses(prescription.periodicity, prescription.duration);
  }
  
  // If we still can't calculate total doses, show unknown state
  if (totalDoses === null || totalDoses === undefined) {
    return 'Unknown';
  }
  
  // Count administered doses for this prescription (primary method)
  let administeredCount = administrations.filter(admin => 
    admin.prescriptionId === prescription.id && (admin.status === 'administered' || admin.status === 'success')
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
  
  const remaining = totalDoses - administeredCount;
  return `Doses Left: ${Math.max(0, remaining)}`;
}

// Helper function to check if a medication should be considered complete
function isCompleteBasedOnDoses(prescription: Prescription, administrations: Administration[]): boolean {
  // Check if already marked complete in database
  if (prescription.completed === 1) {
    return true;
  }
  
  // Don't mark PRN medications as complete
  if (prescription.periodicity.toLowerCase().includes('as needed') || 
      prescription.periodicity.toLowerCase().includes('prn')) {
    return false;
  }
  
  // Count administered doses
  let administeredCount = administrations.filter(admin => 
    admin.prescriptionId === prescription.id && (admin.status === 'administered' || admin.status === 'success')
  ).length;
  
  // Fallback for legacy data
  if (administeredCount === 0) {
    administeredCount = administrations.filter(admin => 
      admin.patientId === prescription.patientId && 
      admin.medicineId === prescription.medicineId && 
      (admin.status === 'administered' || admin.status === 'success') &&
      !admin.prescriptionId
    ).length;
  }
  
  // Check for "once" frequency medications that have been administered (allow route/method qualifiers but exclude temporal schedules)
  const p = prescription.periodicity.trim();
  const temporal = /\b(daily|weekly|monthly|every|each|per|a\s+(?:day|week|month|year)|q(?:d|od|w|mo)|q\d+(?:h|d)|\d+\s*(?:\/|x)\s*(?:day|week|month)|\d+\s*times\s*(?:daily|weekly|monthly))\b/i;
  const isOneTime = (/^(?:single[-\s]?dose|one[-\s]?time)\b/i.test(p) || /^once\b/i.test(p)) && !temporal.test(p);
  if (isOneTime && administeredCount > 0) {
    return true;
  }
  
  // Check if all doses have been administered
  let totalDoses = prescription.totalDoses;
  if (totalDoses === null || totalDoses === undefined) {
    totalDoses = calculateTotalDoses(prescription.periodicity, prescription.duration);
  }
  
  if (totalDoses && totalDoses > 0 && administeredCount >= totalDoses) {
    return true;
  }
  
  return false;
}

type LogEntry = {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
};

type ConfirmationStep = 'patient' | 'medication' | 'completed';

interface DoubleConfirmationMedicationAdminProps {
  patient: Patient;
}

export function DoubleConfirmationMedicationAdmin({ patient }: DoubleConfirmationMedicationAdminProps) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [currentStep, setCurrentStep] = useState<ConfirmationStep>('patient');
  const [confirmedPatient, setConfirmedPatient] = useState<Patient | null>(null);
  const [pendingMedicineId, setPendingMedicineId] = useState<string>('');
  const [showPainAssessment, setShowPainAssessment] = useState(false);
  const [painAssessmentData, setPainAssessmentData] = useState<any>(null);
  const [showCollectionBlock, setShowCollectionBlock] = useState(false);
  const [showFollowUpBlock, setShowFollowUpBlock] = useState(false);
  const [blockedMedicine, setBlockedMedicine] = useState<Medicine | null>(null);
  const [blockReason, setBlockReason] = useState<string>('');
  const [triggerMedicine, setTriggerMedicine] = useState<string>('');
  
  const patientScannerRef = useRef<HTMLInputElement>(null);
  const medScannerRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Focus appropriate scanner based on current step
  useEffect(() => {
    if (currentStep === 'patient') {
      patientScannerRef.current?.focus();
    } else if (currentStep === 'medication') {
      medScannerRef.current?.focus();
    }
  }, [currentStep]);

  // Get prescriptions for this patient
  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['/api/patients', patient.id, 'prescriptions'],
  });

  // Get all medicines for lookup
  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines'],
  });

  // Get administrations for this patient
  const { data: administrations = [], refetch: refetchAdministrations } = useQuery<Administration[]>({
    queryKey: ['/api/patients', patient.id, 'administrations'],
    staleTime: 0, // Always treat data as stale to ensure fresh fetches
    gcTime: 0, // Don't cache data to prevent stale reads
  });

  // Get time simulation status for accurate time calculations
  const { data: timeStatus } = useQuery<{currentTime: Date, isSimulating: boolean}>({
    queryKey: ['/api/time-simulation/status'],
    refetchInterval: 10000,
  });

  // Fetch medication links for trigger medicine 10000046 (Hepatitis B vaccine newborn)
  const { data: medicationLinks = [], isLoading: medicationLinksLoading, error: medicationLinksError } = useQuery<MedicationLink[]>({
    queryKey: ['/api/medication-links', '10000046'],
    queryFn: () => apiRequest('/api/medication-links?triggerMedicineId=10000046', 'GET'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3, // Retry failed requests
  });

  // Helper function to dynamically detect if a medicine is part of a protocol
  const isProtocolMedicine = (medicineId: string): boolean => {
    // If medicationLinks data is unavailable, fall back to known protocol medicines
    if (medicationLinksError || medicationLinksLoading || !medicationLinks.length) {
      return medicineId === '10000069' || medicineId === '10000070';
    }
    
    // Check if this medicine has any links where it's a follow-up to trigger 10000046
    return medicationLinks.some(link => 
      link.triggerMedicineId === '10000046' && link.followMedicineId === medicineId
    );
  };

  // Helper function to get protocol delay information for a medicine
  const getProtocolDelayInfo = (medicineId: string) => {
    // Define default delays for known protocol medicines as fallback
    const defaultProtocolDelays: { [key: string]: number } = {
      '10000069': 30 * 24 * 60, // 30 days in minutes
      '10000070': 180 * 24 * 60, // 180 days in minutes
    };
    
    const link = medicationLinks.find(link => 
      link.triggerMedicineId === '10000046' && link.followMedicineId === medicineId
    );
    
    // Use link data if available, otherwise fall back to default delays
    const delayMinutes = link?.delayMinutes ?? defaultProtocolDelays[medicineId] ?? 0;
    
    return {
      hasLink: !!link || (medicineId in defaultProtocolDelays),
      delayMinutes: delayMinutes,
      triggerMedicineId: link?.triggerMedicineId || '10000046'
    };
  };

  // Helper function to calculate time remaining for protocol delay
  const calculateProtocolTimeRemaining = (triggerTime: Date, delayMinutes: number) => {
    const requiredDelayMs = delayMinutes * 60 * 1000;
    // Allow collection 1 hour before delay expires (subtract 1 hour)
    const dueTime = new Date(triggerTime.getTime() + requiredDelayMs - (60 * 60 * 1000));
    const now = timeStatus?.isSimulating ? new Date(timeStatus.currentTime) : new Date();
    
    if (now >= dueTime) {
      return null; // Ready for collection
    }
    
    const timeLeft = dueTime.getTime() - now.getTime();
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeDisplay;
    if (days > 0) {
      timeDisplay = `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      timeDisplay = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      timeDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    return timeDisplay;
  };

  // Function to check if a medication can be collected (similar to MedPyxis logic)
  const canCollectMedication = (prescription: Prescription) => {
    // Check if prescription is completed
    if (isCompleteBasedOnDoses(prescription, administrations)) {
      return { allowed: false, reason: 'This prescription has been completed and no more doses are needed.' };
    }

    const periodicity = prescription.periodicity || '';
    const lower = periodicity.toLowerCase();
    
    // PRN medications can always be collected
    if (lower.includes('prn') || lower.includes('needed') || lower.includes('necessary')) {
      return { allowed: true, reason: null };
    }
    
    // Continuous medications can always be collected
    if (lower.includes('continuous') || lower.includes('ongoing')) {
      return { allowed: true, reason: null };
    }
    
    // Dynamic protocol delay check using medicationLinks data
    if (isProtocolMedicine(prescription.medicineId)) {
      const triggerAdmin = administrations.find(adm => 
        adm.medicineId === '10000046' && (adm.status === 'administered' || adm.status === 'success')
      );
      
      if (!triggerAdmin || !triggerAdmin.administeredAt) {
        return { 
          allowed: false, 
          reason: 'Trigger medication (10000046) must be administered first.' 
        };
      }
      
      const delayInfo = getProtocolDelayInfo(prescription.medicineId);
      
      if (delayInfo.hasLink && delayInfo.delayMinutes > 0) {
        const triggerTime = new Date(triggerAdmin.administeredAt);
        const timeLeft = calculateProtocolTimeRemaining(triggerTime, delayInfo.delayMinutes);
        
        if (timeLeft) {
          return { 
            allowed: false, 
            reason: `Collection window opens in ${timeLeft}.`,
            timeLeft: timeLeft
          };
        }
      }
    }
    
    return { allowed: true, reason: null };
  };

  // Centralized UI status function to ensure consistent status display across all rendering paths
  const getStatus = (prescription: Prescription) => {
    // Check if medication is completed first (highest priority)
    if (isCompleteBasedOnDoses(prescription, administrations)) {
      return {
        type: 'complete',
        element: (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">
            <i className="fas fa-check mr-1"></i>
            Completed
          </span>
        )
      };
    }

    // Check if medication has been successfully administered
    const successfulAdmin = administrations.find(
      adm => adm.medicineId === prescription.medicineId && (adm.status === 'administered' || adm.status === 'success')
    );

    // If already administered (but not completed), show countdown for next dose
    if (successfulAdmin && successfulAdmin.administeredAt) {
      return {
        type: 'countdown',
        element: (
          <NextDoseCountdown 
            lastAdministeredAt={successfulAdmin.administeredAt}
            periodicity={prescription.periodicity}
          />
        )
      };
    }

    // Use centralized canCollectMedication logic for all other cases
    const collectionResult = canCollectMedication(prescription);
    
    // Show protocol delay if medication is blocked due to time delay
    if (!collectionResult.allowed && collectionResult.timeLeft) {
      return {
        type: 'delay',
        element: (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <i className="fas fa-hourglass-half mr-1"></i>
            Delay: {collectionResult.timeLeft} left
          </span>
        )
      };
    }
    
    // Show blocked if medication cannot be collected for other reasons
    if (!collectionResult.allowed && collectionResult.reason) {
      // For trigger not administered, show "Pending trigger"
      if (collectionResult.reason.includes('must be administered first')) {
        return {
          type: 'pending',
          element: (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              <i className="fas fa-link mr-1"></i>
              Pending trigger
            </span>
          )
        };
      }
      
      // For completed prescriptions - use pink styling to match card
      if (collectionResult.reason.includes('completed')) {
        return {
          type: 'complete',
          element: (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">
              <i className="fas fa-check mr-1"></i>
              Completed
            </span>
          )
        };
      }
      
      // For other blocking reasons
      return {
        type: 'blocked',
        element: (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            Blocked
          </span>
        )
      };
    }
    
    // For medicines that can be collected (including PRN and ready protocol medicines)
    return {
      type: 'due',
      element: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <i className="fas fa-clock mr-1"></i>
          Due now
        </span>
      )
    };
  };

  const createAdministrationMutation = useMutation({
    mutationFn: async (data: { patientId: string; medicineId: string; prescriptionId?: string; status: string; message: string }) => {
      const result = await apiRequest('/api/administrations', 'POST', data);
      return result;
    },
    onSuccess: (result) => {
      // Invalidate all related queries to update the UI properly
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'administrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medication-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medication-links', '10000046'] });
    },
    onError: (error) => {
      addLogEntry(`ERROR: Failed to save administration - ${error.message}`, 'error');
    },
  });

  const addLogEntry = (message: string, type: LogEntry['type']) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prevLog => [{ message, type, timestamp }, ...prevLog]);
  };

  // Helper function to get medication link delay for a specific follow-up medicine
  const getMedicationLinkDelay = (followUpMedicineId: string): number | null => {
    const link = medicationLinks.find((link: MedicationLink) => 
      link.triggerMedicineId === '10000046' && link.followMedicineId === followUpMedicineId
    );
    return link ? link.delayMinutes : null;
  };

  // Helper function to format delay minutes into display text
  const formatDelayDisplay = (delayMinutes: number): string => {
    const minutes = Math.floor(delayMinutes);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(minutes / 1440);
    
    // Show minutes for very short delays
    if (minutes < 60) {
      return `${minutes}m`;
    }
    // Show hours for delays under 24 hours
    else if (hours < 24) {
      return `${hours}h`;
    }
    // Show days for delays under 60 days
    else if (days < 60) {
      return `${days}d`;
    }
    // Show months only for delays 60+ days, using floor to avoid rounding up
    else {
      const months = Math.floor(days / 30);
      return `${months}mo`;
    }
  };

  // Helper function to select the active prescription when multiple prescriptions exist for same medicine
  const selectActivePrescription = (prescriptions: Prescription[]): Prescription | null => {
    if (prescriptions.length === 0) return null;
    if (prescriptions.length === 1) return prescriptions[0];
    
    const now = timeStatus?.currentTime ? new Date(timeStatus.currentTime) : new Date();
    
    // First, try to find prescriptions that are currently active (within date range)
    const activePrescriptions = prescriptions.filter(p => {
      const startDate = p.startDate ? new Date(p.startDate) : null;
      const endDate = p.endDate ? new Date(p.endDate) : null;
      
      const isAfterStart = !startDate || now >= startDate;
      const isBeforeEnd = !endDate || now <= endDate;
      
      return isAfterStart && isBeforeEnd;
    });
    
    if (activePrescriptions.length > 0) {
      // SECURITY FIX: Use deterministic sorting based on startDate instead of invalid new Date(id)
      // Sort by startDate (most recent first), then by prescription ID as tiebreaker for consistency
      return activePrescriptions.sort((a, b) => {
        const startDateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const startDateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        
        // Sort by startDate descending (newest first)
        if (startDateA !== startDateB) {
          return startDateB - startDateA;
        }
        
        // If startDates are equal, use prescription ID as consistent tiebreaker
        return b.id.localeCompare(a.id);
      })[0];
    }
    
    // If no active prescriptions, return the one with the most recent startDate
    // SECURITY FIX: Use deterministic sorting based on startDate instead of invalid new Date(id)
    return prescriptions.sort((a, b) => {
      const startDateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const startDateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      
      // Sort by startDate descending (newest first)
      if (startDateA !== startDateB) {
        return startDateB - startDateA;
      }
      
      // If startDates are equal, use prescription ID as consistent tiebreaker
      return b.id.localeCompare(a.id);
    })[0];
  };

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
      intervalHours = 6;
    } else {
      intervalHours = 6; // Default to 6 hours
    }
    
    const nextDoseTime = new Date(lastDose.getTime() + intervalHours * 60 * 60 * 1000);
    return now >= nextDoseTime;
  };

  const handlePatientScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedId = e.currentTarget.value.trim();
      if (!scannedId) return;

      if (scannedId === patient.id) {
        setConfirmedPatient(patient);
        setCurrentStep('medication');
        addLogEntry(`✓ Patient confirmed: ${patient.name} (${patient.id})`, 'success');
      } else {
        addLogEntry(`ERROR: Patient ID mismatch. Expected ${patient.id}, scanned ${scannedId}`, 'error');
      }
      
      e.currentTarget.value = '';
    }
  };

  const handleMedicationScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        const errorMessage = `ERROR: ${medicine.name} is not prescribed for this patient.`;
        addLogEntry(errorMessage, 'error');
        createAdministrationMutation.mutate({
          patientId: patient.id,
          medicineId: medId,
          status: 'error',
          message: errorMessage
        });
      } else {
        // Refresh administrations data and proceed with check
        refetchAdministrations().then(async () => {
          // Fix prescription selection ambiguity: Select active prescription or most recent
          const matchingPrescriptions = prescriptions.filter(p => p.medicineId === medId);
          const currentPrescription = selectActivePrescription(matchingPrescriptions);
          if (currentPrescription) {
            try {
              // Check if this prescription is part of a protocol (follow-up)
              const protocolResponse = await apiRequest(`/api/patients/${patient.id}/protocols/check-followup`, 'POST', {
                prescriptionId: currentPrescription.id
              });
              
              if (protocolResponse.isFollowUp) {
                // 1) Trigger not yet administered
                if (!protocolResponse.triggerAdministered) {
                  const triggerMedicine = medicines.find(m => m.id === protocolResponse.triggerMedicineId);
                  const blockMessage = `BLOCKED: ${medicine.name} administration blocked - trigger medication ${triggerMedicine?.name || 'Unknown'} must be administered first`;
                  addLogEntry(blockMessage, 'error');
                  createAdministrationMutation.mutate({
                    patientId: patient.id,
                    medicineId: medId,
                    prescriptionId: currentPrescription.id,
                    status: 'blocked',
                    message: blockMessage
                  });
                  setBlockedMedicine(medicine);
                  setBlockReason('trigger_not_administered');
                  setTriggerMedicine(triggerMedicine?.name || 'Unknown Medicine');
                  setShowFollowUpBlock(true);
                  e.currentTarget.value = '';
                  return;
                }
                // 2) Trigger given but follow-up too early
                if (protocolResponse.isEarly) {
                  const triggerMedicine = medicines.find(m => m.id === protocolResponse.triggerMedicineId);
                  const blockMessage = `BLOCKED: ${medicine.name} too early - must wait ${protocolResponse.timeLeftDisplay || ''} (due ${protocolResponse.dueAt ? new Date(protocolResponse.dueAt).toLocaleString() : 'unknown'})`;
                  addLogEntry(blockMessage, 'error');
                  createAdministrationMutation.mutate({
                    patientId: patient.id,
                    medicineId: medId,
                    prescriptionId: currentPrescription.id,
                    status: 'blocked',
                    message: blockMessage
                  });
                  setBlockedMedicine(medicine);
                  setBlockReason('too_early');
                  setTriggerMedicine(triggerMedicine?.name || 'Unknown Medicine');
                  setShowFollowUpBlock(true);
                  e.currentTarget.value = '';
                  return;
                }
              }
            } catch (error) {
              console.error('Protocol validation failed - blocking administration for safety:', error);
              const blockMessage = `BLOCKED: ${medicine.name} administration blocked - unable to verify trigger status for safety`;
              addLogEntry(blockMessage, 'error');
              createAdministrationMutation.mutate({
                patientId: patient.id,
                medicineId: medId,
                prescriptionId: currentPrescription.id,
                status: 'blocked',
                message: blockMessage
              });
              setBlockedMedicine(medicine);
              setBlockReason('validation_failed');
              setShowFollowUpBlock(true);
              return;
            }
          }
          
          // Check for recent medication collection (within last hour)
          // Use real system time for collection check to avoid simulation conflicts
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          const recentCollection = administrations.find(
            adm => adm.medicineId === medId && 
                   adm.status === 'collected' &&
                   adm.administeredAt && new Date(adm.administeredAt) > oneHourAgo
          );
        
          if (!recentCollection) {
            // Log blocked administration for grading purposes
            const blockMessage = `BLOCKED: ${medicine.name} administration blocked - collection not completed within last hour`;
            addLogEntry(blockMessage, 'error');
            createAdministrationMutation.mutate({
              patientId: patient.id,
              medicineId: medId,
              prescriptionId: currentPrescription?.id,
              status: 'blocked',
              message: blockMessage
            });
            
            // Show blocking popup
            setBlockedMedicine(medicine);
            setShowCollectionBlock(true);
            return;
          }
          
          // Check if medicine has been successfully administered before
          const existingAdmin = administrations.find(
            adm => adm.medicineId === medId && adm.status === 'administered'
          );
        
          if (existingAdmin) {
            // Check if medication is due for re-administration based on periodicity
            const prescription = currentPrescription;
            if (prescription && isDueDoseReady(existingAdmin.administeredAt || new Date(), prescription.periodicity)) {
              // Medication is due - allow re-administration
              const successMessage = `SUCCESS: Administered '${medicine.name}' (next scheduled dose).`;
              addLogEntry(successMessage, 'success');
              createAdministrationMutation.mutate({
                patientId: patient.id,
                medicineId: medId,
                prescriptionId: currentPrescription?.id,
                status: 'administered',
                message: successMessage
              });
              
              // Check if it's a pain killer to trigger pain assessment
              if (medicine.category === 'pain-killer') {
                // Check if pain assessment was done within last 30 minutes
                checkRecentPainAssessment(medicine, patient);
              }
              
              setCurrentStep('completed');
            } else {
              const warningMessage = `WARNING: ${medicine.name} was recently administered. Early re-administration logged.`;
              addLogEntry(warningMessage, 'warning');
              createAdministrationMutation.mutate({
                patientId: patient.id,
                medicineId: medId,
                prescriptionId: currentPrescription?.id,
                status: 'warning',
                message: warningMessage
              });
              setCurrentStep('completed');
            }
          } else {
            const successMessage = `SUCCESS: Administered '${medicine.name}'.`;
            addLogEntry(successMessage, 'success');
            createAdministrationMutation.mutate({
              patientId: patient.id,
              medicineId: medId,
              prescriptionId: currentPrescription?.id,
              status: 'administered',
              message: successMessage
            });
            
            // Check if it's a pain killer to trigger pain assessment
            if (medicine.category === 'pain-killer') {
              // Check if pain assessment was done within last 30 minutes
              checkRecentPainAssessment(medicine, patient);
            }
            
            setCurrentStep('completed');
          }
        });
      }
      
      e.currentTarget.value = '';
    }
  };

  const checkRecentPainAssessment = async (medicine: Medicine, patient: Patient) => {
    try {
      // Check if pain assessment was completed within last 30 minutes
      const thirtyMinutesAgo = timeStatus?.currentTime ? 
        new Date(new Date(timeStatus.currentTime).getTime() - 30 * 60 * 1000) : 
        new Date(Date.now() - 30 * 60 * 1000);
      
      const response = await fetch(`/api/patients/${patient.id}/assessments`);
      const assessments = await response.json();
      
      // Look for recent pain scale assessments
      const recentPainAssessment = assessments.find((assessment: any) => 
        assessment.assessmentType === 'pain_scale' &&
        new Date(assessment.assessedAt + ' EST') > thirtyMinutesAgo
      );
      
      if (recentPainAssessment) {
        // Pain assessment was done recently, skip prompt
        addLogEntry(`Pain assessment skipped - completed ${Math.round((new Date(timeStatus?.currentTime || Date.now()).getTime() - new Date(recentPainAssessment.assessedAt + ' EST').getTime()) / (1000 * 60))} minutes ago`, 'info');
      } else {
        // No recent pain assessment, show prompt
        setPainAssessmentData({ medicine, patient });
        setTimeout(() => {
          setShowPainAssessment(true);
        }, 5000); // 5 second delay
      }
    } catch (error) {
      console.error('Failed to check recent pain assessments:', error);
      // If check fails, show assessment anyway for safety
      setPainAssessmentData({ medicine, patient });
      setTimeout(() => {
        setShowPainAssessment(true);
      }, 5000);
    }
  };

  const resetProcess = () => {
    setCurrentStep('patient');
    setConfirmedPatient(null);
    setPendingMedicineId('');
    setLog([]);
  };

  const prescribedMedicines = prescriptions.map(prescription => {
    const medicine = medicines.find(m => m.id === prescription.medicineId);
    return { ...prescription, medicine };
  }).filter(item => item.medicine);

  return (
    <div className="space-y-6">
      {/* Double Confirmation Progress */}
      <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
        <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
          <i className="fas fa-shield-alt text-medical-primary mr-2"></i>Double Confirmation Medication Administration
        </h3>
        
        <div className="flex items-center space-x-4 mb-6">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            currentStep === 'patient' ? 'bg-blue-100 border-2 border-blue-500' : 
            confirmedPatient ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'
          }`}>
            <span className={`text-sm font-medium ${
              currentStep === 'patient' ? 'text-blue-700' : 
              confirmedPatient ? 'text-green-700' : 'text-gray-600'
            }`}>
              1. Scan Patient
            </span>
            {confirmedPatient && <i className="fas fa-check text-green-600"></i>}
          </div>
          
          <div className="flex-1 h-0.5 bg-gray-300"></div>
          
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            currentStep === 'medication' ? 'bg-blue-100 border-2 border-blue-500' : 
            currentStep === 'completed' ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'
          }`}>
            <span className={`text-sm font-medium ${
              currentStep === 'medication' ? 'text-blue-700' : 
              currentStep === 'completed' ? 'text-green-700' : 'text-gray-600'
            }`}>
              2. Scan Medication
            </span>
            {currentStep === 'completed' && <i className="fas fa-check text-green-600"></i>}
          </div>
        </div>

        {/* Current Step Instructions */}
        {currentStep === 'patient' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-user text-blue-600"></i>
              <span className="font-medium text-blue-800">Step 1: Scan Patient Barcode</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Scan the patient's wristband barcode to confirm you have the correct patient: <strong>{patient.name}</strong>
            </p>
          </div>
        )}

        {currentStep === 'medication' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-pills text-blue-600"></i>
              <span className="font-medium text-blue-800">Step 2: Scan Medication Barcode</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Now scan the medication barcode to confirm the correct medication for <strong>{confirmedPatient?.name}</strong>
            </p>
          </div>
        )}

        {currentStep === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-green-600"></i>
              <span className="font-medium text-green-800">Administration Complete</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Medication administration has been logged. Click "Start New Administration" to continue.
            </p>
          </div>
        )}

        {/* Scanner Inputs */}
        <div className="space-y-4">
          {currentStep === 'patient' && (
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                Patient Barcode Scanner
              </label>
              <div className="flex gap-3 items-center">
                <input
                  ref={patientScannerRef}
                  type="text"
                  placeholder="Scan patient barcode here..."
                  onKeyPress={handlePatientScan}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/[^0-9]/g, '').slice(0, 12);
                  }}
                  maxLength={12}
                  pattern="[0-9]{1,12}"
                  inputMode="numeric"
                  className="flex-1 px-4 py-3 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent text-lg font-mono"
                  data-testid="input-patient-scanner"
                />
                <button
                  onClick={() => {
                    const input = patientScannerRef.current;
                    if (input && input.value.trim()) {
                      handlePatientScan({ key: 'Enter', currentTarget: input } as React.KeyboardEvent<HTMLInputElement>);
                    }
                  }}
                  disabled={!patientScannerRef.current?.value?.trim()}
                  className="px-4 py-3 bg-medical-primary hover:bg-medical-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  data-testid="button-submit-patient-scan"
                >
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {currentStep === 'medication' && (
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                Medication Barcode Scanner
              </label>
              <div className="flex gap-3 items-center">
                <input
                  ref={medScannerRef}
                  type="text"
                  placeholder="Scan medication barcode here..."
                  onKeyPress={handleMedicationScan}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/[^0-9]/g, '').slice(0, 8);
                  }}
                  maxLength={8}
                  pattern="[0-9]{1,8}"
                  inputMode="numeric"
                  className="flex-1 px-4 py-3 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent text-lg font-mono"
                  data-testid="input-medication-scanner"
                />
                <button
                  onClick={() => {
                    const input = medScannerRef.current;
                    if (input && input.value.trim()) {
                      handleMedicationScan({ key: 'Enter', currentTarget: input } as React.KeyboardEvent<HTMLInputElement>);
                    }
                  }}
                  disabled={!medScannerRef.current?.value?.trim()}
                  className="px-4 py-3 bg-medical-primary hover:bg-medical-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  data-testid="button-submit-medication-scan"
                >
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {currentStep === 'completed' && (
            <button
              onClick={resetProcess}
              className="w-full px-4 py-3 bg-medical-primary text-white rounded-lg hover:bg-medical-primary-dark transition-colors font-medium"
              data-testid="button-start-new-administration"
            >
              Start New Administration
            </button>
          )}
        </div>
      </div>

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
              const successfulAdmin = administrations.find(
                adm => adm.medicineId === prescription.medicineId && adm.status === 'administered'
              );
              
              // Check for blocked/error administrations
              const blockedAdmin = administrations.find(
                adm => adm.medicineId === prescription.medicineId && (adm.status === 'error' || adm.status === 'blocked')
              );
              
              const isPrnMedication = prescription.periodicity.toLowerCase().includes('as needed') || 
                                     prescription.periodicity.toLowerCase().includes('prn');
              
              // Protocol delayed medications should never be overdue
              const isProtocolDelayed = isProtocolMedicine(prescription.medicineId) && !canCollectMedication(prescription).allowed;
              
              const isDueForNextDose = successfulAdmin ? 
                (isPrnMedication ? false : isDueDoseReady(successfulAdmin.administeredAt || new Date(), prescription.periodicity)) : 
                (!isPrnMedication && !isProtocolDelayed); // PRN meds and protocol delayed meds show as pending, not overdue
                
              const isAdministered = !!successfulAdmin && !isDueDoseReady(successfulAdmin.administeredAt || new Date(), prescription.periodicity);
              const isBlocked = !!blockedAdmin;
              
              // Check if prescription is completed (all doses administered)
              const isCompleted = isCompleteBasedOnDoses(prescription, administrations);
              
              return (
                <div 
                  key={prescription.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCompleted
                      ? 'bg-pink-50 border-pink-200'
                      : isProtocolDelayed
                      ? 'bg-orange-50 border-orange-200'
                      : isBlocked
                      ? 'bg-red-100 border-red-300'
                      : isAdministered 
                      ? 'bg-green-50 border-green-200' 
                      : isDueForNextDose 
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                  data-testid={`medicine-${prescription.medicineId}`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Show pink checkmark for completed prescriptions, regular dots for others */}
                    {isCompleted ? (
                      <div className="w-3 h-3 flex items-center justify-center">
                        <i className="fas fa-check text-pink-600 text-sm"></i>
                      </div>
                    ) : (
                      <div className={`w-3 h-3 rounded-full ${
                        isBlocked
                          ? 'bg-red-600'
                          : isAdministered 
                          ? 'bg-green-500' 
                          : isDueForNextDose 
                          ? 'bg-red-500'
                          : isProtocolDelayed
                          ? 'bg-orange-500'
                          : 'bg-amber-500'
                      }`}></div>
                    )}
                    <div>
                      <div className="font-medium text-medical-text-primary">
                        {prescription.medicine?.name}
                        {prescription.medicine?.category && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {prescription.medicine.category.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-medical-text-muted">
                        {prescription.dosage} • {prescription.periodicity} • {prescription.route}
                      </div>
                      {/* Show last administration time if available */}
                      {successfulAdmin && successfulAdmin.administeredAt && (
                        <div className="text-xs text-medical-text-muted mt-1 flex items-center space-x-3">
                          <span>
                            <i className="fas fa-clock mr-1"></i>
                            Last: {new Date(successfulAdmin.administeredAt).toLocaleString([], { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          <span>
                            <i className="fas fa-pills mr-1"></i>
                            {calculateRemainingDoses(prescription, administrations)}
                          </span>
                        </div>
                      )}
                      {/* Show blocked administration details */}
                      {blockedAdmin && blockedAdmin.administeredAt && (
                        <div className="text-xs text-red-700 mt-1">
                          <i className="fas fa-ban mr-1"></i>
                          Blocked: {new Date(blockedAdmin.administeredAt).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      isCompleted
                        ? 'text-pink-700'
                        : isBlocked
                        ? 'text-red-800'
                        : isAdministered 
                        ? 'text-green-700' 
                        : isDueForNextDose 
                        ? 'text-red-700'
                        : isProtocolDelayed
                        ? 'text-orange-700'
                        : 'text-amber-700'
                    }`}>
                      {isCompleted ? 'Completed' : isBlocked ? 'BLOCKED' : isAdministered ? 'Administered' : isDueForNextDose ? 'Overdue' : isProtocolDelayed ? 'Pending' : 'Pending'}
                    </div>
                    <div className="text-xs text-medical-text-muted">
                      ID: {prescription.medicineId}
                    </div>
                    {/* Use centralized status function for consistent UI display */}
                    <div className="mt-1">
                      {getStatus(prescription).element}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Administration Log */}
      {log.length > 0 && (
        <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
          <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
            <i className="fas fa-clipboard-list text-medical-primary mr-2"></i>Administration Log
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {log.map((entry, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg text-sm ${
                  entry.type === 'success' ? 'bg-green-50 border border-green-200' :
                  entry.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                  entry.type === 'error' ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                <span className="text-xs text-gray-500 mt-0.5">{entry.timestamp}</span>
                <span className={`flex-1 ${
                  entry.type === 'success' ? 'text-green-800' :
                  entry.type === 'warning' ? 'text-amber-800' :
                  entry.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collection Block Modal */}
      {showCollectionBlock && blockedMedicine && (
        <CollectionBlockModal
          medicine={blockedMedicine}
          onClose={() => {
            setShowCollectionBlock(false);
            setBlockedMedicine(null);
          }}
        />
      )}

      {/* Follow-up Block Modal */}
      {showFollowUpBlock && blockedMedicine && (
        <FollowUpBlockModal
          medicine={blockedMedicine}
          triggerMedicine={triggerMedicine}
          onClose={() => {
            setShowFollowUpBlock(false);
            setBlockedMedicine(null);
            setBlockReason('');
            setTriggerMedicine('');
          }}
        />
      )}

      {/* Pain Assessment Modal */}
      {showPainAssessment && painAssessmentData && (
        <PainAssessmentModal
          patient={painAssessmentData.patient}
          medicine={painAssessmentData.medicine}
          onClose={() => setShowPainAssessment(false)}
          onSubmit={(assessmentData) => {
            // Handle pain assessment submission
            console.log('Pain assessment submitted:', assessmentData);
            setShowPainAssessment(false);
          }}
        />
      )}
    </div>
  );
}

interface CollectionBlockModalProps {
  medicine: Medicine;
  onClose: () => void;
}

function CollectionBlockModal({ medicine, onClose }: CollectionBlockModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-700">
            <i className="fas fa-ban text-red-600 mr-2"></i>Administration Blocked
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            data-testid="button-close-collection-block"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-3">
            <i className="fas fa-exclamation-triangle text-red-600 mt-1"></i>
            <div>
              <p className="text-sm text-red-800 font-medium">
                Medication administration blocked due to collection not completed
              </p>
              <p className="text-sm text-red-700 mt-2">
                <strong>{medicine.name}</strong> must be collected before administration
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary-dark transition-colors"
            data-testid="button-acknowledge-collection-block"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

interface FollowUpBlockModalProps {
  medicine: Medicine;
  triggerMedicine: string;
  onClose: () => void;
}

function FollowUpBlockModal({ medicine, triggerMedicine, onClose }: FollowUpBlockModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-700">
            <i className="fas fa-link text-red-600 mr-2"></i>Follow-up Blocked
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            data-testid="button-close-followup-block"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-3">
            <i className="fas fa-exclamation-triangle text-red-600 mt-1"></i>
            <div>
              <p className="text-sm text-red-800 font-medium">
                Follow-up medication administration blocked
              </p>
              <p className="text-sm text-red-700 mt-2">
                <strong>{medicine.name}</strong> cannot be administered until the initial dose of <strong>{triggerMedicine}</strong> has been given.
              </p>
              <p className="text-xs text-red-600 mt-2">
                This is part of a medication protocol sequence that requires the trigger medication to be administered first.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary-dark transition-colors"
            data-testid="button-acknowledge-followup-block"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

interface PainAssessmentModalProps {
  patient: Patient;
  medicine: Medicine;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

function PainAssessmentModal({ patient, medicine, onClose, onSubmit }: PainAssessmentModalProps) {
  const [painLevel, setPainLevel] = useState<number>(0);
  const [painLocation, setPainLocation] = useState<string>('');
  const [painType, setPainType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Save pain assessment to database
      await apiRequest(`/api/patients/${patient.id}/assessments`, 'POST', {
        assessmentType: 'pain_scale',
        score: painLevel,
        description: `Pain Location: ${painLocation}\nPain Type: ${painType}`,
        findings: `Administered ${medicine.name}. ${notes}`,
        assessedBy: 'system' // Could be updated to current user if available
      });
      
      onSubmit({
        patientId: patient.id,
        medicineId: medicine.id,
        painLevel,
        painLocation,
        painType,
        notes,
        assessedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save pain assessment:', error);
      alert('Failed to save pain assessment. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-medical-text-primary">
            <i className="fas fa-thermometer-half text-medical-primary mr-2"></i>Pain Assessment
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            data-testid="button-close-pain-assessment"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{medicine.name}</strong> was administered to <strong>{patient.name}</strong>.
            Please complete the pain assessment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-medical-text-secondary mb-2">
              Pain Level (0-10)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(parseInt(e.target.value))}
                className="flex-1"
                data-testid="input-pain-level"
              />
              <span className="w-8 text-center font-semibold text-medical-primary">
                {painLevel}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>No Pain</span>
              <span>Worst Pain</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-medical-text-secondary mb-2">
              Pain Location
            </label>
            <input
              type="text"
              value={painLocation}
              onChange={(e) => setPainLocation(e.target.value)}
              placeholder="e.g., lower back, abdomen, chest"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
              data-testid="input-pain-location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-medical-text-secondary mb-2">
              Pain Type
            </label>
            <select
              value={painType}
              onChange={(e) => setPainType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
              data-testid="select-pain-type"
            >
              <option value="">Select pain type</option>
              <option value="sharp">Sharp</option>
              <option value="dull">Dull</option>
              <option value="throbbing">Throbbing</option>
              <option value="burning">Burning</option>
              <option value="cramping">Cramping</option>
              <option value="aching">Aching</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-medical-text-secondary mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional observations about the patient's pain..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
              data-testid="textarea-pain-notes"
            ></textarea>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              data-testid="button-cancel-pain-assessment"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary-dark transition-colors"
              data-testid="button-submit-pain-assessment"
            >
              Submit Assessment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}