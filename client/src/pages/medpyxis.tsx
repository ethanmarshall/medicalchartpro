import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Patient, type Prescription, type Medicine, type Administration } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/admin-dashboard";
import { TimeSimulationModal } from "@/components/time-simulation";
import { AlertMenuButton } from "@/components/alert-menu-button";
import { NextDoseCountdown } from "@/components/next-dose-countdown";
import { User, LogOut } from "lucide-react";

// Helper function to calculate remaining doses for a prescription with fallback for legacy data
function calculateRemainingDoses(prescription: Prescription, administrations: Administration[]): string {
  // If it's PRN/as needed, don't show dose count
  if (prescription.periodicity.toLowerCase().includes('as needed') || 
      prescription.periodicity.toLowerCase().includes('prn') || 
      prescription.totalDoses === null) {
    return 'PRN';
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
  
  const remaining = (prescription.totalDoses || 0) - administeredCount;
  return `Doses Left: ${Math.max(0, remaining)}`;
}

// Helper function to check if a prescription is completed based on doses administered
function isCompleteBasedOnDoses(prescription: Prescription, administrations: Administration[]): boolean {
  // First check database completion flag
  if (prescription.completed === 1) {
    return true;
  }
  
  // Don't auto-complete PRN medications
  if (prescription.periodicity?.toLowerCase().includes('prn') || 
      prescription.periodicity?.toLowerCase().includes('as needed')) {
    return false;
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
    // Calculate total doses using the same logic as before
    const periodicityLower = prescription.periodicity.toLowerCase();
    if (periodicityLower.includes('daily') || periodicityLower.includes('q24h') || periodicityLower.includes('every 24')) {
      totalDoses = prescription.duration ? parseInt(prescription.duration.split(' ')[0]) || null : null;
    } else if (periodicityLower.includes('twice daily') || periodicityLower.includes('bid') || periodicityLower.includes('q12h')) {
      totalDoses = prescription.duration ? (parseInt(prescription.duration.split(' ')[0]) || 0) * 2 : null;
    } else if (periodicityLower.includes('three times daily') || periodicityLower.includes('tid') || periodicityLower.includes('q8h')) {
      totalDoses = prescription.duration ? (parseInt(prescription.duration.split(' ')[0]) || 0) * 3 : null;
    } else if (periodicityLower.includes('four times daily') || periodicityLower.includes('qid') || periodicityLower.includes('q6h')) {
      totalDoses = prescription.duration ? (parseInt(prescription.duration.split(' ')[0]) || 0) * 4 : null;
    }
  }
  
  if (totalDoses && administeredCount >= totalDoses) {
    return true;
  }
  
  return false;
}

export default function MedPyxis() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [patientBarcode, setPatientBarcode] = useState("");
  const [medicationBarcode, setMedicationBarcode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [showTimingWarning, setShowTimingWarning] = useState(false);
  const [warningPrescription, setWarningPrescription] = useState<Prescription | null>(null);
  const [timingWarningMessage, setTimingWarningMessage] = useState("");
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showTimeSimulation, setShowTimeSimulation] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pendingAction, setPendingAction] = useState<'admin' | 'time' | ''>('');
  const scannerRef = useRef<HTMLInputElement>(null);
  const medicationScannerRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
  });

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logoutMutation.mutate();
    }
  };

  useEffect(() => {
    scannerRef.current?.focus();
  }, []);

  // Get all patients for dropdown
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  // Get all medicines for lookup
  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines'],
  });

  // Get prescriptions for selected patient
  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['/api/patients', selectedPatient?.id, 'prescriptions'],
    enabled: !!selectedPatient,
  });

  // Get administrations for selected patient to show last collection times
  const { data: administrations = [] } = useQuery<Administration[]>({
    queryKey: ['/api/patients', selectedPatient?.id, 'administrations'],
    enabled: !!selectedPatient,
  });

  // Get medication links for protocol delay calculations - use specific trigger query
  const { data: medicationLinks = [] } = useQuery<any[]>({
    queryKey: ['/api/medication-links', '10000046'],
    queryFn: () => apiRequest('/api/medication-links?triggerMedicineId=10000046', 'GET'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3,
  });

  const handlePatientScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedId = e.currentTarget.value.trim();
      if (!scannedId) return;

      const patient = patients.find(p => p.id === scannedId);
      if (patient) {
        setSelectedPatient(patient);
      } else {
        alert(`Patient with ID ${scannedId} not found`);
      }
      setPatientBarcode("");
    }
  };

  const handlePatientSubmit = () => {
    const scannedId = patientBarcode.trim();
    if (!scannedId) return;

    const patient = patients.find(p => p.id === scannedId);
    if (patient) {
      setSelectedPatient(patient);
    } else {
      alert(`Patient with ID ${scannedId} not found`);
    }
    setPatientBarcode("");
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
    }
  };

  const handlePrescriptionSelect = (prescription: Prescription) => {
    const collectionCheck = canCollectMedication(prescription);
    
    if (!collectionCheck.allowed) {
      setWarningPrescription(prescription);
      setTimingWarningMessage(collectionCheck.reason || '');
      setShowTimingWarning(true);
      return;
    }
    
    setSelectedPrescription(prescription);
    setMedicationBarcode("");
    setIsVerified(false);
    setVerificationError("");
    // Focus on medication scanner after a brief delay
    setTimeout(() => {
      medicationScannerRef.current?.focus();
    }, 100);
  };

  const handleContinueWithTiming = () => {
    if (warningPrescription) {
      setSelectedPrescription(warningPrescription);
      setMedicationBarcode("");
      setIsVerified(false);
      setVerificationError("");
      // Focus on medication scanner after a brief delay
      setTimeout(() => {
        medicationScannerRef.current?.focus();
      }, 100);
    }
    setShowTimingWarning(false);
    setWarningPrescription(null);
    setTimingWarningMessage("");
  };

  const handleCancelTiming = () => {
    setShowTimingWarning(false);
    setWarningPrescription(null);
    setTimingWarningMessage("");
  };

  // Create administration record when collection is complete
  const createAdministrationMutation = useMutation({
    mutationFn: async (data: { patientId: string; medicineId: string; status: string; message: string; prescriptionId?: string }) => {
      return await apiRequest('/api/administrations', 'POST', data);
    },
    onSuccess: (result, variables) => {
      // Invalidate administrations query to refresh the data using the patientId from the variables
      queryClient.invalidateQueries({ queryKey: ['/api/patients', variables.patientId, 'administrations'] });
      // Also invalidate medication alerts
      queryClient.invalidateQueries({ queryKey: ['/api/medication-alerts'] });
    },
  });

  const handleCollectionComplete = () => {
    if (!selectedPrescription || !selectedPatient) return;

    const medicine = medicines.find(m => m.id === selectedPrescription.medicineId);
    const collectionMessage = `MedPyxis: Collected '${medicine?.name}' from Drawer ${medicine?.drawer}, Bin ${medicine?.bin} - Ready for administration`;

    // Store patient ID before resetting state (for cache invalidation)
    const patientId = selectedPatient.id;

    // Create collection record (NOT administration)
    createAdministrationMutation.mutate({
      patientId: patientId,
      medicineId: selectedPrescription.medicineId,
      prescriptionId: selectedPrescription.id,
      status: 'collected',
      message: collectionMessage
    });

    // Reset UI state
    setSelectedPrescription(null);
    setSelectedPatient(null);
  };

  const handleClose = () => {
    setSelectedPrescription(null);
    setMedicationBarcode("");
    setIsVerified(false);
    setVerificationError("");
  };

  // Admin functionality
  const handleProfileClick = () => {
    setShowMenuModal(true);
  };

  const handlePinSubmit = () => {
    if (pin === "112794" || pin === "0000") {
      setShowPinModal(false);
      if (pendingAction === 'admin') {
        setShowAdminDashboard(true);
      } else if (pendingAction === 'time') {
        setShowTimeSimulation(true);
      }
    } else {
      alert("Incorrect PIN. Access denied.");
    }
    setPin("");
    setPendingAction('');
  };

  const handleCloseAdminDashboard = () => {
    setShowAdminDashboard(false);
  };

  const handleCloseTimeSimulation = () => {
    setShowTimeSimulation(false);
  };

  const handleMenuSelection = (selection: 'admin' | 'time') => {
    setShowMenuModal(false);
    setPendingAction(selection);
    
    // Skip PIN for admin users accessing admin dashboard or time simulation
    if (selection === 'admin' && user?.role === 'admin') {
      setShowAdminDashboard(true);
      setPendingAction('');
    } else if (selection === 'time' && user?.role === 'admin') {
      setShowTimeSimulation(true);
      setPendingAction('');
    } else {
      setShowPinModal(true);
      setPin("");
    }
  };

  const handleMedicationScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedId = e.currentTarget.value.trim();
      if (!scannedId) return;

      if (scannedId === selectedPrescription?.medicineId) {
        setIsVerified(true);
        setVerificationError("");
      } else {
        setIsVerified(false);
        setVerificationError(`Incorrect medication scanned. Expected ID: ${selectedPrescription?.medicineId}`);
      }
    }
  };

  const handleMedicationSubmit = () => {
    const scannedId = medicationBarcode.trim();
    if (!scannedId) return;

    if (scannedId === selectedPrescription?.medicineId) {
      setIsVerified(true);
      setVerificationError("");
    } else {
      setIsVerified(false);
      setVerificationError(`Incorrect medication scanned. Expected ID: ${selectedPrescription?.medicineId}`);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getLastCollectionTime = (medicineId: string) => {
    const lastAdmin = administrations
      .filter(admin => admin.medicineId === medicineId && (admin.status === 'collected' || admin.status === 'administered'))
      .sort((a, b) => new Date(b.administeredAt || 0).getTime() - new Date(a.administeredAt || 0).getTime())[0];
    
    return lastAdmin?.administeredAt ? new Date(lastAdmin.administeredAt) : null;
  };


  const formatLastCollected = (date: Date | null) => {
    if (!date) return 'Never collected';
    
    // Validate the date
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // If diff is negative, it means the date is in the future (shouldn't happen)
    if (diff < 0) {
      return 'Just now';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} min ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const parsePeriodicityInterval = (periodicity: string): number | null => {
    const lower = periodicity.toLowerCase();
    
    // Handle PRN or as needed
    if (lower.includes('prn') || lower.includes('needed') || lower.includes('necessary')) {
      return null; // PRN medications don't have scheduled intervals
    }
    
    // Handle continuous
    if (lower.includes('continuous') || lower.includes('ongoing')) {
      return null; // Continuous medications don't have intervals
    }
    
    // Parse "every X hours/hrs/h" or "every X-Y hrs" patterns
    const everyHoursMatch = lower.match(/every\s+(\d+)\s*(hours?|hrs?|h)\b/);
    const everyRangeMatch = lower.match(/every\s+(\d+)-(\d+)\s+(hrs?|h)\b/);
    
    // Parse "qXh" patterns (e.g., "q6h", "q12h") 
    const qHourMatch = lower.match(/q\s*(\d+)\s*(h|hr|hrs)\b/);
    
    if (everyHoursMatch) {
      return parseInt(everyHoursMatch[1]) * 60 * 60 * 1000; // hours to milliseconds
    } else if (everyRangeMatch) {
      const minHours = parseInt(everyRangeMatch[1]); // Use minimum for safety
      return minHours * 60 * 60 * 1000; // hours to milliseconds
    } else if (qHourMatch) {
      return parseInt(qHourMatch[1]) * 60 * 60 * 1000; // hours to milliseconds
    }
    
    const everyMinutesMatch = lower.match(/every\s+(\d+)\s+minutes?/);
    if (everyMinutesMatch) {
      return parseInt(everyMinutesMatch[1]) * 60 * 1000; // minutes to milliseconds
    }
    
    // Parse "X times daily" or "X times a day"
    const timesPerDayMatch = lower.match(/(\d+)\s+times?\s+(daily|per\s+day|a\s+day)/);
    if (timesPerDayMatch) {
      const timesPerDay = parseInt(timesPerDayMatch[1]);
      return (24 * 60 * 60 * 1000) / timesPerDay; // distribute evenly across 24 hours
    }
    
    // Handle specific common patterns
    if (lower.includes('twice daily') || lower.includes('bid')) {
      return 12 * 60 * 60 * 1000; // 12 hours
    }
    
    if (lower.includes('three times daily') || lower.includes('tid')) {
      return 8 * 60 * 60 * 1000; // 8 hours
    }
    
    if (lower.includes('four times daily') || lower.includes('qid')) {
      return 6 * 60 * 60 * 1000; // 6 hours
    }
    
    if (lower.includes('once daily') || lower.includes('daily') || lower.includes('qd')) {
      return 24 * 60 * 60 * 1000; // 24 hours
    }
    
    // Default fallback for unrecognized patterns
    return null;
  };

  const getNextCollectionTime = (medicineId: string, periodicity: string) => {
    // Check if this is a protocol-delayed medication (like 10000067)
    const prescription = prescriptions.find(p => p.medicineId === medicineId);
    const isProtocolDelayed = prescription && prescription.startDate === null && prescription.endDate === null;
    
    if (isProtocolDelayed && medicineId === '10000067') {
      // For 10000067, collection window opens 3 hours after 10000066 was administered
      // (1 hour before the 4-hour activation time)
      const triggerAdmin = administrations.find(adm => 
        adm.medicineId === '10000066' && adm.status === 'administered'
      );
      
      if (triggerAdmin && triggerAdmin.administeredAt) {
        const triggerTime = new Date(triggerAdmin.administeredAt);
        const collectionWindowTime = new Date(triggerTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after trigger
        return collectionWindowTime;
      }
      return null; // No trigger administered yet
    }
    
    const interval = parsePeriodicityInterval(periodicity);
    if (interval === null) return null; // PRN or continuous medication
    
    const lastCollected = getLastCollectionTime(medicineId);
    
    if (lastCollected) {
      // If medication has been collected before, calculate next based on last collection
      return new Date(lastCollected.getTime() + interval);
    } else {
      // For first-time medication, use prescription start date or current time
      let baseTime = new Date(); // Default to current time
      
      if (prescription?.startDate) {
        baseTime = new Date(prescription.startDate);
      }
      
      // For first dose, it can be collected immediately (or from start date)
      return baseTime;
    }
  };

  const formatNextCollection = (nextTime: Date | null, periodicity: string, medicineId?: string, prescription?: Prescription) => {
    const lower = periodicity.toLowerCase();
    
    // Check for PRN/as needed medications first - they never have due times
    if (lower.includes('prn') || lower.includes('needed') || lower.includes('necessary')) {
      return 'As needed';
    }
    
    // Check for continuous medications - they don't have intervals
    if (lower.includes('continuous') || lower.includes('ongoing')) {
      return 'Continuous';
    }
    
    // Check if this prescription is blocked due to protocol delays
    if (prescription && !canCollectMedication(prescription).allowed) {
      const collectionResult = canCollectMedication(prescription);
      const blockReason = collectionResult.reason;
      
      // For protocol medicines 10000069 and 10000070, show delay time remaining
      if ((medicineId === '10000069' || medicineId === '10000070') && collectionResult.timeLeft) {
        return `Delay: ${collectionResult.timeLeft} left`;
      }
      
      // If blocked due to protocol delay timing, extract and show the delay time
      if (blockReason && blockReason.includes('Collection window opens in')) {
        const timeMatch = blockReason.match(/opens in ([^.]+)/);
        if (timeMatch) {
          return `Delay: ${timeMatch[1].trim()} left`;
        }
      }
      
      // For other blocking reasons (like completed prescriptions), show that
      if (blockReason && blockReason.includes('completed')) {
        return 'Completed';
      }
      
      // For protocol medicines not yet activated (no trigger), show status
      if (!nextTime) {
        // Check for common protocol medicines that need triggers
        if (medicineId === '10000069' || medicineId === '10000070') {
          const triggerAdmin = administrations.find(adm => 
            adm.medicineId === '10000046' && adm.status === 'administered'
          );
          
          if (!triggerAdmin) {
            return 'Awaiting trigger';
          }
        }
        
        return 'Not scheduled';
      }
    }
    
    // Special handling for protocol-delayed medication 10000067
    if (medicineId === '10000067') {
      const triggerAdmin = administrations.find(adm => 
        adm.medicineId === '10000066' && adm.status === 'administered'
      );
      
      if (!triggerAdmin) {
        return 'Awaiting trigger (10000066)';
      }
      
      if (!nextTime) {
        return 'Not scheduled';
      }
    }
    
    // If no next time calculated, it's not scheduled
    if (!nextTime) {
      return 'Not scheduled';
    }
    
    // Collection window opens 1 hour before the dose is due
    const collectionTime = new Date(nextTime.getTime() - 60 * 60 * 1000); // Subtract 1 hour
    const now = new Date();
    const diff = collectionTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Available now';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return `Available in ${minutes} min`;
    } else if (hours < 24) {
      return `Available in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (days < 7) {
      return `Available in ${days} day${days > 1 ? 's' : ''}`;
    } else {
      return `Available ${collectionTime.toLocaleDateString()} ${collectionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  const canCollectMedication = (prescription: Prescription) => {
    // Check if prescription is completed using unified completion logic
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
    
    // Protocol delay check for medicines 10000069 and 10000070
    if (prescription.medicineId === '10000069' || prescription.medicineId === '10000070') {
      const triggerAdmin = administrations.find(adm => 
        adm.medicineId === '10000046' && adm.status === 'administered'
      );
      
      if (!triggerAdmin || !triggerAdmin.administeredAt) {
        return { 
          allowed: false, 
          reason: 'Trigger medication (10000046) must be administered first.' 
        };
      }
      
      // Calculate delay time remaining using medication link data
      const link = medicationLinks?.find((link: any) => 
        link.triggerMedicineId === '10000046' && link.followMedicineId === prescription.medicineId
      );
      
      if (link) {
        const triggerTime = new Date(triggerAdmin.administeredAt);
        const requiredDelayMs = link.delayMinutes * 60 * 1000;
        // Allow collection 1 hour before delay expires (subtract 1 hour)
        const dueTime = new Date(triggerTime.getTime() + requiredDelayMs - (60 * 60 * 1000));
        const now = new Date();
        
        if (now < dueTime) {
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
          
          return { 
            allowed: false, 
            reason: `Collection window opens in ${timeDisplay}.`,
            timeLeft: timeDisplay
          };
        }
      }
    }
    
    const nextCollectionTime = getNextCollectionTime(prescription.medicineId, periodicity);
    
    // If never collected before, allow collection
    if (!nextCollectionTime) {
      return { allowed: true, reason: null };
    }
    
    const now = new Date();
    const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
    const timeDiff = nextCollectionTime.getTime() - now.getTime();
    
    // Allow collection if within 1 hour of due time (before or after)
    if (timeDiff <= oneHourInMs) {
      return { allowed: true, reason: null };
    }
    
    // Calculate how long until collection window opens
    const hoursUntilWindow = Math.ceil((timeDiff - oneHourInMs) / (1000 * 60 * 60));
    const minutesUntilWindow = Math.ceil((timeDiff - oneHourInMs) / (1000 * 60));
    
    let timeDisplay;
    if (minutesUntilWindow < 60) {
      timeDisplay = `${minutesUntilWindow} minute${minutesUntilWindow !== 1 ? 's' : ''}`;
    } else {
      timeDisplay = `${hoursUntilWindow} hour${hoursUntilWindow !== 1 ? 's' : ''}`;
    }
    
    return { 
      allowed: false, 
      reason: `Collection not allowed. Collection window opens in ${timeDisplay} (1 hour before due time).`
    };
  };

  // Group prescriptions by type
  const groupedPrescriptions = prescriptions.reduce((groups, prescription) => {
    // First check if prescription is completed - if so, put in Completed category
    if (isCompleteBasedOnDoses(prescription, administrations)) {
      if (!groups['Completed']) {
        groups['Completed'] = [];
      }
      groups['Completed'].push(prescription);
      return groups;
    }
    
    // For active prescriptions, categorize as before
    let category = 'Ordered';
    
    if (prescription.periodicity?.toLowerCase().includes('needed') || 
        prescription.periodicity?.toLowerCase().includes('prn')) {
      category = 'PRN';
    } else if (prescription.periodicity?.toLowerCase().includes('continuous') || 
               prescription.duration === 'Ongoing') {
      category = 'Continuous';
    } else if (!prescription.endDate && prescription.startDate === null) {
      // Protocol delayed medications (null start/end dates) are still scheduled, not continuous
      category = 'Ordered';
    } else if (!prescription.endDate) {
      // Only true ongoing medications without protocol delay are continuous
      category = 'Continuous';
    }

    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(prescription);
    return groups;
  }, {} as Record<string, Prescription[]>);

  // If showing medicine location
  if (selectedPrescription) {
    const medicine = medicines.find(m => m.id === selectedPrescription.medicineId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-100">
        <header className="bg-white border-b border-purple-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-pills text-white text-sm sm:text-lg"></i>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">MedPyxis</h1>
                  <p className="text-xs sm:text-sm text-gray-600">Medication Dispensing System</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-base font-bold text-gray-900">MedPyxis</h1>
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-4">
                <Link href="/">
                  <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base">
                    <i className="fas fa-home mr-1 sm:mr-2"></i><span className="hidden sm:inline">Home</span>
                  </button>
                </Link>
                <AlertMenuButton />
                <button 
                  onClick={handleProfileClick}
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
                  data-testid="button-profile"
                >
                  <i className="fas fa-cog text-white text-xs sm:text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-purple-200 p-8">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-map-marker-alt text-white text-3xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Medicine Location</h2>
              <p className="text-gray-600">Collect the following medication</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 mb-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-purple-900 mb-2">{medicine?.name}</h3>
                <p className="text-purple-700 mb-4">{selectedPrescription.dosage} - {selectedPrescription.periodicity}</p>
                
                <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-6">
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                    <div className="text-sm text-purple-600 font-medium mb-1">Drawer</div>
                    <div className="text-3xl font-bold text-purple-900">{medicine?.drawer || 'A1'}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                    <div className="text-sm text-purple-600 font-medium mb-1">Bin</div>
                    <div className="text-3xl font-bold text-purple-900">{medicine?.bin || '01'}</div>
                  </div>
                </div>
                
                {/* Verification Step */}
                <div className="bg-white rounded-lg p-4 border-2 border-purple-300 max-w-md mx-auto">
                  <div className="text-sm text-purple-600 font-medium mb-2">
                    <i className="fas fa-qrcode mr-2"></i>Scan Medication Barcode to Verify
                  </div>
                  <div className="flex gap-3 items-center mb-2">
                    <input
                      ref={medicationScannerRef}
                      type="text"
                      value={medicationBarcode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        setMedicationBarcode(value);
                      }}
                      onKeyPress={handleMedicationScan}
                      placeholder="Scan medication barcode..."
                      maxLength={8}
                      pattern="[0-9]{1,8}"
                      inputMode="numeric"
                      className={`flex-1 p-3 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 font-mono ${
                        isVerified 
                          ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                          : verificationError 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-purple-500'
                      }`}
                      data-testid="input-medication-barcode"
                    />
                    <button
                      onClick={handleMedicationSubmit}
                      disabled={!medicationBarcode.trim()}
                      className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                      data-testid="button-submit-medication-barcode"
                    >
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                  {isVerified && (
                    <div className="flex items-center justify-center text-green-600 mt-2">
                      <i className="fas fa-check-circle mr-2"></i>
                      <span className="text-sm font-medium">Medication Verified!</span>
                    </div>
                  )}
                  {verificationError && (
                    <div className="flex items-center justify-center text-red-600 mt-2">
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      <span className="text-sm font-medium">{verificationError}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Expected ID: {selectedPrescription.medicineId}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 justify-center">
              <button
                onClick={handleCollectionComplete}
                disabled={!isVerified}
                className={`px-8 py-3 font-medium rounded-lg transition-colors ${
                  isVerified
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                data-testid="button-collection-complete"
              >
                <i className="fas fa-check mr-2"></i>Collection Complete
              </button>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                data-testid="button-close"
              >
                <i className="fas fa-times mr-2"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If patient is selected, show prescriptions
  if (selectedPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-100">
        <header className="bg-white border-b border-purple-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-pills text-white text-lg"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">MedPyxis</h1>
                  <p className="text-sm text-gray-600">Medication Dispensing System</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>Back
                </button>
                <Link href="/">
                  <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    <i className="fas fa-home mr-2"></i>Home
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Patient Info */}
          <div className="bg-white rounded-xl shadow-lg border border-purple-200 mb-6">
            <div className="p-6 border-b border-purple-200">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {getInitials(selectedPatient.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.name}</h2>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-gray-600">{selectedPatient.age} years old</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600">{selectedPatient.sex}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600">MRN: {selectedPatient.mrn}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prescriptions by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {['Ordered', 'PRN', 'Continuous', 'Completed'].map(category => (
              <div key={category} className={`rounded-xl shadow-lg border ${
                category === 'Completed' 
                  ? 'bg-pink-50 border-pink-200' 
                  : 'bg-white border-purple-200'
              }`}>
                <div className={`p-4 border-b ${
                  category === 'Completed' 
                    ? 'border-pink-200' 
                    : 'border-purple-200'
                }`}>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category}
                    <span className={`ml-2 text-sm px-2 py-1 rounded-full ${
                      category === 'Completed'
                        ? 'bg-pink-100 text-pink-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {groupedPrescriptions[category]?.length || 0}
                    </span>
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {groupedPrescriptions[category]?.map(prescription => {
                    const medicine = medicines.find(m => m.id === prescription.medicineId);
                    const lastCollected = getLastCollectionTime(prescription.medicineId);
                    const nextCollection = getNextCollectionTime(prescription.medicineId, prescription.periodicity);
                    return (
                      <div
                        key={prescription.id}
                        onClick={() => category !== 'Completed' ? handlePrescriptionSelect(prescription) : null}
                        className={`rounded-lg p-4 transition-colors ${
                          category === 'Completed'
                            ? 'bg-pink-100 border border-pink-300 cursor-default'
                            : `cursor-pointer ${
                                canCollectMedication(prescription).allowed
                                  ? 'bg-purple-50 hover:bg-purple-100 border border-purple-200'
                                  : (prescription.medicineId === '10000069' || prescription.medicineId === '10000070') && canCollectMedication(prescription).timeLeft
                                  ? 'bg-orange-50 hover:bg-orange-100 border border-orange-300'
                                  : 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-300'
                              }`
                        }`}
                        data-testid={`prescription-card-${prescription.id}`}
                      >
                        <div className={`font-semibold flex items-center ${
                          category === 'Completed' ? 'text-pink-900' : 'text-purple-900'
                        }`}>
                          {category === 'Completed' && (
                            <i className="fas fa-check text-pink-600 mr-2"></i>
                          )}
                          {medicine?.name}
                        </div>
                        <div className={`text-sm mt-1 ${
                          category === 'Completed' ? 'text-pink-700' : 'text-purple-700'
                        }`}>{prescription.dosage}</div>
                        <div className={`text-sm mt-1 ${
                          category === 'Completed' ? 'text-pink-600' : 'text-purple-600'
                        }`}>{prescription.periodicity}</div>
                        {prescription.route !== 'Oral' && (
                          <div className={`text-xs mt-1 ${
                            category === 'Completed' ? 'text-pink-500' : 'text-purple-500'
                          }`}>Route: {prescription.route}</div>
                        )}
                        <div className={`text-xs mt-2 space-y-1 ${
                          category === 'Completed' ? 'text-pink-500' : 'text-purple-500'
                        }`}>
                          {category === 'Completed' ? (
                            <>
                              <div className="flex items-center">
                                <i className="fas fa-check-circle mr-1 text-pink-600"></i>
                                <span className="font-medium text-pink-700">Completed</span>
                              </div>
                              {lastCollected && (
                                <div className="flex items-center">
                                  <i className="fas fa-clock mr-1"></i>
                                  Last administered: {formatLastCollected(lastCollected)}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-center">
                                <i className="fas fa-clock mr-1"></i>
                                Last: {formatLastCollected(lastCollected)}
                              </div>
                              {lastCollected && (
                                <div className="mt-1">
                                  <NextDoseCountdown 
                                    lastAdministeredAt={lastCollected}
                                    periodicity={prescription.periodicity || 'Every 6 hours'}
                                  />
                                </div>
                              )}
                              <div className="flex items-center">
                                <i className="fas fa-calendar-alt mr-1"></i>
                                Next: {formatNextCollection(nextCollection, prescription.periodicity, prescription.medicineId, prescription)}
                              </div>
                              <div className="flex items-center">
                                <i className="fas fa-pills mr-1"></i>
                                {calculateRemainingDoses(prescription, administrations)}
                              </div>
                              {!canCollectMedication(prescription).allowed && (
                                <div className="flex items-center text-yellow-600">
                                  <i className="fas fa-exclamation-triangle mr-1"></i>
                                  {canCollectMedication(prescription).reason || 'Outside collection window'}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!groupedPrescriptions[category] || groupedPrescriptions[category].length === 0) && (
                    <div className="text-center text-gray-500 py-8">
                      <i className="fas fa-prescription text-gray-300 text-3xl mb-2"></i>
                      <p>No {category.toLowerCase()} medications</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timing Warning Modal */}
        {showTimingWarning && warningPrescription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-medical-text-primary">Medication Timing Warning</h3>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-800 mb-2">
                  <strong>{medicines.find(m => m.id === warningPrescription.medicineId)?.name}</strong> collection is outside the safe timing window.
                </p>
                <p className="text-xs text-gray-600">
                  {timingWarningMessage}
                </p>
              </div>
              
              <div className="text-xs text-gray-600 mb-4 space-y-1">
                <div>• Medication errors may occur</div>
                <div>• Risk of adverse patient reactions</div>
                <div>• Potential dosing complications</div>
              </div>
              
              <p className="text-sm text-gray-600 mb-6 text-center">
                Do you want to continue with this collection?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelTiming}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  data-testid="button-cancel-timing"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinueWithTiming}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                  data-testid="button-continue-timing"
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Patient selection screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-100">
      <header className="bg-white border-b border-purple-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-pills text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MedPyxis</h1>
                <p className="text-sm text-gray-600">Medication Dispensing System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  <i className="fas fa-home mr-2"></i>Home
                </button>
              </Link>
              <button 
                onClick={handleProfileClick}
                className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
                data-testid="button-profile"
              >
                <i className="fas fa-cog text-white text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Patient</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Scan the patient's barcode or select from the dropdown to access their medication list.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-purple-200 p-8">
          {/* Barcode Scanner */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-qrcode mr-2"></i>Scan Patient Barcode
            </label>
            <div className="flex gap-3 items-center">
              <input
                ref={scannerRef}
                type="text"
                value={patientBarcode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                  setPatientBarcode(value);
                }}
                onKeyPress={handlePatientScan}
                placeholder="Scan or type patient ID..."
                maxLength={12}
                pattern="[0-9]{1,12}"
                inputMode="numeric"
                className="flex-1 p-4 text-lg border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                data-testid="input-patient-barcode"
              />
              <button
                onClick={handlePatientSubmit}
                disabled={!patientBarcode.trim()}
                className="px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                data-testid="button-submit-patient-barcode"
              >
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Enter 12 numeric characters or click the arrow button</p>
          </div>

          {/* OR Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Patient Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-list mr-2"></i>Select Patient from List
            </label>
            <select
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="w-full p-4 text-lg border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              data-testid="select-patient"
            >
              <option value="">Choose a patient...</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} (ID: {patient.id}) - {patient.department}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lock text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-medical-text-primary mb-2">
                {pendingAction === 'time' ? 'Time Simulation Access' : 'Admin Dashboard Access'}
              </h3>
              <p className="text-medical-text-secondary mb-6">
                {pendingAction === 'time' ? 'Enter PIN to access time simulation' : 'Enter PIN to access admin dashboard'}
              </p>
              
              <div className="mb-6">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full p-4 text-center text-2xl font-mono border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  maxLength={6}
                  data-testid="input-pin"
                  onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {setShowPinModal(false); setPin(""); setPendingAction('');}}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  data-testid="button-cancel-pin"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePinSubmit()}
                  disabled={!pin}
                  className="flex-1 px-4 py-3 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-submit-pin"
                >
                  Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-medical-text-primary mb-2">
                {user?.role === 'student' ? 'Profile' : 'Administrative Menu'}
              </h3>
              <p className="text-medical-text-secondary mb-6">
                {user?.role === 'student' ? 'Student information and settings' : 'Select an option to continue'}
              </p>
            </div>

            {user?.role === 'student' ? (
              // Student view - only show ID
              <>
                <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                  <div className="flex items-center">
                    <User className="text-blue-600 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-semibold text-blue-900">Student ID</div>
                      <div className="text-sm text-blue-700">{user.username}</div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left mb-3 disabled:opacity-50"
                  data-testid="button-logout"
                >
                  <div className="flex items-center">
                    <LogOut className="text-red-700 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-semibold text-red-900">
                        {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                      </div>
                      <div className="text-sm text-red-700">Sign out of your account</div>
                    </div>
                  </div>
                </button>
              </>
            ) : (
              // Instructor/Admin view - show all administrative options
              <>
                <button
                  onClick={() => handleMenuSelection('admin')}
                  className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left mb-3"
                  data-testid="button-admin-dashboard"
                >
                  <div className="flex items-center">
                    <i className="fas fa-shield-alt text-blue-600 text-xl mr-3"></i>
                    <div>
                      <div className="font-semibold text-blue-900">Admin Dashboard</div>
                      <div className="text-sm text-blue-700">Complete system management: users, patients, medicines, lab tests, imaging & database</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuSelection('time')}
                  className="w-full p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-left mb-3"
                  data-testid="button-time-simulation"
                >
                  <div className="flex items-center">
                    <i className="fas fa-clock text-indigo-600 text-xl mr-3"></i>
                    <div>
                      <div className="font-semibold text-indigo-900">Time Simulation</div>
                      <div className="text-sm text-indigo-700">Training mode - Jump forward in time</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left mb-3 disabled:opacity-50"
                  data-testid="button-logout"
                >
                  <div className="flex items-center">
                    <LogOut className="text-red-700 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-semibold text-red-900">
                        {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                      </div>
                      <div className="text-sm text-red-700">Sign out of your account</div>
                    </div>
                  </div>
                </button>
              </>
            )}
            
            <button
              onClick={() => setShowMenuModal(false)}
              className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              data-testid="button-cancel-menu"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admin Dashboard Modal - Only render for admin/instructor users */}
      {(user?.role === 'admin' || user?.role === 'instructor') && (
        <AdminDashboard 
          isOpen={showAdminDashboard} 
          onClose={handleCloseAdminDashboard} 
        />
      )}
      
      {/* Time Simulation Modal */}
      <TimeSimulationModal 
        isOpen={showTimeSimulation} 
        onClose={handleCloseTimeSimulation} 
      />
    </div>
  );
}