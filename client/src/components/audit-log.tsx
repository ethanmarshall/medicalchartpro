import { useQuery, useMutation } from "@tanstack/react-query";
import { type AuditLog } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AuditLogProps {
  entityType: string;
  entityId: string;
  title?: string;
}

export function AuditLogComponent({ entityType, entityId, title = "Change Log" }: AuditLogProps) {
  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit', entityType, entityId],
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [pinInput, setPinInput] = useState<string>("");
  const [showPinModal, setShowPinModal] = useState<string | null>(null);
  
  // Check if user can delete audit logs (admin or instructor)
  const canDelete = user && (user.role === 'admin' || user.role === 'instructor');
  
  const deleteMutation = useMutation({
    mutationFn: async ({ auditLogId, pin }: { auditLogId: string; pin?: string }) => {
      return apiRequest(`/api/audit-logs/${auditLogId}`, 'DELETE', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit', entityType, entityId] });
      toast({
        title: "Success",
        description: "Audit log deleted successfully",
      });
      setShowPinModal(null);
      setPinInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete audit log",
        variant: "destructive",
      });
    },
  });
  
  const handleDelete = (auditLogId: string) => {
    if (user?.role === 'admin') {
      // Admin doesn't need PIN
      deleteMutation.mutate({ auditLogId });
    } else if (user?.role === 'instructor') {
      // Instructor needs PIN
      setShowPinModal(auditLogId);
    }
  };
  
  const handlePinSubmit = () => {
    if (showPinModal && pinInput) {
      deleteMutation.mutate({ auditLogId: showPinModal, pin: pinInput });
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return 'fa-plus-circle';
      case 'update': return 'fa-edit';
      case 'administer': return 'fa-syringe';
      case 'delete': return 'fa-trash';
      default: return 'fa-info-circle';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-green-600';
      case 'update': return 'text-blue-600';
      case 'administer': return 'text-purple-600';
      case 'delete': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getActionLabel = (action: string, entityType: string) => {
    switch (action) {
      case 'create': return `${entityType} created`;
      case 'update': return `${entityType} updated`;
      case 'administer': return 'Medicine administered';
      case 'delete': return `${entityType} deleted`;
      default: return action;
    }
  };

  const formatChanges = (changes: Record<string, any> | string | null) => {
    if (!changes) return null;
    
    let changesObj: Record<string, any>;
    
    // Handle cases where changes might be a JSON string
    if (typeof changes === 'string') {
      try {
        changesObj = JSON.parse(changes);
      } catch (error) {
        // If parsing fails, treat it as a simple string
        return (
          <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-2 mb-1">
            {changes}
          </span>
        );
      }
    } else {
      changesObj = changes;
    }
    
    // Handle specific audit log format with nested changes
    if (changesObj.changes && changesObj.updated_fields) {
      // This is a patient update or similar structured change
      const fieldChanges = changesObj.changes;
      return Object.entries(fieldChanges).map(([field, change]: [string, any]) => (
        <span key={field} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2 mb-1">
          <strong>{field}:</strong> {change.from} → {change.to}
        </span>
      ));
    }
    
    // Handle regular changes object
    return Object.entries(changesObj).map(([key, value]) => (
      <span key={key} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-2 mb-1">
        <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
      </span>
    ));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
        <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
          <i className="fas fa-history text-medical-primary mr-2"></i>{title}
        </h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
      <h3 className="text-lg font-semibold text-medical-text-primary mb-4">
        <i className="fas fa-history text-medical-primary mr-2"></i>{title}
      </h3>
      
      <div className="max-h-96 overflow-y-auto">
        {auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-clipboard-list text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                data-testid={`audit-log-${log.id}`}
              >
                <div className={`flex-shrink-0 mt-1 ${getActionColor(log.action)}`}>
                  <i className={`fas ${getActionIcon(log.action)}`}></i>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">
                      {getActionLabel(log.action, log.entityType)}
                    </p>
                    <div className="flex items-center space-x-2">
                      <time 
                        className="text-sm text-gray-500" 
                        title={log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown time'}
                        data-testid={`audit-time-${log.id}`}
                      >
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : 'Unknown time'}
                      </time>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Delete audit log entry"
                          data-testid={`delete-audit-log-${log.id}`}
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {log.changes && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">Changes:</p>
                      <div className="flex flex-wrap">
                        {formatChanges(log.changes)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* PIN Modal for Instructors */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Enter PIN to Delete Audit Log</h3>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter instructor PIN"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              data-testid="pin-input"
            />
            <div className="flex space-x-3">
              <button
                onClick={handlePinSubmit}
                disabled={!pinInput || deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="confirm-delete-button"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => {
                  setShowPinModal(null);
                  setPinInput("");
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                data-testid="cancel-delete-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}