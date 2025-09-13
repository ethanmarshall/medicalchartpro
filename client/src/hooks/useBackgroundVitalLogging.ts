import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Patient } from "@shared/schema";

interface VitalSigns {
  hr: number;
  spo2: number;
  resp: number;
  temp: number;
  nibp: string;
}

export function useBackgroundVitalLogging() {
  const lastLoggedTimeRef = useRef<string | null>(null);
  const vitalsRef = useRef<Record<string, VitalSigns>>({});

  // Get all patients
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  // Generate realistic vitals for a patient based on their profile
  const generateVitalsForPatient = (patient: Patient): VitalSigns => {
    // Base vitals (can be customized per patient later)
    const baseVitals = {
      hr: 75,
      spo2: 98,
      resp: 16,
      temp: 36.8, // Celsius
      systolic: 120,
      diastolic: 80
    };

    // Add some variation
    return {
      hr: Math.floor(baseVitals.hr + (Math.random() * 10 - 5)), // ±5 variation
      spo2: 97 + Math.floor(Math.random() * 3), // 97-99
      resp: 15 + Math.floor(Math.random() * 5), // 15-19
      temp: baseVitals.temp + (Math.random() - 0.5) * 2, // ±1°C variation
      nibp: `${baseVitals.systolic + Math.floor(Math.random() * 20 - 10)}/${baseVitals.diastolic + Math.floor(Math.random() * 10 - 5)}`
    };
  };

  // Initialize vitals for all patients
  useEffect(() => {
    if (patients.length > 0) {
      const initialVitals: Record<string, VitalSigns> = {};
      patients.forEach(patient => {
        initialVitals[patient.id] = generateVitalsForPatient(patient);
      });
      vitalsRef.current = initialVitals;
    }
  }, [patients]);

  // Update vitals every 2 minutes for variation
  useEffect(() => {
    const updateVitals = () => {
      patients.forEach(patient => {
        vitalsRef.current[patient.id] = generateVitalsForPatient(patient);
      });
    };

    const vitalsInterval = setInterval(updateVitals, 120000); // Every 2 minutes
    return () => clearInterval(vitalsInterval);
  }, [patients]);

  // Log vitals to database function
  const logVitalsToDatabase = async (patientId: string, currentVitals: VitalSigns, logTime: string) => {
    try {
      const [systolic, diastolic] = currentVitals.nibp.split('/').map(n => parseInt(n.trim()));
      
      const vitalData = {
        pulse: Math.round(currentVitals.hr),
        temperature: ((currentVitals.temp * 9/5) + 32).toFixed(1), // Store as Fahrenheit
        respirationRate: Math.round(currentVitals.resp),
        bloodPressureSystolic: systolic,
        bloodPressureDiastolic: diastolic,
        oxygenSaturation: Math.round(currentVitals.spo2),
        notes: `Automated background vitals monitoring - recorded at ${logTime}`,
        takenAt: new Date(),
        takenBy: 'system-auto',
      };

      const response = await fetch(`/api/patients/${patientId}/vitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vitalData),
        credentials: 'include',
      });

      if (response.ok) {
        console.log(`✅ Background vitals logged for patient ${patientId} at ${logTime}`);
      } else {
        console.error(`Failed to log vitals for patient ${patientId}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error logging vitals for patient ${patientId}:`, error);
    }
  };

  // Automatic vitals logging timer - checks every minute for 15-minute intervals
  useEffect(() => {
    const checkAndLogVitals = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentTimeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      // Check if we're at one of the logging intervals: 0:00, 0:15, 0:30, 0:45
      const isLoggingTime = currentMinute % 15 === 0;
      
      if (isLoggingTime && lastLoggedTimeRef.current !== currentTimeString && patients.length > 0) {
        console.log(`🕐 Background automatic vitals logging triggered at ${currentTimeString} for ${patients.length} patients`);
        
        // Log vitals for all patients
        patients.forEach(patient => {
          const patientVitals = vitalsRef.current[patient.id];
          if (patientVitals) {
            logVitalsToDatabase(patient.id, patientVitals, currentTimeString);
          }
        });
        
        lastLoggedTimeRef.current = currentTimeString;
      }
    };
    
    // Check immediately when component mounts
    checkAndLogVitals();
    
    // Then check every minute
    const interval = setInterval(checkAndLogVitals, 60000);
    
    return () => clearInterval(interval);
  }, [patients]);

  return {
    isLogging: patients.length > 0,
    patientCount: patients.length
  };
}