import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAlerts } from "@/contexts/alert-context";

interface MedicationAlert {
  id: string;
  patientName: string;
  medicationName: string;
  dose: string;
  route: string;
  type: 'warning' | 'due' | 'overdue';
  dueTime: string;
  timeUntilDue?: string;
}

interface AlertPopupProps {
  alert: MedicationAlert;
  onClose: () => void;
}

function AlertPopup({ alert, onClose }: AlertPopupProps) {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Auto-close after 30 seconds if not manually closed
    const timer = setTimeout(() => {
      onClose();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getAlertColor = () => {
    switch (alert.type) {
      case 'warning': return 'bg-yellow-500';
      case 'due': return 'bg-orange-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getAlertIcon = () => {
    switch (alert.type) {
      case 'warning': return 'fa-clock';
      case 'due': return 'fa-bell';
      case 'overdue': return 'fa-exclamation-triangle';
      default: return 'fa-info';
    }
  };

  const getAlertTitle = () => {
    switch (alert.type) {
      case 'warning': return '⚠️ Medication Reminder';
      case 'due': return '🔔 Medication Due Now';
      case 'overdue': return '🚨 OVERDUE MEDICATION';
      default: return 'Medication Alert';
    }
  };

  const getAlertMessage = () => {
    switch (alert.type) {
      case 'warning': return `Due in 1 hour at ${new Date(alert.dueTime).toLocaleTimeString()}`;
      case 'due': return `Due now!`;
      case 'overdue': return `Overdue!`;
      default: return '';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-4 duration-500">
      <div className={`${getAlertColor()} text-white rounded-xl shadow-2xl border-2 border-white p-6 max-w-sm relative`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
          data-testid="button-close-alert"
        >
          <i className="fas fa-times text-sm"></i>
        </button>

        {/* Alert icon */}
        <div className="flex items-center mb-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
            <i className={`fas ${getAlertIcon()} text-xl`}></i>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight">{getAlertTitle()}</h3>
          </div>
        </div>

        {/* Patient and medication info */}
        <div className="space-y-2">
          <div className="flex items-center">
            <i className="fas fa-user mr-2 text-white opacity-80"></i>
            <span className="font-semibold">{alert.patientName}</span>
          </div>
          
          <div className="flex items-center">
            <i className="fas fa-pills mr-2 text-white opacity-80"></i>
            <span>{alert.medicationName} ({alert.dose}, {alert.route})</span>
          </div>
          
          <div className="flex items-center">
            <i className="fas fa-clock mr-2 text-white opacity-80"></i>
            <span className="font-semibold">{getAlertMessage()}</span>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4 pt-3 border-t border-white border-opacity-20">
          <button
            onClick={onClose}
            className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            data-testid="button-acknowledge-alert"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

export function MedicationAlerts() {
  const [alerts, setAlerts] = useState<MedicationAlert[]>([]);
  const { acknowledgeOverdueAlert, acknowledgeAlert, shouldShowAlert } = useAlerts();

  // Check for medication alerts every 5 seconds
  const { data: alertsData } = useQuery<{alerts: MedicationAlert[]}>({
    queryKey: ['/api/medication-alerts'],
    refetchInterval: 5000,
    staleTime: 0
  });

  useEffect(() => {
    if (alertsData?.alerts) {
      const newAlerts = alertsData.alerts.filter((alert) => 
        shouldShowAlert(alert.id, alert.type)
      );

      if (newAlerts.length > 0) {
        // Show new alerts
        setAlerts(prev => {
          // Remove any existing alerts for the same medication to prevent duplicates
          const filtered = prev.filter(existingAlert => 
            !newAlerts.some(newAlert => newAlert.id === existingAlert.id)
          );
          return [...filtered, ...newAlerts];
        });
      }
    }
  }, [alertsData, shouldShowAlert]);

  const closeAlert = (alertIndex: number) => {
    const alert = alerts[alertIndex];
    if (alert) {
      // Mark as acknowledged based on the alert type
      acknowledgeAlert(alert.id, alert.type);
      
      // Keep backward compatibility for overdue alerts
      if (alert.type === 'overdue') {
        acknowledgeOverdueAlert(alert.id);
      }
    }
    setAlerts(prev => prev.filter((_, index) => index !== alertIndex));
  };

  return (
    <>
      {alerts.map((alert, index) => (
        <AlertPopup
          key={`${alert.id}-${alert.type}-${index}`}
          alert={alert}
          onClose={() => closeAlert(index)}
        />
      ))}
    </>
  );
}