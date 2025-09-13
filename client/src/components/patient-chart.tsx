import { useState, useEffect } from "react";
import { Link } from "wouter";
import { type Patient, type Administration, type Medicine, type Prescription, type LabResult, type Vitals } from "@shared/schema";
import { NextDoseCountdown } from "./next-dose-countdown";
import { DoubleConfirmationMedicationAdmin } from "./double-confirmation-medication-admin";
import { AuditLogComponent } from "./audit-log";
import { PrescriptionManager } from "./prescription-manager";
import { LabResults } from "./lab-results";
import { EnhancedVitals } from "./enhanced-vitals";
import { CareNotes } from "./care-notes";
import { ProviderOrders } from "./provider-orders";
import { AlertMenuButton } from "./alert-menu-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

// Helper function to calculate remaining doses for a prescription with fallback for legacy data
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

// Component to display who administered the medicine
function AdminByDisplay({ administeredBy }: { administeredBy: string }) {
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });
  
  if (!administeredBy) {
    return <div className="text-sm text-medical-text-muted">System</div>;
  }
  
  const user = users.find((u: any) => u.id === administeredBy);
  return (
    <div className="text-sm text-medical-text-muted">
      {user ? (user.username || user.role) : 'Unknown User'}
    </div>
  );
}

interface PatientChartProps {
  patient: Patient;
  onClear: () => void;
  onPatientUpdate?: (updatedPatient: Patient) => void;
}

