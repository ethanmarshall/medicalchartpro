import { useState } from "react";
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

export function AlertMenuButton() {
  // Use try-catch to handle context errors gracefully
  let acknowledgedOverdueAlerts: string[] = [];
  let acknowledgeOverdueAlert = (alertId: string) => {};
  
  try {
    const alertsContext = useAlerts();
    acknowledgedOverdueAlerts = alertsContext.acknowledgedOverdueAlerts;
    acknowledgeOverdueAlert = alertsContext.acknowledgeOverdueAlert;
  } catch (error) {
    // If context is not available, continue with defaults
    console.log('Alert context not available, using defaults');
  }
  const [showMenu, setShowMenu] = useState(false);
  const [, setLocation] = useLocation();
  
  // Fetch medication alerts
  const { data: alertsData } = useQuery<{alerts: MedicationAlert[]}>({
    queryKey: ['/api/medication-alerts'],
    refetchInterval: 5000,
    staleTime: 0
  });

  const alerts = alertsData?.alerts || [];
  
  // Group alerts by type for display
  const overdueAlerts = alerts.filter(alert => alert.type === 'overdue');
  const dueAlerts = alerts.filter(alert => alert.type === 'due');  
  const warningAlerts = alerts.filter(alert => alert.type === 'warning');
  
  // Determine the most urgent alert level
  const getMostUrgentLevel = () => {
    if (overdueAlerts.length > 0) return 'overdue';
    if (dueAlerts.length > 0) return 'due';
    if (warningAlerts.length > 0) return 'warning';
    return 'none';
  };

  const mostUrgentLevel = getMostUrgentLevel();
  const totalAlerts = alerts.length;

  // Get button color based on most urgent alert
  const getButtonColor = () => {
    switch (mostUrgentLevel) {
      case 'overdue': return 'bg-red-500 hover:bg-red-600';
      case 'due': return 'bg-orange-500 hover:bg-orange-600';  
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  // Check if we should show blinking animation for acknowledged overdue
  const hasAcknowledgedOverdue = overdueAlerts.some(alert => 
    acknowledgedOverdueAlerts.includes(alert.id)
  );

  const formatTimeUntilDue = (alert: MedicationAlert) => {
    if (alert.timeUntilDue) return alert.timeUntilDue;
    
    const now = new Date();
    const dueTime = new Date(alert.dueTime);
    const diffMs = dueTime.getTime() - now.getTime();
    
    if (diffMs < 0) {
      const overdueMins = Math.abs(Math.floor(diffMs / (1000 * 60)));
      if (overdueMins < 60) return `${overdueMins}m overdue`;
      const overdueHours = Math.floor(overdueMins / 60);
      return `${overdueHours}h ${overdueMins % 60}m overdue`;
    } else {
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      return `${hours}h ${mins % 60}m`;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`w-7 h-7 sm:w-8 sm:h-8 ${getButtonColor()} ${
          hasAcknowledgedOverdue ? 'animate-pulse ring-2 ring-white' : ''
        } rounded-full flex items-center justify-center transition-colors relative`}
        data-testid="button-alert-menu"
      >
        <i className="fas fa-bell text-white text-sm"></i>
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-xs font-bold text-gray-900 rounded-full w-5 h-5 flex items-center justify-center">
            {totalAlerts > 9 ? '9+' : totalAlerts}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-10 right-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-80 max-w-sm z-50">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                <i className="fas fa-bell mr-2"></i>Medication Alerts
              </h3>
              <button 
                onClick={() => setShowMenu(false)}
                className="text-gray-400 hover:text-gray-600"
                data-testid="button-close-alert-menu"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* No Alerts Message */}
            {totalAlerts === 0 && (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-bell-slash text-gray-400 text-xl"></i>
                </div>
                <p className="text-gray-500 font-medium">No Alerts</p>
                <p className="text-sm text-gray-400 mt-1">There are currently no alerts or warnings</p>
              </div>
            )}

            {/* Overdue Alerts */}
            {overdueAlerts.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Overdue ({overdueAlerts.length})
                </h4>
                {overdueAlerts.map(alert => (
                  <div key={alert.id} className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2 last:mb-0">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer hover:bg-red-100 rounded p-1 -m-1 transition-colors"
                        onClick={() => {
                          // Navigate to medication administration page
                          setLocation('/medpyxis');
                          setShowMenu(false);
                        }}
                        data-testid={`medication-item-${alert.id}`}
                      >
                        <div className="font-medium text-red-900 flex items-center">
                          <i className="fas fa-user mr-2"></i>
                          {alert.patientName}
                        </div>
                        <div className="text-sm text-red-700 flex items-center">
                          <i className="fas fa-pills mr-2"></i>
                          {alert.medicationName} - {alert.dose}
                        </div>
                        <div className="text-xs text-red-600 flex items-center">
                          <i className="fas fa-clock mr-2"></i>
                          {formatTimeUntilDue(alert)}
                        </div>
                        <div className="text-xs text-red-500 mt-1 italic">
                          <i className="fas fa-hand-pointer mr-1"></i>
                          Click to administer
                        </div>
                      </div>
                      {!acknowledgedOverdueAlerts.includes(alert.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeOverdueAlert(alert.id);
                          }}
                          className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                          data-testid={`button-acknowledge-${alert.id}`}
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Due Now Alerts */}
            {dueAlerts.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-orange-600 mb-2 flex items-center">
                  <i className="fas fa-bell mr-2"></i>
                  Due Now ({dueAlerts.length})
                </h4>
                {dueAlerts.map(alert => (
                  <div key={alert.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2 last:mb-0">
                    <div className="font-medium text-orange-900">{alert.patientName}</div>
                    <div className="text-sm text-orange-700">{alert.medicationName} - {alert.dose}</div>
                    <div className="text-xs text-orange-600">Due now</div>
                  </div>
                ))}
              </div>
            )}

            {/* Warning Alerts */}
            {warningAlerts.length > 0 && (
              <div className="p-3">
                <h4 className="text-sm font-semibold text-yellow-600 mb-2 flex items-center">
                  <i className="fas fa-clock mr-2"></i>
                  Upcoming ({warningAlerts.length})
                </h4>
                {warningAlerts.map(alert => (
                  <div key={alert.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2 last:mb-0">
                    <div className="font-medium text-yellow-900">{alert.patientName}</div>
                    <div className="text-sm text-yellow-700">{alert.medicationName} - {alert.dose}</div>
                    <div className="text-xs text-yellow-600">{formatTimeUntilDue(alert)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}