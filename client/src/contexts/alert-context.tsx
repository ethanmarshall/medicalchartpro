import { createContext, useContext, useState, ReactNode } from "react";

interface AlertContextType {
  acknowledgedOverdueAlerts: string[];
  acknowledgedAlerts: Map<string, string>; // alertId -> highest acknowledged threshold
  acknowledgeOverdueAlert: (alertId: string) => void;
  unacknowledgeOverdueAlert: (alertId: string) => void;
  acknowledgeAlert: (alertId: string, alertType: 'warning' | 'due' | 'overdue') => void;
  shouldShowAlert: (alertId: string, alertType: 'warning' | 'due' | 'overdue') => boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [acknowledgedOverdueAlerts, setAcknowledgedOverdueAlerts] = useState<string[]>([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Map<string, string>>(new Map());

  const acknowledgeOverdueAlert = (alertId: string) => {
    setAcknowledgedOverdueAlerts(prev => {
      if (prev.includes(alertId)) return prev;
      return [...prev, alertId];
    });
    // Also mark as acknowledged in the new system
    acknowledgeAlert(alertId, 'overdue');
  };

  const unacknowledgeOverdueAlert = (alertId: string) => {
    setAcknowledgedOverdueAlerts(prev => prev.filter(id => id !== alertId));
    setAcknowledgedAlerts(prev => {
      const updated = new Map(prev);
      updated.delete(alertId);
      return updated;
    });
  };

  const acknowledgeAlert = (alertId: string, alertType: 'warning' | 'due' | 'overdue') => {
    setAcknowledgedAlerts(prev => {
      const updated = new Map(prev);
      updated.set(alertId, alertType);
      return updated;
    });
  };

  const getThresholdLevel = (alertType: 'warning' | 'due' | 'overdue'): number => {
    switch (alertType) {
      case 'warning': return 1;
      case 'due': return 2;
      case 'overdue': return 3;
      default: return 0;
    }
  };

  const shouldShowAlert = (alertId: string, alertType: 'warning' | 'due' | 'overdue'): boolean => {
    const acknowledgedThreshold = acknowledgedAlerts.get(alertId);
    if (!acknowledgedThreshold) {
      return true; // Never acknowledged, show the alert
    }
    
    const currentLevel = getThresholdLevel(alertType);
    const acknowledgedLevel = getThresholdLevel(acknowledgedThreshold as 'warning' | 'due' | 'overdue');
    
    // Only show if current alert level is higher than what was previously acknowledged
    return currentLevel > acknowledgedLevel;
  };

  return (
    <AlertContext.Provider value={{
      acknowledgedOverdueAlerts,
      acknowledgedAlerts,
      acknowledgeOverdueAlert,
      unacknowledgeOverdueAlert,
      acknowledgeAlert,
      shouldShowAlert
    }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}