export function PatientChart({ patient, onClear, onPatientUpdate }: PatientChartProps) {
  const [activeTab, setActiveTab] = useState<'medication' | 'record' | 'chart' | 'audit' | 'prescriptions' | 'labresults' | 'vitals' | 'carenotes'>('medication');
  const [isEditing, setIsEditing] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient>(patient);
  const [adminViewMode, setAdminViewMode] = useState<'cards' | 'table'>('table');

  // Sync local state with prop changes
  useEffect(() => {
    setCurrentPatient(patient);
    setEditData({
      notes: patient.notes,
      status: patient.status,
      provider: patient.provider,
      allergies: patient.allergies,
      isolation: patient.isolation,
      bed: patient.bed,
      age: patient.age,
      doseWeight: patient.doseWeight
    });
  }, [patient]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const { toast } = useToast();
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [adminDeletePin, setAdminDeletePin] = useState('');
  const [adminDeleteError, setAdminDeleteError] = useState('');

  // Get current patient data for updates
  const { data: refreshedPatient } = useQuery<Patient>({
    queryKey: ['/api/patients', patient.id],
    initialData: patient,
  });

  // Use refreshedPatient if available, fallback to prop
  const displayPatient = refreshedPatient || patient;
  
  const [editData, setEditData] = useState({
    notes: displayPatient.notes,
    status: displayPatient.status,
    provider: displayPatient.provider,
    allergies: displayPatient.allergies,
    isolation: displayPatient.isolation,
    bed: displayPatient.bed,
    age: displayPatient.age,
    doseWeight: displayPatient.doseWeight
  });

  // Get administrations and medicines for history tab
  const { data: administrations = [] } = useQuery<Administration[]>({
    queryKey: ['/api/patients', displayPatient.id, 'administrations'],
  });
  
  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines'],
  });

  // Get prescriptions for countdown calculation
  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['/api/patients', displayPatient.id, 'prescriptions'],
  });

  // Get lab results for lab data tab
  const { data: labResults = [] } = useQuery<LabResult[]>({
    queryKey: ['/api/patients', displayPatient.id, 'lab-results'],
  });
  
  const queryClient = useQueryClient();
  
  const updatePatientMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest(`/api/patients/${displayPatient.id}`, 'PATCH', updates);
    },
    onSuccess: (updatedPatient) => {
      setIsEditing(false);
      
      // Update the patient prop with new data
      if (onPatientUpdate) {
        onPatientUpdate(updatedPatient);
      }
      
      // Invalidate and refetch all patient-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'administrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'lab-results'] });
      
      // Show success message
      toast({
        title: "Patient Updated",
        description: "Patient information has been successfully saved.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to update patient:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save patient information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { user } = useAuth();
  const canDelete = user?.role === 'instructor' || user?.role === 'admin';
  const canEdit = user?.role === 'instructor' || user?.role === 'admin';

  const deletePatientMutation = useMutation({
    mutationFn: async (pin: string) => {
      return await apiRequest(`/api/patients/${patient.id}`, 'DELETE', { pin });
    },
    onSuccess: () => {
      // Update all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit'] });
      setShowDeleteModal(false);
      setDeletePin("");
      
      // Navigate back to home since patient is deleted
      onClear();
    },
    onError: (error: any) => {
      console.error('Failed to delete patient:', error);
    }
  });

  // Delete administration record mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async ({ administrationId, pin }: { administrationId: string; pin: string }) => {
      return await apiRequest(`/api/administrations/${administrationId}`, 'DELETE', { pin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'administrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id] });
      setShowAdminDeleteModal(false);
      setSelectedAdmin(null);
      setAdminDeletePin('');
      setAdminDeleteError('');
    },
    onError: (error: any) => {
      if (error.message.includes('401')) {
        setAdminDeleteError('Invalid PIN code');
      } else if (error.message.includes('403')) {
        setAdminDeleteError('Access denied. Instructor or admin role required.');
      } else {
        setAdminDeleteError('Failed to delete administration record');
      }
    },
  });

  const handleAdminDeleteClick = (admin: any) => {
    setSelectedAdmin(admin);
    setShowAdminDeleteModal(true);
    setAdminDeletePin('');
    setAdminDeleteError('');
  };

  const handleAdminDeleteConfirm = () => {
    if (selectedAdmin) {
      // Admin users bypass PIN requirement
      const effectivePin = user?.role === 'admin' ? '0000' : adminDeletePin;
      deleteAdminMutation.mutate({ administrationId: selectedAdmin.id, pin: effectivePin });
    }
  };
  
  const handleSaveEdit = () => {
    updatePatientMutation.mutate(editData);
  };
  
  const handleCancelEdit = () => {
    setEditData({
      notes: patient.notes,
      status: patient.status,
      provider: patient.provider,
      allergies: patient.allergies,
      isolation: patient.isolation,
      bed: patient.bed,
      age: patient.age,
      doseWeight: patient.doseWeight
    });
    setIsEditing(false);
  };

  const handleDeletePatient = () => {
    // Admin users bypass PIN requirement
    const effectivePin = user?.role === 'admin' ? '149500' : deletePin;
    if (effectivePin === "149500") {
      deletePatientMutation.mutate(effectivePin);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePin("");
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'triage': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'observation': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active labor': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ldr (labor, delivery, recovery)': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivery imminent': return 'bg-red-100 text-red-800 border-red-200';
      case 'pushing / second stage': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'in or / c-section': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pacu (post-anesthesia care unit)': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'postpartum recovery': return 'bg-green-100 text-green-800 border-green-200';
      case 'postpartum / couplet care': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'discharge pending': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePrintPatientProfile = async () => {
    const prescribedMedicines = prescriptions.map(p => {
      const medicine = medicines.find(m => m.id === p.medicineId);
      return { ...p, medicine };
    }).filter(p => p.medicine);

    const prescriptionContent = prescribedMedicines.length > 0 ? prescribedMedicines.map(prescription => `
      • ${prescription.medicine?.name}
        Dosage: ${prescription.dosage}
        Route: ${prescription.route}
        Frequency: ${prescription.periodicity}
        Duration: ${prescription.duration || 'Not specified'}
        Start Date: ${prescription.startDate ? new Date(prescription.startDate).toLocaleDateString() : 'Not specified'}
        End Date: ${prescription.endDate ? new Date(prescription.endDate).toLocaleDateString() : 'Not specified'}
    `).join('\n') : '\n      No current prescriptions';

    const labContent = labResults.length > 0 ? labResults.map(result => `
      • ${result.testName}
        Value: ${result.value} ${result.unit}
        Reference Range: ${result.referenceRange || 'N/A'}
        Status: ${result.status}
        Collected: ${result.takenAt ? new Date(result.takenAt).toLocaleString() : 'Not specified'}
        Notes: ${result.notes || 'None'}
    `).join('\n') : '\n      No lab results available';

    // Fetch additional patient data for complete profile
    let imagingResults = [];
    let vitalsData = [];
    let careNotesData = [];
    let assessmentsData = [];
    let intakeOutputData = [];
    let providerOrdersData = [];

    try {
      const [imagingRes, vitalsRes, careNotesRes, assessmentsRes, intakeOutputRes, providerOrdersRes] = await Promise.all([
        fetch(`/api/patients/${patient.id}/imaging-results`, { credentials: 'include' }),
        fetch(`/api/patients/${patient.id}/vitals`, { credentials: 'include' }),
        fetch(`/api/patients/${patient.id}/care-notes`, { credentials: 'include' }),
        fetch(`/api/patients/${patient.id}/assessments`, { credentials: 'include' }),
        fetch(`/api/patients/${patient.id}/intake-output`, { credentials: 'include' }),
        fetch(`/api/patients/${patient.id}/provider-orders`, { credentials: 'include' })
      ]);

      if (imagingRes.ok) imagingResults = await imagingRes.json();
      if (vitalsRes.ok) vitalsData = await vitalsRes.json();
      if (careNotesRes.ok) careNotesData = await careNotesRes.json();
      if (assessmentsRes.ok) assessmentsData = await assessmentsRes.json();
      if (intakeOutputRes.ok) intakeOutputData = await intakeOutputRes.json();
      if (providerOrdersRes.ok) providerOrdersData = await providerOrdersRes.json();
    } catch (error) {
      console.error('Error fetching additional patient data:', error);
    }

    // Parse chart data for background, summary, discharge, handoff
    let chartData = {};
    try {
      chartData = patient.chartData ? JSON.parse(patient.chartData) : {};
    } catch (error) {
      console.error('Error parsing chart data:', error);
    }

    // Provider Orders content
    const providerOrdersContent = providerOrdersData.length > 0 ? providerOrdersData.map((order: any) => `
      • ${order.orderType?.toUpperCase() || 'GENERAL'} ORDER
        Description: ${order.description || 'No description'}
        Status: ${order.status?.toUpperCase() || 'UNKNOWN'}
        Ordered By: ${order.orderedBy || 'Unknown Provider'}
        Ordered: ${order.orderedAt ? new Date(order.orderedAt).toLocaleString() : 'Not specified'}
        ${order.discontinuedAt ? `Discontinued: ${new Date(order.discontinuedAt).toLocaleString()} by ${order.discontinuedBy || 'Unknown'}` : ''}
    `).join('\n') : '\n      No provider orders available';

    // Patient Background, Summary, Discharge Plan, Handoff
    const backgroundContent = chartData.background || 'No background information available';
    const summaryContent = chartData.summary || 'No patient summary available';
    const dischargePlanContent = chartData.discharge || 'No discharge plan available';
    const handoffContent = chartData.handoff || 'No handoff information available';

    // Enhanced Assessments content
    const assessmentsContent = assessmentsData.length > 0 ? assessmentsData.map((assessment: any) => `
      • ${new Date(assessment.assessmentDate || Date.now()).toLocaleString()}
        Type: ${assessment.assessmentType || 'General Assessment'}
        Provider: ${assessment.provider || 'Unknown'}
        Findings: ${assessment.findings || 'No findings recorded'}
        Plan: ${assessment.plan || 'No plan documented'}
        Notes: ${assessment.notes || 'No additional notes'}
    `).join('\n') : '\n      No assessments recorded';

    // Intake/Output content with simple graphs
    const createSimpleGraph = (data: any[], valueKey: string, label: string) => {
      if (data.length === 0) return `No ${label.toLowerCase()} data available`;
      
      const values = data.map(item => parseFloat(item[valueKey]) || 0);
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const range = maxValue - minValue || 1;
      
      return data.slice(-10).map((item: any, index: number) => {
        const value = parseFloat(item[valueKey]) || 0;
        const normalizedValue = ((value - minValue) / range) * 20; // Scale to 20 chars
        const bar = '█'.repeat(Math.max(1, Math.round(normalizedValue)));
        const time = item.recordedAt ? new Date(item.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
        return `      ${time}: ${bar} ${value} ${item.unit || ''}`;
      }).join('\n');
    };

    const intakeOutputContent = intakeOutputData.length > 0 ? `
    INTAKE TREND (Last 10 entries):
${createSimpleGraph(intakeOutputData.filter((item: any) => item.type === 'intake'), 'amount', 'Intake')}

    OUTPUT TREND (Last 10 entries):
${createSimpleGraph(intakeOutputData.filter((item: any) => item.type === 'output'), 'amount', 'Output')}

    DETAILED RECORDS:
${intakeOutputData.map((item: any) => `
      • ${new Date(item.recordedAt || Date.now()).toLocaleString()}
        Type: ${item.type?.toUpperCase() || 'UNKNOWN'}
        Amount: ${item.amount || 'N/A'} ${item.unit || 'mL'}
        Source/Route: ${item.source || 'Not specified'}
        Notes: ${item.notes || 'None'}
    `).join('\n')}` : '\n      No intake/output data available';

    // Vital Signs with simple graphs
    const createVitalGraph = (data: any[], valueKey: string, label: string, unit: string = '') => {
      if (data.length === 0) return `No ${label.toLowerCase()} data available`;
      
      const values = data.filter(item => item[valueKey]).map(item => parseFloat(item[valueKey]));
      if (values.length === 0) return `No ${label.toLowerCase()} data available`;
      
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const range = maxValue - minValue || 1;
      
      return data.filter(item => item[valueKey]).slice(-10).map((item: any) => {
        const value = parseFloat(item[valueKey]);
        const normalizedValue = ((value - minValue) / range) * 20;
        const bar = '█'.repeat(Math.max(1, Math.round(normalizedValue)));
        const time = item.recordedAt ? new Date(item.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
        return `      ${time}: ${bar} ${value}${unit}`;
      }).join('\n');
    };

    const vitalsContent = vitalsData.length > 0 ? `
    TEMPERATURE TREND (Last 10 readings):
${createVitalGraph(vitalsData, 'temperature', 'Temperature', '°F')}

    HEART RATE TREND (Last 10 readings):
${createVitalGraph(vitalsData, 'heartRate', 'Heart Rate', ' bpm')}

    BLOOD PRESSURE TREND (Last 10 readings):
${vitalsData.filter(item => item.systolic).slice(-10).map((vital: any) => {
      const time = vital.recordedAt ? new Date(vital.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
      return `      ${time}: ${vital.systolic}/${vital.diastolic} mmHg`;
    }).join('\n')}

    DETAILED VITAL SIGNS:
${vitalsData.map((vital: any) => `
      • Recorded: ${vital.recordedAt ? new Date(vital.recordedAt).toLocaleString() : 'Not specified'}
        Temperature: ${vital.temperature || 'N/A'}°F
        Blood Pressure: ${vital.systolic || 'N/A'}/${vital.diastolic || 'N/A'} mmHg
        Heart Rate: ${vital.heartRate || 'N/A'} bpm
        Respiratory Rate: ${vital.respiratoryRate || 'N/A'} /min
        O2 Saturation: ${vital.oxygenSaturation || 'N/A'}%
        Pain Level: ${vital.painLevel || 'N/A'}/10
    `).join('\n')}` : '\n      No vital signs recorded';

    const imagingContent = imagingResults.length > 0 ? imagingResults.map((result: any) => `
      • ${result.studyType || 'Imaging Study'}
        Date: ${result.studyDate ? new Date(result.studyDate).toLocaleDateString() : 'Not specified'}
        Body Part: ${result.bodyPart || 'Not specified'}
        Ordering Physician: ${result.orderingPhysician || 'Not specified'}
        Findings: ${result.findings || 'None recorded'}
        Impression: ${result.impression || 'None recorded'}
        ${result.imageUrl ? 'Image Available: Yes' : 'Image Available: No'}
    `).join('\n') : '\n      No imaging results available';

    const careNotesContent = careNotesData.length > 0 ? careNotesData.map((note: any) => `
      • ${new Date(note.createdAt || Date.now()).toLocaleString()}
        Provider: ${note.provider || 'Unknown'}
        Note: ${note.note || 'No content'}
    `).join('\n') : '\n      No care notes available';

    const recentAdministrations = administrations
      .sort((a, b) => new Date(b.administeredAt || 0).getTime() - new Date(a.administeredAt || 0).getTime())
      .slice(0, 10)
      .map(admin => {
        const medicine = medicines.find(m => m.id === admin.medicineId);
        return `
      • ${medicine?.name || 'Unknown'}
        Time: ${admin.administeredAt ? new Date(admin.administeredAt).toLocaleString([]) : 'Unknown'}
        Status: ${admin.status}
        Notes: ${admin.message || 'None'}`;
      }).join('\n');

    const adminContent = administrations.length > 0 ? recentAdministrations : '\n      No administration history';
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient Profile - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; zoom: 95%; }
              h1, h2, h3 { color: #1f2937; margin-bottom: 10px; }
              .header { border-bottom: 3px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 25px; }
              .section { margin-bottom: 25px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
              .patient-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
              .info-item { padding: 8px; background-color: #f9fafb; border-radius: 4px; }
              .info-label { font-weight: bold; color: #374151; }
              .status-stable { color: #059669; }
              .status-critical { color: #dc2626; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
              
              /* Handwriting sections */
              .handwriting-section { 
                margin-top: 20px; 
                border-top: 2px solid #d1d5db; 
                padding-top: 15px; 
              }
              .handwriting-title { 
                font-weight: bold; 
                color: #4b5563; 
                margin-bottom: 10px; 
                font-size: 14px; 
              }
              .lined-area { 
                background-image: repeating-linear-gradient(
                  transparent,
                  transparent 19px,
                  #e5e7eb 19px,
                  #e5e7eb 20px
                );
                min-height: 100px; 
                padding: 5px; 
                border: 1px solid #d1d5db; 
                border-radius: 4px; 
              }
              .lined-area.small { min-height: 60px; }
              .lined-area.large { min-height: 140px; }
              
              /* Blank vital signs table */
              .vitals-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px; 
              }
              .vitals-table th, .vitals-table td { 
                border: 1px solid #d1d5db; 
                padding: 8px; 
                text-align: left; 
                height: 30px; 
              }
              .vitals-table th { 
                background-color: #f9fafb; 
                font-weight: bold; 
              }
              
              @media print {
                body { zoom: 95%; transform: scale(0.95); transform-origin: top left; }
                .lined-area { 
                  background-image: repeating-linear-gradient(
                    transparent,
                    transparent 19px,
                    #999 19px,
                    #999 20px
                  ); 
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Complete Patient Profile</h1>
              <h2>${patient.name}</h2>
              <p><strong>Medical Record Number:</strong> ${patient.id}</p>
              <p><strong>Date of Birth:</strong> ${patient.dob}</p>
              <p><strong>Age:</strong> ${patient.age} years</p>
              <p><strong>Sex:</strong> ${patient.sex}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="section">
              <h3>📊 Patient Information</h3>
              <div class="patient-info">
                <div class="info-item">
                  <div class="info-label">Weight:</div>
                  <div>${patient.doseWeight}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">MRN:</div>
                  <div>${patient.mrn}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">FIN:</div>
                  <div>${patient.fin}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Admitted:</div>
                  <div>${new Date(patient.admitted).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status:</div>
                  <div class="status-${patient.status.toLowerCase()}">${patient.status}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Isolation:</div>
                  <div>${patient.isolation}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Bed:</div>
                  <div>${patient.bed}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Provider:</div>
                  <div>${patient.provider}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Allergies:</div>
                  <div>${patient.allergies}</div>
                </div>
              </div>
              <div class="info-item" style="grid-column: span 2;">
                <div class="info-label">Notes:</div>
                <div>${patient.notes || 'None'}</div>
              </div>
            </div>

            <div class="section">
              <h3>👤 Patient Background</h3>
              <pre>${backgroundContent}</pre>
            </div>

            <div class="section">
              <h3>📄 Patient Summary</h3>
              <pre>${summaryContent}</pre>
            </div>

            <div class="section">
              <h3>🏠 Discharge Plan</h3>
              <pre>${dischargePlanContent}</pre>
            </div>

            <div class="section">
              <h3>🔄 Handoff Information</h3>
              <pre>${handoffContent}</pre>
            </div>

            <div class="section">
              <h3>📋 Provider Orders</h3>
              <pre>${providerOrdersContent}</pre>
              
              <div class="handwriting-section">
                <div class="handwriting-title">📝 Additional Provider Orders:</div>
                <div class="lined-area large"></div>
              </div>
            </div>

            <div class="section">
              <h3>📝 Care Notes</h3>
              <pre>${careNotesContent}</pre>
              
              <div class="handwriting-section">
                <div class="handwriting-title">📝 Additional Care Notes:</div>
                <div class="lined-area large"></div>
              </div>
            </div>
            
            <div class="section">
              <h3>💊 Current Medications</h3>
              <pre>${prescriptionContent}</pre>
            </div>
            
            <div class="section">
              <h3>🩺 Vital Signs & Trends</h3>
              <pre>${vitalsContent}</pre>
              
              <div class="handwriting-section">
                <div class="handwriting-title">📊 Additional Vital Signs:</div>
                <table class="vitals-table">
                  <tr>
                    <th>Date/Time</th>
                    <th>Temp (°F)</th>
                    <th>BP (mmHg)</th>
                    <th>HR (bpm)</th>
                    <th>RR (/min)</th>
                    <th>O2 Sat (%)</th>
                    <th>Pain (0-10)</th>
                  </tr>
                  <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                </table>
              </div>
            </div>

            <div class="section">
              <h3>💧 Intake/Output Records & Trends</h3>
              <pre>${intakeOutputContent}</pre>
              
              <div class="handwriting-section">
                <div class="handwriting-title">💧 Additional Intake/Output Records:</div>
                <div class="lined-area large"></div>
              </div>
            </div>

            <div class="section">
              <h3>🔍 Clinical Assessments</h3>
              <pre>${assessmentsContent}</pre>
              
              <div class="handwriting-section">
                <div class="handwriting-title">🔍 Additional Clinical Assessments:</div>
                <div class="lined-area large"></div>
              </div>
            </div>
            
            <div class="section">
              <h3>🧪 Laboratory Results</h3>
              <pre>${labContent}</pre>
            </div>
            
            <div class="section">
              <h3>🖼️ Imaging Results</h3>
              <pre>${imagingContent}</pre>
            </div>
            
            <div class="section">
              <h3>💉 Recent Administration History (Last 10)</h3>
              <pre>${adminContent}</pre>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-background to-slate-100">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
        
        {/* Patient Header Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-medical border border-medical-border mx-auto">
          <div className="p-3 sm:p-4 md:p-6 border-b border-medical-border">
            <div className="flex items-start justify-between flex-wrap sm:flex-nowrap gap-3">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-medical-primary to-teal-600 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
                  {getInitials(displayPatient.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-medical-text-primary truncate" data-testid="text-patient-name">{displayPatient.name}</h2>
                  <div className="flex items-center space-x-2 sm:space-x-4 mt-1 text-xs sm:text-sm">
                    <span className="text-medical-text-muted">{displayPatient.age} years old</span>
                    <span className="text-medical-text-muted">•</span>
                    <span className="text-medical-text-muted">{displayPatient.sex}</span>
                    <span className="text-medical-text-muted">•</span>
                    <span className="text-medical-text-muted truncate">{displayPatient.doseWeight}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <AlertMenuButton />
                <button
                  onClick={handlePrintPatientProfile}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-medical-primary text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors min-h-[36px] sm:min-h-[44px] flex items-center justify-center"
                  data-testid="button-print-patient-profile"
                >
                  <i className="fas fa-print mr-1 sm:mr-2"></i><span className="hidden sm:inline">Print Profile</span><span className="sm:hidden">Print</span>
                </button>
                {canEdit && (
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center ${
                      isEditing 
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                        : 'bg-medical-primary text-white hover:bg-medical-primary/90'
                    }`}
                    data-testid="button-edit-patient"
                  >
                    <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'} mr-1 sm:mr-2`}></i>
                    <span className="hidden sm:inline">{isEditing ? 'Cancel' : 'Edit'}</span><span className="sm:hidden">{isEditing ? 'X' : 'Edit'}</span>
                  </button>
                )}
                <button 
                  onClick={onClear}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors mr-2"
                  data-testid="button-close"
                >
                  <i className="fas fa-times mr-1"></i>Close
                </button>
                <Link href="/">
                  <button 
                    className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
                    data-testid="button-home"
                  >
                    <i className="fas fa-home mr-1"></i>Home
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Patient Info Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 md:mt-6">
              <div className="bg-slate-50 p-2 sm:p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide">Patient ID</p>
                <p className="font-mono font-semibold text-medical-text-primary text-xs sm:text-sm" data-testid="text-patient-id">{displayPatient.id}</p>
              </div>
              <div className="bg-slate-50 p-2 sm:p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide">MRN</p>
                <p className="font-mono font-semibold text-medical-text-primary text-xs sm:text-sm" data-testid="text-patient-mrn">{displayPatient.mrn}</p>
              </div>
              <div className="bg-slate-50 p-2 sm:p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide">Admitted</p>
                <p className="font-semibold text-medical-text-primary text-xs sm:text-sm" data-testid="text-patient-admitted">{formatDate(displayPatient.admitted)}</p>
              </div>
              <div className="bg-slate-50 p-2 sm:p-3 rounded-lg col-span-2 sm:col-span-1">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide">Status</p>
                {isEditing ? (
                  <select 
                    value={editData.status}
                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                    className="w-full mt-1 p-1 border rounded text-sm"
                    data-testid="select-status"
                  >
                    <option value="Triage">Triage</option>
                    <option value="Observation">Observation</option>
                    <option value="Active Labor">Active Labor</option>
                    <option value="LDR (Labor, Delivery, Recovery)">LDR (Labor, Delivery, Recovery)</option>
                    <option value="Delivery Imminent">Delivery Imminent</option>
                    <option value="Pushing / Second Stage">Pushing / Second Stage</option>
                    <option value="In OR / C-Section">In OR / C-Section</option>
                    <option value="PACU (Post-Anesthesia Care Unit)">PACU (Post-Anesthesia Care Unit)</option>
                    <option value="Postpartum Recovery">Postpartum Recovery</option>
                    <option value="Postpartum / Couplet Care">Postpartum / Couplet Care</option>
                    <option value="Discharge Pending">Discharge Pending</option>
                  </select>
                ) : (
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(displayPatient.status)}`} data-testid="text-patient-status">
                    {displayPatient.status}
                  </span>
                )}
              </div>
            </div>
            
            {/* Extended Patient Info - Editable */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide mb-2">Provider</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.provider}
                    onChange={(e) => setEditData({...editData, provider: e.target.value})}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Enter provider name"
                    data-testid="input-provider"
                  />
                ) : (
                  <p className="text-sm text-medical-text-primary" data-testid="text-patient-provider">{displayPatient.provider}</p>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide mb-2">Bed</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.bed}
                    onChange={(e) => setEditData({...editData, bed: e.target.value})}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Enter bed number"
                    data-testid="input-bed"
                  />
                ) : (
                  <p className="text-sm text-medical-text-primary font-mono" data-testid="text-patient-bed">{displayPatient.bed}</p>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide mb-2">Age</p>
                {isEditing ? (
                  <input 
                    type="number" 
                    value={editData.age}
                    onChange={(e) => setEditData({...editData, age: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Enter age"
                    min="0"
                    max="150"
                    data-testid="input-age"
                  />
                ) : (
                  <p className="text-sm text-medical-text-primary" data-testid="text-patient-age">{displayPatient.age} years</p>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide mb-2">Weight</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.doseWeight}
                    onChange={(e) => setEditData({...editData, doseWeight: e.target.value})}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Enter weight (e.g., 75 kg)"
                    data-testid="input-weight"
                  />
                ) : (
                  <p className="text-sm text-medical-text-primary" data-testid="text-patient-weight">{displayPatient.doseWeight}</p>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide mb-2">Allergies</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.allergies}
                    onChange={(e) => setEditData({...editData, allergies: e.target.value})}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Enter known allergies"
                    data-testid="input-allergies"
                  />
                ) : (
                  <p className={`text-sm ${
                    displayPatient.allergies && displayPatient.allergies.toLowerCase() !== 'none' 
                      ? 'text-red-600 font-medium' 
                      : 'text-medical-text-primary'
                  }`} data-testid="text-patient-allergies">
                    {displayPatient.allergies}
                  </p>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide mb-2">Isolation</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.isolation}
                    onChange={(e) => setEditData({...editData, isolation: e.target.value})}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Isolation precautions"
                    data-testid="input-isolation"
                  />
                ) : (
                  <p className="text-sm text-medical-text-primary" data-testid="text-patient-isolation">{displayPatient.isolation}</p>
                )}
              </div>
              
              <div className="bg-slate-50 p-2 sm:p-3 rounded-lg md:col-span-3">
                <p className="text-xs font-medium text-medical-text-muted uppercase tracking-wide mb-2">Notes</p>
                {isEditing ? (
                  <textarea 
                    value={editData.notes}
                    onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    className="w-full p-2 border rounded text-sm h-20 resize-none"
                    placeholder="Add clinical notes..."
                    data-testid="textarea-notes"
                  />
                ) : (
                  <p className="text-sm text-medical-text-primary" data-testid="text-patient-notes">{displayPatient.notes}</p>
                )}
              </div>
            </div>
            
            {/* Save/Cancel/Delete Buttons */}
            {isEditing && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-medical-border">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  data-testid="button-delete-patient"
                >
                  <i className="fas fa-trash mr-2"></i>Delete Patient
                </button>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updatePatientMutation.isPending}
                    className="px-6 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-save-edit"
                  >
                    {updatePatientMutation.isPending ? (
                      <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
                    ) : (
                      <><i className="fas fa-save mr-2"></i>Save Changes</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Patient Navigation Tabs */}
          <div className="px-2 sm:px-6">
            <nav className="flex flex-wrap justify-center sm:justify-between gap-1 sm:gap-0" aria-label="Patient Tabs">
              <button 
                onClick={() => setActiveTab('medication')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'medication'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-medication"
              >
                <i className="fas fa-pills mr-1"></i><span className="hidden sm:inline">MAW</span><span className="sm:hidden">Meds</span>
              </button>
              <button 
                onClick={() => setActiveTab('record')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'record'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-record"
              >
                <i className="fas fa-history mr-1"></i><span className="hidden sm:inline">MAR</span><span className="sm:hidden">Hist</span>
              </button>
              <button 
                onClick={() => setActiveTab('chart')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'chart'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-chart"
              >
                <i className="fas fa-file-medical mr-1"></i>Chart
              </button>
              <button 
                onClick={() => setActiveTab('carenotes')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'carenotes'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-care-notes"
              >
                <i className="fas fa-notes-medical mr-1"></i><span className="hidden sm:inline">Care Notes</span><span className="sm:hidden">Notes</span>
              </button>
              <button 
                onClick={() => setActiveTab('prescriptions')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'prescriptions'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-prescriptions"
              >
                <i className="fas fa-prescription-bottle mr-1"></i><span className="hidden sm:inline">Rx Manager</span><span className="sm:hidden">Rx</span>
              </button>
              <button 
                onClick={() => setActiveTab('vitals')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'vitals'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-vitals"
              >
                <i className="fas fa-heartbeat mr-1"></i><span className="hidden sm:inline">Vital Signs</span><span className="sm:hidden">Vitals</span>
              </button>
              <button 
                onClick={() => setActiveTab('labresults')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'labresults'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-labresults"
              >
                <i className="fas fa-vial mr-1"></i>Results
              </button>
              <button 
                onClick={() => setActiveTab('audit')}
                className={`py-2 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm rounded-t-md flex-1 sm:flex-initial min-w-[60px] ${
                  activeTab === 'audit'
                    ? 'border-medical-primary text-medical-primary bg-medical-primary/5'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-slate-50'
                }`}
                data-testid="tab-audit-log"
              >
                <i className="fas fa-clipboard-list mr-1"></i><span className="hidden sm:inline">Change Log</span><span className="sm:hidden">Log</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'medication' && <DoubleConfirmationMedicationAdmin patient={patient} />}
        
        {activeTab === 'prescriptions' && <PrescriptionManager patient={patient} />}
        
        {activeTab === 'vitals' && <EnhancedVitals patient={patient} />}
        
        {activeTab === 'labresults' && <LabResults patient={patient} />}
        
        {activeTab === 'chart' && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-medical border border-medical-border p-3 sm:p-4 md:p-6 mx-auto">
            <h3 className="text-lg font-semibold text-medical-text-primary mb-3 sm:mb-4">Chart</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div>
                <h4 className="font-medium text-medical-text-primary mb-2">Background</h4>
                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: patient.chartData?.background || '<p>No background information available.</p>' }}></div>
              </div>
              <div>
                <h4 className="font-medium text-medical-text-primary mb-2">Summary</h4>
                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: patient.chartData?.summary || '<p>No summary available.</p>' }}></div>
              </div>
              <div>
                <h4 className="font-medium text-medical-text-primary mb-2">Discharge Plan</h4>
                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: patient.chartData?.discharge || '<p>No discharge plan available.</p>' }}></div>
              </div>
              <div>
                <h4 className="font-medium text-medical-text-primary mb-2">Handoff</h4>
                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: patient.chartData?.handoff || '<p>No handoff information available.</p>' }}></div>
              </div>
            </div>
            
            {/* Provider Orders Section */}
            <ProviderOrders patient={patient} />
          </div>
        )}

        {activeTab === 'record' && (
          <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-medical-text-primary">
                <i className="fas fa-history text-medical-primary mr-2"></i>Administration Record
              </h3>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-medical-text-muted">
                  {administrations.length} administration{administrations.length !== 1 ? 's' : ''}
                </div>
                {administrations.length > 0 && (
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setAdminViewMode('cards')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        adminViewMode === 'cards' 
                          ? 'bg-white text-medical-primary shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      data-testid="button-admin-cards-view"
                    >
                      <i className="fas fa-th-large mr-1"></i>Cards
                    </button>
                    <button
                      onClick={() => setAdminViewMode('table')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        adminViewMode === 'table' 
                          ? 'bg-white text-medical-primary shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      data-testid="button-admin-table-view"
                    >
                      <i className="fas fa-table mr-1"></i>Table
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {administrations.length === 0 ? (
              <div className="text-center py-8 text-medical-text-muted">
                <i className="fas fa-history text-4xl mb-4 opacity-30"></i>
                <p className="text-lg font-medium mb-2">No Administrations Yet</p>
                <p className="text-sm">Medication administrations will appear here once medicines are scanned.</p>
              </div>
            ) : (
              <div>
                {adminViewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">Status</th>
                          <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">Medicine</th>
                          <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">MedID</th>
                          <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">Admin. At</th>
                          <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">Admin. By</th>
                          <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">Next Dose</th>
                          <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">Doses Left</th>
                          {canDelete && <th className="text-center py-3 px-3 font-medium text-medical-text-secondary">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {administrations
                          .sort((a, b) => new Date(b.administeredAt || 0).getTime() - new Date(a.administeredAt || 0).getTime())
                          .map((admin) => {
                            const medicine = medicines.find(m => m.id === admin.medicineId);
                            const statusColor = admin.status === 'success' || admin.status === 'administered' ? 'text-green-600' : 
                                               admin.status === 'warning' ? 'text-yellow-600' : 
                                               admin.status === 'collected' ? 'text-orange-600' : 'text-red-600';
                            const bgColor = admin.status === 'success' || admin.status === 'administered' ? 'bg-green-50' : 
                                           admin.status === 'warning' ? 'bg-yellow-50' : 
                                           admin.status === 'collected' ? 'bg-orange-50' : 'bg-red-50';
                            
                            return (
                              <tr 
                                key={admin.id} 
                                className="border-b border-gray-100 hover:bg-gray-50"
                                data-testid={`admin-record-${admin.id}`}
                              >
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor} ${bgColor}`}>
                                    <i className={`fas ${admin.status === 'success' || admin.status === 'administered' ? 'fa-check' : admin.status === 'warning' ? 'fa-exclamation-triangle' : admin.status === 'collected' ? 'fa-hand-holding-medical' : 'fa-times'} mr-1`}></i>
                                    {admin.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="font-medium text-medical-text-primary">
                                    {medicine?.name || 'Unknown Medicine'}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="font-mono text-sm text-medical-text-muted">{admin.medicineId}</span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="text-sm text-medical-text-primary">
                                    {admin.administeredAt ? new Date(admin.administeredAt).toLocaleString([], { 
                                      timeZone: 'America/New_York',
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    }) : 'Not recorded'}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <AdminByDisplay administeredBy={admin.administeredBy || ''} />
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {(admin.status === 'success' || admin.status === 'administered') && admin.administeredAt && (() => {
                                    const prescription = prescriptions.find(p => p.medicineId === admin.medicineId);
                                    return prescription ? (
                                      <NextDoseCountdown 
                                        lastAdministeredAt={admin.administeredAt}
                                        periodicity={prescription.periodicity}
                                      />
                                    ) : (
                                      <span className="text-xs text-medical-text-muted">No prescription</span>
                                    );
                                  })()}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {(() => {
                                    // First try to find prescription by the exact prescription ID from the administration record
                                    let prescription = prescriptions.find(p => p.id === admin.prescriptionId);
                                    // If not found, fall back to medicine ID match (for backward compatibility)
                                    if (!prescription) {
                                      prescription = prescriptions.find(p => p.medicineId === admin.medicineId);
                                    }
                                    return prescription ? (
                                      <span className="text-sm text-medical-text-primary">
                                        {calculateRemainingDoses(prescription, administrations)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-medical-text-muted">-</span>
                                    );
                                  })()}
                                </td>
                                {canDelete && (
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={() => handleAdminDeleteClick(admin)}
                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                      data-testid={`delete-admin-${admin.id}`}
                                      title="Delete administration record"
                                    >
                                      <i className="fas fa-trash text-sm"></i>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {administrations
                      .sort((a, b) => new Date(b.administeredAt || 0).getTime() - new Date(a.administeredAt || 0).getTime())
                      .map((admin) => {
                        const medicine = medicines.find(m => m.id === admin.medicineId);
                        const statusColor = admin.status === 'success' || admin.status === 'administered' ? 'text-green-600' : 
                                           admin.status === 'warning' ? 'text-yellow-600' : 
                                           admin.status === 'collected' ? 'text-orange-600' : 'text-red-600';
                        const bgColor = admin.status === 'success' || admin.status === 'administered' ? 'bg-green-50 border-green-200' : 
                                       admin.status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                                       admin.status === 'collected' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200';
                        
                        return (
                          <div 
                            key={admin.id} 
                            className={`p-4 rounded-lg border ${bgColor}`}
                            data-testid={`admin-record-card-${admin.id}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${statusColor.replace('text-', 'bg-')}`}></div>
                                <div>
                                  <h4 className="font-medium text-medical-text-primary">
                                    {medicine?.name || `Medicine ID: ${admin.medicineId}`}
                                  </h4>
                                  <p className="text-xs text-medical-text-muted font-mono">ID: {admin.medicineId}</p>
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                <div className="flex items-center justify-end space-x-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor} ${bgColor}`}>
                                    <i className={`fas ${admin.status === 'success' || admin.status === 'administered' ? 'fa-check' : admin.status === 'warning' ? 'fa-exclamation-triangle' : admin.status === 'collected' ? 'fa-hand-holding-medical' : 'fa-times'} mr-1`}></i>
                                    {admin.status.toUpperCase()}
                                  </span>
                                  {canDelete && (
                                    <button
                                      onClick={() => handleAdminDeleteClick(admin)}
                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                      data-testid={`delete-admin-card-${admin.id}`}
                                      title="Delete administration record"
                                    >
                                      <i className="fas fa-trash text-sm"></i>
                                    </button>
                                  )}
                                </div>
                                {admin.administeredAt && (
                                  <div>
                                    <p className="text-xs text-medical-text-muted">
                                      {new Date(admin.administeredAt).toLocaleString([], { 
                                        timeZone: 'America/New_York',
                                        month: 'short', 
                                        day: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </p>
                                    {(admin.status === 'success' || admin.status === 'administered') && (() => {
                                      const prescription = prescriptions.find(p => p.medicineId === admin.medicineId);
                                      return prescription && (
                                        <div className="mt-1 space-y-1">
                                          <NextDoseCountdown 
                                            lastAdministeredAt={admin.administeredAt}
                                            periodicity={prescription.periodicity}
                                          />
                                          <div className="text-xs text-medical-text-muted">
                                            <i className="fas fa-pills mr-1"></i>
                                            Doses Left: {calculateRemainingDoses(prescription, administrations)}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-start">
                              <p className={`text-sm ${statusColor} font-medium flex-1 mr-4`}>{admin.message}</p>
                              <div className="text-right">
                                <div className="text-xs text-medical-text-muted mb-1">Administered by:</div>
                                <AdminByDisplay administeredBy={admin.administeredBy || ''} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <AuditLogComponent 
            entityType="patient" 
            entityId={patient.id} 
            title="Patient Change Log" 
          />
        )}
        
        {activeTab === 'carenotes' && <CareNotes patient={patient} />}
      </div>

      {/* Delete Patient PIN Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border max-w-md w-full">
            <div className="p-6 border-b border-medical-border">
              <h3 className="text-lg font-semibold text-red-600">
                <i className="fas fa-exclamation-triangle mr-2"></i>Delete Patient
              </h3>
              <p className="text-medical-text-muted mt-2">
                This action will permanently delete <strong>{patient.name}</strong> and all associated records. This cannot be undone.
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="delete-pin" className="block text-sm font-medium text-medical-text-secondary mb-2">
                  Enter PIN code to confirm deletion:
                </label>
                <input
                  id="delete-pin"
                  type="password"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter PIN"
                  data-testid="input-delete-pin"
                />
                {deletePin && deletePin !== "149500" && (
                  <p className="text-red-600 text-sm mt-1">Invalid PIN code</p>
                )}
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePatient}
                  disabled={deletePin !== "149500" || deletePatientMutation.isPending}
                  className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-confirm-delete"
                >
                  {deletePatientMutation.isPending ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Deleting...</>
                  ) : (
                    <><i className="fas fa-trash mr-2"></i>Delete Patient</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Administration Record Confirmation Modal */}
      {showAdminDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Administration Record</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this administration record for <strong>{selectedAdmin?.medicineId}</strong>? 
              This action cannot be undone.
            </p>
            
            {user?.role === 'instructor' && (
              <div className="mb-4">
                <label htmlFor="adminDeletePin" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter PIN to confirm deletion
                </label>
                <input
                  id="adminDeletePin"
                  type="password"
                  value={adminDeletePin}
                  onChange={(e) => setAdminDeletePin(e.target.value)}
                  placeholder="Enter instructor PIN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
            
            {adminDeleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{adminDeleteError}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAdminDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={deleteAdminMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleAdminDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={deleteAdminMutation.isPending || (user?.role === 'instructor' && !adminDeletePin)}
              >
                {deleteAdminMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
