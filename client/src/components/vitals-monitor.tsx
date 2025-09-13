import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Patient } from "@shared/schema";
import { VitalSim } from './vital-sim';

interface VitalsMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VitalSigns {
  id: string;
  patientId: string;
  pulse: number;
  temperature: string;
  respirationRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenSaturation?: number;
  notes?: string;
  takenBy?: string;
  takenAt?: string;
  createdAt: string;
}

export function VitalsMonitor({ isOpen, onClose }: VitalsMonitorProps) {
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');

  // Get all patients
  const { data: patients = [], isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  // Note: Individual patient vitals queries are handled in their respective components

  const handlePatientSelection = (patientId: string, isSelected: boolean) => {
    if (isSelected) {
      if (viewMode === 'single') {
        setSelectedPatients([patientId]);
      } else {
        if (selectedPatients.length < 8) {
          setSelectedPatients([...selectedPatients, patientId]);
        }
      }
    } else {
      setSelectedPatients(selectedPatients.filter(id => id !== patientId));
    }
  };

  const handleViewModeChange = (mode: 'single' | 'multi') => {
    setViewMode(mode);
    setSelectedPatients([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-medical-border w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <i className="fas fa-heartbeat text-2xl"></i>
              <div>
                <h2 className="text-xl font-semibold">Vitals Monitor</h2>
                <p className="text-teal-100 text-sm">Live patient vitals monitoring</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-teal-700 rounded-lg p-2 transition-colors"
              data-testid="button-close-vitals-monitor"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* View Mode Selection */}
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => handleViewModeChange('single')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'single'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                data-testid="button-single-mode"
              >
                <i className="fas fa-user mr-2"></i>Single Patient
              </button>
              <button
                onClick={() => handleViewModeChange('multi')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'multi'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                data-testid="button-multi-mode"
              >
                <i className="fas fa-users mr-2"></i>Multi-Patient (up to 8)
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {viewMode === 'single' 
                ? 'Select one patient to view live vitals and complete records'
                : 'Select up to 8 patients to monitor live vitals side by side'
              }
            </p>
          </div>

          {/* Patient Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Selection</h3>
            {patientsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {patients.map((patient) => {
                  const isSelected = selectedPatients.includes(patient.id);
                  const canSelect = viewMode === 'single' || selectedPatients.length < 8 || isSelected;
                  
                  return (
                    <label
                      key={patient.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50'
                          : canSelect
                          ? 'border-gray-300 hover:border-teal-300 hover:bg-teal-50'
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handlePatientSelection(patient.id, e.target.checked)}
                        disabled={!canSelect}
                        className="mr-3 text-teal-600"
                        data-testid={`checkbox-patient-${patient.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{patient.name}</div>
                        <div className="text-sm text-gray-500">ID: {patient.id} • Bed: {patient.bed}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vitals Display */}
          {selectedPatients.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {viewMode === 'single' ? 'Patient Vitals & Records' : 'Live Vitals Overview'}
              </h3>

              {viewMode === 'single' ? (
                // Single patient view with full VitalSim and records
                <SinglePatientView patientId={selectedPatients[0]} />
              ) : (
                // Multi-patient view with just vital numbers
                <MultiPatientView patientIds={selectedPatients} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Single patient view component
function SinglePatientView({ patientId }: { patientId: string }) {
  const { data: patient } = useQuery<Patient>({
    queryKey: ['/api/patients', patientId],
  });

  const { data: vitals = [] } = useQuery<VitalSigns[]>({
    queryKey: ['/api/patients', patientId, 'vitals'],
  });

  if (!patient) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">{patient.name}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-600">ID:</span> {patient.id}</div>
          <div><span className="text-gray-600">Bed:</span> {patient.bed}</div>
          <div><span className="text-gray-600">Age:</span> {patient.age}</div>
          <div><span className="text-gray-600">Status:</span> {patient.status}</div>
        </div>
      </div>

      {/* Live Vitals Monitor */}
      <div className={`bg-white border border-gray-200 rounded-lg ${patient.age < 1 ? 'p-3' : 'p-4'}`}>
        <h5 className={`font-medium text-gray-900 ${patient.age < 1 ? 'mb-2' : 'mb-4'}`}>Live Vitals Monitor</h5>
        <VitalSim 
          patient={patient} 
          vitalsData={vitals.length > 0 ? {
            pulse: vitals[0].pulse,
            temperature: vitals[0].temperature,
            respirationRate: vitals[0].respirationRate,
            bloodPressureSystolic: vitals[0].bloodPressureSystolic,
            bloodPressureDiastolic: vitals[0].bloodPressureDiastolic,
            oxygenSaturation: vitals[0].oxygenSaturation,
          } : undefined}
        />
      </div>

      {/* Recent Vitals Records */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-4">Recent Vitals Records</h5>
        {vitals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-heartbeat text-4xl mb-4 opacity-30"></i>
            <p>No vitals recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {vitals
              .sort((a, b) => new Date(b.takenAt || b.createdAt).getTime() - new Date(a.takenAt || a.createdAt).getTime())
              .slice(0, 10).map((vital) => (
              <div key={vital.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="font-medium">HR: {vital.pulse} bpm</span>
                    {patient.age >= 1 && (
                      <span className="font-medium">BP: {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}</span>
                    )}
                    <span className="font-medium">Temp: {vital.temperature}°F</span>
                    {patient.age >= 1 && (
                      <span className="font-medium">RR: {vital.respirationRate}</span>
                    )}
                    {patient.age >= 1 && vital.oxygenSaturation && (
                      <span className="font-medium">O2: {vital.oxygenSaturation}%</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(vital.takenAt || vital.createdAt).toLocaleString()}
                  </div>
                </div>
                {vital.notes && (
                  <p className="text-sm text-gray-600 mt-2">{vital.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Multi-patient view component
function MultiPatientView({ patientIds }: { patientIds: string[] }) {
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  const filteredPatients = patients.filter(p => patientIds.includes(p.id));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredPatients.map((patient) => (
        <PatientVitalsCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}

// Individual patient vitals card component with live data generation
function PatientVitalsCard({ patient }: { patient: Patient }) {
  const [liveVitals, setLiveVitals] = useState({
    hr: patient.age < 1 ? 132 : 80, // 132 for infants, 80 for adults
    spo2: 98,
    resp: 16,
    nibp: "120/80",
    temp: 98.6
  });

  // Set up the same vitals simulation logic as VitalSim
  useEffect(() => {
    // Patient-specific base configuration for variety
    const patientHash = patient.id.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    const baseOffset = Math.abs(patientHash % 20); // 0-19 offset based on patient ID
    
    const config = {
      hr: { 
        base: patient.age < 1 ? (125 + (baseOffset % 15)) : (75 + baseOffset), // 125-140 for infants, 75-95 for adults
        range: 5 
      },
      spo2: { base: 98, range: 1.5 },
      resp: { base: 14 + (baseOffset % 6), range: 2 },
      nibp: { sys: 115 + (baseOffset % 15), dia: 75 + (baseOffset % 10) },
      temp: { base: 98.4 + (baseOffset % 3) * 0.2, range: 0.3 }
    };

    const updateVitals = () => {
      setLiveVitals(prevVitals => ({
        // HR: +3/-2 range around base
        hr: Math.floor(config.hr.base + (Math.random() * 5 - 2)),
        // SpO2: Fixed values 97-99
        spo2: 97 + Math.floor(Math.random() * 3),
        // RR: Variable around base
        resp: Math.floor(config.resp.base + (Math.random() * 4 - 2)),
        // Temperature in Fahrenheit with variation
        temp: config.temp.base + (Math.random() - 0.5) * 2 * config.temp.range,
        nibp: prevVitals.nibp, // Keep BP stable until BP update
      }));
    };

    const updateBloodPressure = () => {
      const newSystolic = Math.floor(config.nibp.sys + (Math.random() * 10 - 5));
      const newDiastolic = Math.floor(config.nibp.dia + (Math.random() * 8 - 4));
      
      setLiveVitals(prevVitals => ({
        ...prevVitals,
        nibp: `${newSystolic}/${newDiastolic}`
      }));
    };

    // Initialize with patient-specific values
    updateVitals();
    updateBloodPressure();
    
    // Update vitals every 2 seconds
    const vitalsInterval = setInterval(updateVitals, 2000);
    
    // Update BP every 15 seconds for demo (faster than real VitalSim)
    const bpInterval = setInterval(updateBloodPressure, 15000);
    
    return () => {
      clearInterval(vitalsInterval);
      clearInterval(bpInterval);
    };
  }, [patient.id]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Patient Header */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h5 className="font-semibold text-gray-900 truncate">{patient.name}</h5>
        <div className="text-sm text-gray-500">
          Bed: {patient.bed} • ID: {patient.id.slice(-4)}
        </div>
      </div>

      {/* Live Vitals Numbers */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Heart Rate</span>
          <span className="font-semibold text-red-600">
            {liveVitals.hr} bpm
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Temperature</span>
          <span className="font-semibold text-orange-600">
            {liveVitals.temp.toFixed(1)}°F
          </span>
        </div>
        {/* Only show additional vitals for patients 1 year old or older */}
        {patient.age >= 1 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Blood Pressure</span>
              <span className="font-semibold text-blue-600">
                {liveVitals.nibp} mmHg
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Respiration</span>
              <span className="font-semibold text-purple-600">
                {liveVitals.resp} /min
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">O2 Sat</span>
              <span className="font-semibold text-green-600">
                {liveVitals.spo2}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Status Indicator */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-center">
          <div className="w-3 h-3 rounded-full mr-2 bg-green-500 animate-pulse"></div>
          <span className="text-xs text-gray-600">Live Data</span>
        </div>
      </div>
    </div>
  );
}