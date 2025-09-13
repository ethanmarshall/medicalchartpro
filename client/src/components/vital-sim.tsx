import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { type Patient } from '@shared/schema';

interface VitalSimProps {
  patient: Patient;
  vitalsData?: {
    pulse?: number;
    temperature?: string;
    respirationRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    oxygenSaturation?: number;
  };
  onManualLog?: () => void;
}

export interface VitalSimRef {
  logCurrentVitals: () => Promise<boolean>;
}

export const VitalSim = forwardRef<VitalSimRef, VitalSimProps>(function VitalSim({ patient, vitalsData, onManualLog }, ref) {
  // Canvas refs for each waveform
  const canvasRefs = {
    ecg: useRef<HTMLCanvasElement>(null),
    spo2: useRef<HTMLCanvasElement>(null),
    resp: useRef<HTMLCanvasElement>(null),
  };

  // State for vital signs display
  const [vitals, setVitals] = useState({
    hr: vitalsData?.pulse || (patient.age < 1 ? 132 : 80), // 132 for infants, 80 for adults
    spo2: vitalsData?.oxygenSaturation || 98,
    resp: vitalsData?.respirationRate || 16,
    nibp: `${vitalsData?.bloodPressureSystolic || 120}/${vitalsData?.bloodPressureDiastolic || 80}`,
    temp: vitalsData?.temperature ? 
      ((parseFloat(vitalsData.temperature) - 32) * 5/9) : 37.0,
  });

  const vitalsRef = useRef(vitals);
  useEffect(() => {
    vitalsRef.current = vitals;
  }, [vitals]);

  // Update vitals when new data comes in
  useEffect(() => {
    if (vitalsData) {
      setVitals({
        hr: vitalsData.pulse || vitals.hr,
        spo2: vitalsData.oxygenSaturation || vitals.spo2,
        resp: vitalsData.respirationRate || vitals.resp,
        nibp: `${vitalsData.bloodPressureSystolic || 120}/${vitalsData.bloodPressureDiastolic || 80}`,
        temp: vitalsData.temperature ? 
          (typeof vitalsData.temperature === 'string' && !vitalsData.temperature.includes('°F') ? 
            ((parseFloat(vitalsData.temperature) - 32) * 5/9) : 
            parseFloat(vitalsData.temperature)) : vitals.temp,
      });
    }
  }, [vitalsData]);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [nibpTime, setNibpTime] = useState(() => {
    // Simulate BP taken 15 minutes ago
    const now = new Date();
    now.setMinutes(now.getMinutes() - 15);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const [lastLoggedTime, setLastLoggedTime] = useState<string | null>(null);

  // Responsive canvas sizing with useState hook - MOVED UP to fix initialization error
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  });
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile(); // Check immediately
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // NOTE: Automated vitals logging has been moved to server-side (AutoVitalsService)
  // This prevents race conditions and ensures exactly one logging event per 15-minute interval

  // Vital signs variation timer - updates values every 2000ms
  useEffect(() => {
    const updateVitals = () => {
      const config = simState.stateConfig;
      
      setVitals(prevVitals => ({
        // HR: +3/-2 range (if base is 80, range is 78-83)
        hr: Math.floor(config.hr.base + (Math.random() * 5 - 2)), // -2 to +3
        // SpO2: Fixed values 97-99
        spo2: 97 + Math.floor(Math.random() * 3), // 97, 98, or 99
        // RR: Fixed values 15-19
        resp: 15 + Math.floor(Math.random() * 5), // 15, 16, 17, 18, or 19
        temp: config.temp.base + (Math.random() - 0.5) * 2 * config.temp.range,
        nibp: prevVitals.nibp, // Keep BP stable - only update when "measured"
      }));
    };

    // Update immediately on mount
    updateVitals();
    
    // Then update every 2000ms
    const vitalsInterval = setInterval(updateVitals, 2000);
    
    return () => clearInterval(vitalsInterval);
  }, []);

  // Blood pressure update timer - every 10 minutes (600000ms)
  useEffect(() => {
    const updateBloodPressure = () => {
      const config = simState.stateConfig;
      const newSystolic = Math.floor(config.nibp.sys + (Math.random() * 10 - 5));
      const newDiastolic = Math.floor(config.nibp.dia + (Math.random() * 10 - 5));
      
      setVitals(prevVitals => ({
        ...prevVitals,
        nibp: `${newSystolic}/${newDiastolic}`
      }));
      
      // Update the BP time display
      setNibpTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    
    // Set initial BP with variation immediately
    updateBloodPressure();
    
    // Update BP every 10 minutes (600000ms)
    const bpInterval = setInterval(updateBloodPressure, 600000);
    
    return () => clearInterval(bpInterval);
  }, []);

  // Manual vitals logging function (exposed to parent)
  const logCurrentVitalsManually = async () => {
    try {
      const [systolic, diastolic] = vitals.nibp.split('/').map(n => parseInt(n.trim()));
      
      const vitalData = {
        pulse: Math.round(vitals.hr),
        temperature: ((vitals.temp * 9/5) + 32).toFixed(1), // Store as numeric Fahrenheit value
        respirationRate: Math.round(vitals.resp),
        bloodPressureSystolic: systolic,
        bloodPressureDiastolic: diastolic,
        oxygenSaturation: Math.round(vitals.spo2),
        notes: `Manual vitals reading - recorded at ${new Date().toLocaleTimeString()}`,
        takenAt: new Date(),
        takenBy: 'manual-entry',
      };

      const response = await fetch(`/api/patients/${patient.id}/vitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vitalData),
        credentials: 'include',
      });

      if (response.ok) {
        console.log(`✅ Manually logged vitals at ${new Date().toLocaleTimeString()}`);
        // Invalidate vitals query to refresh the UI immediately
        if (typeof window !== 'undefined') {
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'vitals'] });
        }
        // Call parent callback if provided
        if (onManualLog) {
          onManualLog();
        }
        return true;
      } else {
        console.error('Failed to log vitals:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error logging vitals:', error);
      return false;
    }
  };

  // Expose manual log function to parent via ref
  useImperativeHandle(ref, () => ({
    logCurrentVitals: logCurrentVitalsManually,
  }));

  // NOTE: Automated background vitals logging functions removed - now handled server-side

  // Automatic vitals logging function (now used only for manual logging)
  const logVitalsToDatabase = async (currentVitals: typeof vitals, logTime: string) => {
    try {
      const [systolic, diastolic] = currentVitals.nibp.split('/').map(n => parseInt(n.trim()));
      
      const vitalData = {
        pulse: Math.round(currentVitals.hr),
        temperature: ((currentVitals.temp * 9/5) + 32).toFixed(1), // Store as numeric Fahrenheit value
        respirationRate: Math.round(currentVitals.resp),
        bloodPressureSystolic: systolic,
        bloodPressureDiastolic: diastolic,
        oxygenSaturation: Math.round(currentVitals.spo2),
        notes: `Manual vitals entry - recorded at ${logTime}`,
        takenAt: new Date(),
        takenBy: 'system-manual',
      };

      const response = await fetch(`/api/patients/${patient.id}/vitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vitalData),
        credentials: 'include',
      });

      if (response.ok) {
        console.log(`✅ Manually logged vitals at ${logTime}`);
        // Invalidate vitals query to refresh the UI immediately
        if (typeof window !== 'undefined') {
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'vitals'] });
        }
      } else {
        console.error('Failed to log vitals:', await response.text());
      }
    } catch (error) {
      console.error('Error logging vitals:', error);
    }
  };

  // Simulation state
  const simState = useRef({
    time: 0,
    spo2Phase: 0,
    respPhase: 0,
    dataPoints: {} as Record<string, number[]>,
    animationFrameId: null as number | null,
    stateConfig: {
      hr: { 
        base: vitalsData?.pulse || (patient.age < 1 ? 132 : 80), // 132 for infants (125-140 range), 80 for adults
        range: 5 
      },
      spo2: { base: vitalsData?.oxygenSaturation || 98, range: 1.5 },
      resp: { base: vitalsData?.respirationRate || 16, range: 2 },
      nibp: { sys: vitalsData?.bloodPressureSystolic || 120, dia: vitalsData?.bloodPressureDiastolic || 80 },
      temp: { base: 37.0, range: 0.167 }
    }
  }).current;

  useEffect(() => {
    const contexts = {
      ecg: canvasRefs.ecg.current?.getContext('2d'),
      spo2: canvasRefs.spo2.current?.getContext('2d'),
      resp: canvasRefs.resp.current?.getContext('2d'),
    };
    
    const colors = { ecg: '#16a34a', spo2: '#0891b2', resp: '#d97706' };
    const TAU = Math.PI * 2;

    const setupCanvases = () => {
      Object.keys(canvasRefs).forEach(key => {
        const canvas = canvasRefs[key as keyof typeof canvasRefs].current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        const ctx = contexts[key as keyof typeof contexts];
        if (ctx) {
          ctx.scale(dpr, dpr);
          simState.dataPoints[key] = new Array(Math.floor(canvas.offsetWidth)).fill(canvas.offsetHeight / 2);
        }
      });
    };

    // ECG waveform generation
    const getEcgPoint = () => {
      const currentHr = vitalsRef.current.hr;
      const period = 60 / currentHr;
      const x = (simState.time % period) / period;
      let y = 0;

      const qrs_dur_seconds = 0.172;
      const qrs_dur = qrs_dur_seconds / period;

      const p_start = 0.1, p_dur = 0.1;
      const qrs_start = 0.25;
      const t_start = qrs_start + qrs_dur + 0.08;
      const t_dur = 0.2;

      if (x >= p_start && x < p_start + p_dur) {
        y = 0.3 * Math.sin((x - p_start) * Math.PI / p_dur);
      } else if (x >= qrs_start && x < qrs_start + qrs_dur) {
        const qrs_x = x - qrs_start;
        const q_point = qrs_dur * 0.2;
        const r_peak = qrs_dur * 0.5;
        const s_point = qrs_dur * 0.8;

        if (qrs_x < q_point) {
          y = -2.0 * (qrs_x / q_point);
        } else if (qrs_x < r_peak) {
          y = -2.0 + (10.0 * (qrs_x - q_point) / (r_peak - q_point));
        } else if (qrs_x < s_point) {
          y = 8.0 - (11.0 * (qrs_x - r_peak) / (s_point - r_peak));
        } else {
          y = -3.0 + (3.0 * (qrs_x - s_point) / (qrs_dur - s_point));
        }
      } else if (x >= t_start && x < t_start + t_dur) {
        y = 0.6 * Math.sin((x - t_start) * Math.PI / t_dur);
      }

      const canvasHeight = canvasRefs.ecg.current?.offsetHeight || 200;
      return (canvasHeight * 0.65) - y * (canvasHeight / 12); // Moved waveform down from center to 65% down
    };

    // SpO2 waveform generation  
    const getSpo2Point = () => {
      function spo2Wave(phase: number, canvasHeight: number) {
        const params = {
          yMin: 0.20, p1: 0.90, notch: 0.61, p2: 0.69,
          t1: 0.19, t2: 0.305, t3: 0.36, a1: 0.48, a2: 0.65,
          bumpGamma: 1.25, tailShape: 1.6,
          amplitude: canvasHeight / 2.5,
          baseline: canvasHeight / 2
        };

        const smootherstep = (u: number) => u*u*u*(u*(u*6 - 15) + 10);
        const warp = (u: number, a: number = 1) => smootherstep(Math.max(0, Math.min(1, u)) ** a);
        const easeCos = (u: number, g: number = 1.25) => 0.5 - 0.5 * Math.cos(Math.PI * (Math.max(0, Math.min(1, u)) ** g));

        const x = phase / TAU;

        const _t2 = Math.max(params.t2, params.t1 + 1e-3);
        const _t3 = Math.min(Math.max(params.t3, _t2 + 1e-3), 0.95);

        let y;
        if (x < params.t1) {
          const u = x / params.t1;
          y = params.yMin + (params.p1 - params.yMin) * warp(u, params.a1);
        } else if (x < _t2) {
          const u = (x - params.t1) / (_t2 - params.t1);
          y = params.notch + (params.p1 - params.notch) * (1 - warp(u, params.a2));
        } else if (x < _t3) {
          const u = (x - _t2) / (_t3 - _t2);
          y = params.notch + (params.p2 - params.notch) * easeCos(u, params.bumpGamma);
        } else {
          const u = (x - _t3) / (1 - _t3);
          const s = warp(u, params.tailShape);
          y = params.yMin + (params.p2 - params.yMin) * (1 - s);
        }

        return params.baseline - params.amplitude * (y - params.yMin);
      }

      const canvasHeight = canvasRefs.spo2.current?.offsetHeight || 200;
      return spo2Wave(simState.spo2Phase, canvasHeight);
    };

    // Respiratory waveform generation
    const getRespPoint = () => {
      const canvasHeight = canvasRefs.resp.current?.offsetHeight || 200;

      function smoothAsymmetricSine(phase: number) {
        const primaryWave = Math.sin(phase);
        const secondaryWave = 0.3 * Math.sin(phase * 2);
        return (primaryWave + secondaryWave) / 1.12;
      }

      const phase = simState.respPhase;
      const amp = canvasHeight / 5.0;
      const baseline = canvasHeight / 2;

      return baseline - amp * smoothAsymmetricSine(phase);
    };

    const dataPointGenerators = { ecg: getEcgPoint, spo2: getSpo2Point, resp: getRespPoint };

    const drawWaveform = (key: keyof typeof canvasRefs) => {
      const ctx = contexts[key];
      const canvas = canvasRefs[key].current;
      if (!ctx || !canvas) return;
      const width = canvas.offsetWidth;
      ctx.clearRect(0, 0, width, canvas.offsetHeight);
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = colors[key];
      ctx.moveTo(0, simState.dataPoints[key][0]);
      for (let i = 1; i < width; i++) {
        ctx.lineTo(i, simState.dataPoints[key][i]);
      }
      ctx.stroke();
    };

    const animate = () => {
      const frameTime = 0.016;
      simState.time += frameTime;

      const hrBpm = vitalsRef.current.hr;
      const hrPeriod = 60 / hrBpm;
      const spo2PhaseIncrement = (TAU / hrPeriod) * frameTime;
      simState.spo2Phase = (simState.spo2Phase + spo2PhaseIncrement) % TAU;

      const respBpm = vitalsRef.current.resp;
      const respPeriod = 60 / respBpm;
      const respPhaseIncrement = (TAU / respPeriod) * frameTime;
      simState.respPhase = (simState.respPhase + respPhaseIncrement) % TAU;

      Object.keys(canvasRefs).forEach(key => {
        const typedKey = key as keyof typeof canvasRefs;
        if (simState.dataPoints[key]) {
          simState.dataPoints[key].push(dataPointGenerators[typedKey]());
          simState.dataPoints[key].shift();
          drawWaveform(typedKey);
        }
      });

      simState.animationFrameId = requestAnimationFrame(animate);
    };

    setupCanvases();
    animate();

    const timeInterval = setInterval(() => 
      setCurrentTime(new Date().toLocaleTimeString()), 1000);
    
    window.addEventListener('resize', setupCanvases);

    return () => {
      clearInterval(timeInterval);
      if (simState.animationFrameId) {
        cancelAnimationFrame(simState.animationFrameId);
      }
      window.removeEventListener('resize', setupCanvases);
    };
  }, []);

  const getPanelAlertClass = (vital: keyof typeof vitals | number, high: number, low: number) => {
    const value = typeof vital === 'number' ? vital : vitals[vital];
    return (typeof value === 'number' && (value > high || value < low)) ? 'alert-active' : '';
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    color: '#1f2937',
    fontFamily: 'sans-serif',
    width: '100%',
    maxWidth: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    overflow: isMobile ? 'auto' : 'hidden', // Allow scrolling on mobile
    maxHeight: isMobile ? '100vh' : 'none', // Limit height on mobile to enable scrolling
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '0.5rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    flexWrap: 'wrap',
    gap: '0.5rem',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: 'clamp(0.75rem, 2vw, 1.5rem)',
    height: 'clamp(750px, 98vh, 1000px)',
    padding: 'clamp(0.75rem, 2vw, 1.5rem)',
    flexGrow: 1,
    minHeight: '750px',
    width: '100%',
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 'clamp(0.5rem, 1vw, 0.75rem)',
    padding: isMobile ? '0.25rem' : 'clamp(0.5rem, 1.2vw, 1rem)', // Ultra minimal padding on mobile
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    minHeight: '100%',
    width: '100%',
    justifyContent: 'flex-start',
    gap: isMobile ? '0.125rem' : '0.25rem', // Tighter spacing on mobile
  };

  const getCanvasStyle = (panelType: string): React.CSSProperties => {
    const isEcg = panelType === 'ecg';
    
    // Mobile: Much taller canvases in very compact panels
    if (isMobile) {
      return {
        width: '100%',
        height: '112px', // All canvases now 112px
        backgroundSize: '16px 16px',
        borderRadius: '0.375rem',
        display: 'block',
        overflow: 'hidden',
      };
    }
    
    // Desktop: normal canvas heights
    return {
      width: '100%',
      height: isEcg ? '200px' : '96px',
      backgroundSize: 'clamp(8px, 1.5vw, 16px) clamp(8px, 1.5vw, 16px)',
      borderRadius: '0.375rem',
      display: 'block',
      overflow: 'hidden',
    };
  };

  return (
    <div style={containerStyle}>
      <style>{`
        /* Mobile Layout (Default for small screens) */
        .vital-sim-container {
          grid-template-columns: 1fr;
          grid-template-rows: auto;
          gap: 1rem !important;
        }

        /* Mobile-specific panel heights for massive canvas visibility and scrollability */
        @media (max-width: 768px) {
          .vital-sim-container {
            height: auto !important;
            min-height: auto !important;
            overflow-y: auto !important; /* Make it scrollable */
            max-height: 100vh !important; /* Don't exceed viewport */
          }
          
          .vital-sim-container .panel-ecg { 
            grid-column: 1; 
            grid-row: 1;
            min-height: 200px !important; /* Compact 200px panel */
          }
          .vital-sim-container .panel-spo2 { 
            grid-column: 1; 
            grid-row: 2;
            min-height: 200px !important; /* Compact 200px panel */
          }
          .vital-sim-container .panel-resp { 
            grid-column: 1; 
            grid-row: 3;
            min-height: 200px !important; /* Compact 200px panel */
          }
          .vital-sim-container .panel-nibp { 
            grid-column: 1; 
            grid-row: 4;
            min-height: 160px !important; /* Still reasonable for BP display */
          }
          .vital-sim-container .panel-temp { 
            grid-column: 1; 
            grid-row: 5;
            min-height: 160px !important; /* Still reasonable for temp display */
          }
        }

        /* Tablet Layout */
        @media (min-width: 769px) and (max-width: 1024px) {
          .vital-sim-container {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: 280px 180px 160px;
          }
          
          .vital-sim-container .panel-ecg { 
            grid-column: 1 / -1; 
            grid-row: 1;
          }
          .vital-sim-container .panel-spo2 { 
            grid-column: 1; 
            grid-row: 2;
          }
          .vital-sim-container .panel-resp { 
            grid-column: 2; 
            grid-row: 2;
          }
          .vital-sim-container .panel-nibp { 
            grid-column: 1; 
            grid-row: 3;
          }
          .vital-sim-container .panel-temp { 
            grid-column: 2; 
            grid-row: 3;
          }
        }

        /* Desktop Layout (Large screens) */
        @media (min-width: 1025px) {
          .vital-sim-container {
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: 320px 200px 180px;
          }
          
          .vital-sim-container .panel-ecg { 
            grid-column: 1 / -1; 
            grid-row: 1;
          }
          .vital-sim-container .panel-spo2 { 
            grid-column: 1 / 3; 
            grid-row: 2;
          }
          .vital-sim-container .panel-resp { 
            grid-column: 3 / 5; 
            grid-row: 2;
          }
          .vital-sim-container .panel-nibp { 
            grid-column: 1 / 3; 
            grid-row: 3;
          }
          .vital-sim-container .panel-temp { 
            grid-column: 3 / 5; 
            grid-row: 3;
          }
        }
        
        .vital-sim-container .panel-header { 
          display: flex; 
          align-items: baseline; 
          width: 100%; 
          flex-wrap: wrap;
          gap: clamp(0.25rem, 1vw, 0.5rem);
          justify-content: space-between;
        }
        .vital-sim-container .panel-header > div { 
          flex: 1; 
          min-width: fit-content;
          text-align: center;
        }
        .vital-sim-container .panel-header > div:first-child { 
          text-align: left; 
        }
        .vital-sim-container .panel-header > div:last-child { 
          text-align: right; 
        }
        
        .vital-sim-container .panel-header-horizontal { 
          display: flex; 
          flex-direction: row; 
          justify-content: space-between; 
          align-items: center; 
          width: 100%; 
          padding: 0.5rem 0; 
          gap: clamp(0.5rem, 2vw, 1rem);
        }
        .vital-sim-container .panel-header-horizontal > div { 
          flex: 0 1 auto; 
          min-width: fit-content; 
        }
        
        .vital-sim-container .panel-title { 
          font-size: clamp(0.875rem, 2.5vw, 1.5rem); 
          font-weight: 700; 
          line-height: 1.2;
        }
        .vital-sim-container .panel-value-number { 
          font-size: clamp(2rem, 8vw, 3.75rem);
        }
        
        /* Mobile-specific font sizes AND canvas sizes */
        @media (max-width: 768px) {
          .vital-sim-container .panel-title { 
            font-size: 1.2rem !important;
            font-weight: 600;
          }
          .vital-sim-container .panel-value-number { 
            font-size: 2.5rem !important;
            line-height: 1.1 !important;
          }
          .vital-sim-container .panel-unit { 
            font-size: 1rem !important;
          }
          
          /* MOBILE CANVAS HEIGHTS - Fill the tall containers */
          .vital-sim-container canvas {
            background-size: 12px 12px !important;
          }
          .vital-sim-container .panel-ecg canvas {
            height: 112px !important; /* Match our JavaScript height */
            max-height: 112px !important;
          }
          .vital-sim-container .panel-spo2 canvas {
            height: 112px !important; /* Match our JavaScript height */
            max-height: 112px !important;
          }
          .vital-sim-container .panel-resp canvas {
            height: 112px !important; /* Match our JavaScript height */
            max-height: 112px !important;
          }
        }
        .vital-sim-container .panel-value-unit { 
          font-size: clamp(0.75rem, 2.5vw, 1.5rem); 
          font-weight: 700; 
          margin-left: clamp(0.125rem, 0.5vw, 0.25rem); 
        }
        
        .vital-sim-container .text-green { color: #16a34a; }
        .vital-sim-container .text-cyan { color: #0891b2; }
        .vital-sim-container .text-amber { color: #ca8a04; }
        .vital-sim-container .text-gray { color: #374151; }
        .vital-sim-container .text-orange { color: #ea580c; }
        
        .vital-sim-container .panel-centered { 
          justify-content: center; 
          align-items: center; 
          text-align: center; 
        }
        .vital-sim-container .panel-centered .panel-value-main { 
          margin: clamp(0.5rem, 2vw, 1rem) 0; 
        }
        .vital-sim-container .panel-centered .value-number { 
          font-size: clamp(2rem, 8vw, 4.5rem); 
          font-weight: 700;
          line-height: 1;
        }
        .vital-sim-container .panel-centered .value-unit { 
          font-size: clamp(0.75rem, 2vw, 1.125rem); 
        }
        
        .vital-sim-container .canvas-container { 
          width: calc(100% - 10px); /* Account for 5px padding on each side */
          /* Height is controlled by JavaScript getCanvasStyle() function */
          overflow: hidden;
          flex-shrink: 0;
          margin: -10px auto 5px auto; /* Move up 15px from original 5px top margin */
        }
        
        .vital-sim-container .ecg-canvas-bg { 
          background-image: linear-gradient(rgba(22, 163, 74, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(22, 163, 74, 0.1) 1px, transparent 1px); 
        }
        .vital-sim-container .spo2-canvas-bg { 
          background-image: linear-gradient(rgba(8, 145, 178, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(8, 145, 178, 0.1) 1px, transparent 1px); 
        }
        .vital-sim-container .resp-canvas-bg { 
          background-image: linear-gradient(rgba(217, 119, 6, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 119, 6, 0.1) 1px, transparent 1px); 
        }
        
        @keyframes pulse-border { 
          0% { border-color: #ef4444; box-shadow: 0 0 clamp(5px, 1vw, 10px) #ef4444; } 
          50% { border-color: #b91c1c; box-shadow: 0 0 clamp(10px, 2vw, 20px) #b91c1c; } 
          100% { border-color: #ef4444; box-shadow: 0 0 clamp(5px, 1vw, 10px) #ef4444; } 
        }
        .vital-sim-container .alert-active { animation: pulse-border 1s infinite; }
        
        /* Tablet Layout (iPad) */
        @media (max-width: 1024px) and (min-width: 768px) {
          .vital-sim-container { 
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: 320px 200px 180px; /* ECG gets 320px, SpO2/Resp get 200px, NIBP/Temp get 180px */
          }
          .vital-sim-container .panel-ecg { 
            grid-column: 1 / -1; 
            grid-row: 1; /* ECG takes row 1 (250px) */
          }
          .vital-sim-container .panel-spo2 { 
            grid-column: 1 / 3; 
            grid-row: 2; /* SpO2 takes row 2 (120px) */
          }
          .vital-sim-container .panel-resp { 
            grid-column: 3 / 5; 
            grid-row: 2; /* Resp takes row 2 (120px) */
          }
          .vital-sim-container .panel-nibp { 
            grid-column: 1 / 3; 
            grid-row: 3; /* NIBP takes row 3 (120px) */
          }
          .vital-sim-container .panel-temp { 
            grid-column: 3 / 5; 
            grid-row: 3; /* Temp takes row 3 (120px) */
          }
        }
        
        /* Mobile Layout (iPhone and small screens) */
        @media (max-width: 767px) {
          .vital-sim-container { 
            grid-template-columns: repeat(2, 1fr); 
            grid-template-rows: 2fr 2fr 2fr 2fr; 
            height: clamp(800px, 98vh, 950px); 
            max-height: 98vh;
            gap: clamp(0.25rem, 1vw, 0.375rem);
            padding: clamp(0.25rem, 1vw, 0.5rem);
          }
          
          /* ECG */
          .vital-sim-container .panel-ecg { 
            grid-column: 1 / -1 !important; 
            grid-row: 1 / 2 !important;
          }
          
          /* SpO2 */
          .vital-sim-container .panel-spo2 { 
            grid-column: 1 / -1 !important; 
            grid-row: 2 / 3 !important;
          }
          
          /* Resp */
          .vital-sim-container .panel-resp { 
            grid-column: 1 / -1 !important; 
            grid-row: 3 / 4 !important;
          }
          
          /* BP */
          .vital-sim-container .panel-nibp { 
            grid-column: 1 / 2 !important; 
            grid-row: 4 / 6 !important;
          }
          
          /* Body Temp */
          .vital-sim-container .panel-temp { 
            grid-column: 2 / 3 !important; 
            grid-row: 4 / 6 !important;
          }
          
          .vital-sim-container .panel-header > div:nth-child(2) { 
            text-align: left; 
            order: -1;
            width: 100%;
            margin-bottom: 0.75rem;
          }
          
          .vital-sim-container .panel-header > div:nth-child(3) { 
            text-align: left; 
            width: 100%;
          }
          
          .vital-sim-container .panel-header-horizontal { 
            padding: 0.125rem 0; 
            gap: clamp(0.25rem, 1vw, 0.5rem);
            display: flex;
            justify-content: space-between;
            width: 100%;
          }
          .vital-sim-container .panel-header-horizontal > div { 
            flex: 1; 
            text-align: center;
          }
          .vital-sim-container .panel-header-horizontal > div:first-child { 
            text-align: left; 
          }
          .vital-sim-container .panel-header-horizontal > div:last-child { 
            text-align: right; 
          }
          
          .vital-sim-container .panel-title { 
            font-size: clamp(0.625rem, 2.5vw, 0.75rem); 
            line-height: 1.1;
            margin-bottom: clamp(0.125rem, 0.5vw, 0.25rem);
          }
          
          .vital-sim-container .panel-value-number { 
            font-size: clamp(1rem, 4vw, 1.25rem); 
            line-height: 1;
          }
          
          .vital-sim-container .panel-value-unit { 
            font-size: clamp(0.625rem, 2.5vw, 0.75rem); 
          }
          
          .vital-sim-container .panel-centered .value-number { 
            font-size: clamp(1.25rem, 5vw, 1.5rem); 
            line-height: 1;
          }
          
          .vital-sim-container .panel-centered .value-unit { 
            font-size: clamp(0.625rem, 2.5vw, 0.75rem); 
          }
          
          .vital-sim-container .panel-centered .panel-value-main { 
            margin: clamp(0.5rem, 2vw, 0.75rem) 0; 
          }
          
          .vital-sim-container .canvas-container { 
            height: 112px;
            max-height: 112px;
            margin-top: clamp(-0.8rem, -1vw, -0.6rem);
            overflow: hidden;
            flex-shrink: 0;
          }
        }
        
        /* Very Small Mobile Screens */
        @media (max-width: 480px) {
          .vital-sim-container { 
            height: clamp(700px, 95vh, 850px); 
            gap: clamp(0.375rem, 3vw, 0.5rem);
            padding: clamp(0.5rem, 3vw, 0.75rem);
          }
          
          .vital-sim-container .panel-header { 
            flex-direction: column; 
            align-items: flex-start; 
            gap: 0.375rem;
          }
          
          .vital-sim-container .panel-header > div { 
            text-align: left !important; 
            width: 100%;
          }
          
          .vital-sim-container .panel-header-horizontal { 
            flex-direction: row; 
            justify-content: space-between; 
            gap: 0.25rem;
          }
          .vital-sim-container .panel-header-horizontal > div { 
            text-align: left !important; 
            width: auto;
            flex: 1;
          }
          .vital-sim-container .panel-header-horizontal > div:nth-child(3) { 
            text-align: right !important; 
          }
          
          .vital-sim-container .panel-title { 
            font-size: clamp(0.625rem, 3.5vw, 0.75rem); 
          }
          
          .vital-sim-container .panel-value-number { 
            font-size: clamp(1rem, 5vw, 1.25rem); 
          }
          
          .vital-sim-container .panel-centered .value-number { 
            font-size: clamp(1.125rem, 6vw, 1.375rem); 
          }
        }
        
        /* Compact layout styles for infant vitals (age < 1) */
        .infant-vitals {
          margin: 0 auto !important;
        }
        
        /* Mobile Layout for Infant Vitals */
        @media (max-width: 767px) {
          .infant-vitals {
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: 2fr 2fr 2fr !important;
            height: auto !important;
            max-height: none !important;
          }
          
          .infant-vitals .panel-ecg { 
            grid-column: 1 / -1 !important; 
            grid-row: 1 / 3 !important;
          }
          .infant-vitals .panel-temp { 
            grid-column: 1 / -1 !important; 
            grid-row: 3 !important;
          }
        }
        
        /* Tablet Layout for Infant Vitals */
        @media (min-width: 768px) and (max-width: 1024px) {
          .infant-vitals {
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: 280px 180px !important;
            height: auto !important;
            max-height: none !important;
          }
          
          .infant-vitals .panel-ecg { 
            grid-column: 1 / -1 !important; 
            grid-row: 1 !important;
          }
          .infant-vitals .panel-temp { 
            grid-column: 1 / -1 !important; 
            grid-row: 2 !important;
          }
        }
        
        /* Desktop Layout for Infant Vitals */
        @media (min-width: 1025px) {
          .infant-vitals {
            grid-template-columns: repeat(3, 1fr) !important;
            grid-template-rows: 320px !important;
            height: auto !important;
            max-height: none !important;
          }
          
          .infant-vitals .panel-ecg { 
            grid-column: 1 / 3 !important; 
            grid-row: 1 !important;
          }
          .infant-vitals .panel-temp { 
            grid-column: 3 !important; 
            grid-row: 1 !important;
          }
        }
        
        .infant-vitals .panel-ecg,
        .infant-vitals .panel-temp {
          height: 100% !important;
          min-height: 250px !important;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 0.75rem;
        }
        
        .infant-vitals .panel-header-horizontal {
          padding: 0.25rem 0 !important;
          margin-bottom: 0.5rem !important;
        }
        
        .infant-vitals .panel-title {
          font-size: 1rem !important;
          font-weight: 700;
          line-height: 1.2;
        }
        
        .infant-vitals .panel-value-number {
          font-size: 2rem !important;
          font-weight: bold;
          line-height: 1;
        }
        
        .infant-vitals .panel-value-unit {
          font-size: 1rem !important;
          font-weight: 700;
        }
        
        .infant-vitals .canvas-container {
          height: calc(100% - 60px) !important;
          margin-top: 0.5rem;
        }
        
        /* Ensure canvas fills container for infant vitals */
        .infant-vitals canvas {
          height: 100% !important;
          width: 100% !important;
        }
        
        /* Compact header for infant vitals */
        .infant-vitals .value-number {
          font-size: 2.5rem !important;
          font-weight: bold;
          line-height: 1;
        }
        
        .infant-vitals .value-unit {
          font-size: 1.125rem !important;
          font-weight: 700;
        }
      `}</style>
      
      <header style={headerStyle}>
        <div style={{ fontWeight: 700, minWidth: 'fit-content' }}>
          <span>PATIENT:</span> {patient.name.toUpperCase()}
          <span style={{ marginLeft: 'clamp(0.5rem, 2vw, 1rem)' }}>ID:</span> {patient.id}
        </div>
        <div style={{ fontFamily: 'monospace', color: '#4b5563', minWidth: 'fit-content', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{currentTime}</div>
      </header>
      
      <main 
        style={patient.age < 1 ? {
          ...gridStyle,
          height: 'clamp(375px, 50vh, 500px)',
          minHeight: '375px',
          gap: 'clamp(0.5rem, 2vw, 1rem)',
          padding: 'clamp(0.5rem, 2vw, 1rem)'
        } : gridStyle} 
        className={patient.age < 1 ? "vital-sim-container infant-vitals" : "vital-sim-container"}>
        {/* ECG Panel - Always shown */}
        <div className={`panel-ecg ${getPanelAlertClass('hr', patient.age < 1 ? 150 : 120, patient.age < 1 ? 110 : 50)}`} style={panelStyle}>
          <div className="panel-header-horizontal text-green">
            <div className="panel-title">ECG II</div>
            <h1 className="panel-title">Heart Rate</h1>
            <div className="panel-title">
              <span className="panel-value-number">{Math.round(vitals.hr)}</span>
              <span className="panel-value-unit">bpm</span>
            </div>
          </div>
          <div className="canvas-container">
            <canvas ref={canvasRefs.ecg} className="ecg-canvas-bg" style={getCanvasStyle('ecg')}></canvas>
          </div>
        </div>

        {/* Temperature Panel - Always shown */}
        <div className={`panel-temp panel-centered ${getPanelAlertClass((vitals.temp * 9/5) + 32, 100.4, 97.0)}`} style={{...panelStyle, justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
          <div className="text-orange">
            <div className="panel-title">Temp</div>
          </div>
          <div className="panel-value-main">
            <div className="text-orange">
              <span className="value-number">{((vitals.temp * 9/5) + 32).toFixed(1)}</span>
              <span className="value-unit">°F</span>
            </div>
          </div>
          <div style={{ fontSize: 'clamp(0.625rem, 2.5vw, 0.75rem)', color: '#6b7280', fontWeight: 700 }}>
            Core
          </div>
        </div>

        {/* Only show additional vitals for patients 1 year old or older */}
        {patient.age >= 1 && (
          <>
            {/* SpO2 Panel */}
            <div className={`panel-spo2 ${getPanelAlertClass('spo2', 100, 90)}`} style={panelStyle}>
              <div className="panel-header-horizontal text-cyan">
                <div className="panel-title">SpO₂</div>
                <h1 className="panel-title">Pleth</h1>
                <div className="panel-title">
                  <span className="panel-value-number">{Math.round(vitals.spo2)}</span>
                  <span className="panel-value-unit">%</span>
                </div>
              </div>
              <div className="canvas-container">
                <canvas ref={canvasRefs.spo2} className="spo2-canvas-bg" style={getCanvasStyle('spo2')}></canvas>
              </div>
            </div>

            {/* Respiratory Panel */}
            <div className={`panel-resp ${getPanelAlertClass('resp', 25, 8)}`} style={panelStyle}>
              <div className="panel-header-horizontal text-amber">
                <div className="panel-title">RESP</div>
                <h1 className="panel-title">Resp. Rate</h1>
                <div className="panel-title">
                  <span className="panel-value-number">{Math.round(vitals.resp)}</span>
                  <span className="panel-value-unit">rpm</span>
                </div>
              </div>
              <div className="canvas-container">
                <canvas ref={canvasRefs.resp} className="resp-canvas-bg" style={getCanvasStyle('resp')}></canvas>
              </div>
            </div>

            {/* NIBP Panel */}
            <div className="panel-nibp panel-centered" style={{...panelStyle, justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
              <div className="text-gray">
                <div className="panel-title">NIBP</div>
              </div>
              <div className="panel-value-main">
                <div className="text-gray">
                  <span className="value-number">{vitals.nibp}</span>
                  <span className="value-unit">mmHg</span>
                </div>
              </div>
              <div style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', color: '#6b7280' }}>
                Last: {nibpTime}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
});