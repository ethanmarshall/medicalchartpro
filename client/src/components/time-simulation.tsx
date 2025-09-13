import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TimeSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TimeStatus {
  currentTime: string;
  isSimulating: boolean;
  offsetHours: number;
  offsetMinutes: number;
}

export function TimeSimulationModal({ isOpen, onClose }: TimeSimulationModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  // Get current time simulation status
  const { data: timeStatus, refetch } = useQuery<TimeStatus>({
    queryKey: ['/api/time-simulation/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: isOpen
  });

  const jumpTimeMutation = useMutation({
    mutationFn: async ({ hours, minutes }: { hours: number, minutes: number }) => {
      const response = await apiRequest('/api/time-simulation/jump', 'POST', {
        hours,
        minutes,
        pin: "112794" // Auto-provide admin PIN
      });
      return response;
    },
    onSuccess: () => {
      refetch();
      setHours(0);
      setMinutes(0);
      setError("");
      // Invalidate all queries to refresh with new time
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      setError("Failed to jump time");
    },
  });

  const resetTimeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/time-simulation/reset', 'POST', {
        pin: "112794" // Auto-provide admin PIN
      });
      return response;
    },
    onSuccess: () => {
      refetch();
      setError("");
      // Invalidate all queries to refresh with real time
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      setError("Failed to reset time");
    },
  });

  const handleJumpTime = () => {
    if (hours === 0 && minutes === 0) {
      setError("Please select hours or minutes to jump");
      return;
    }
    jumpTimeMutation.mutate({ hours, minutes });
  };

  const handleResetTime = () => {
    resetTimeMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-clock text-indigo-600 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-medical-text-primary">Time Simulation</h3>
          <p className="text-sm text-medical-text-secondary mt-1">
            Training Mode - Jump forward in time to test medication schedules
          </p>
        </div>

        {timeStatus && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Current Time:</span>
                <span className="font-mono">
                  {timeStatus.currentTime.replace('T', ' ').slice(0, 19)} EDT
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  timeStatus.isSimulating 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {timeStatus.isSimulating 
                    ? `Simulated (+${timeStatus.offsetHours}h ${timeStatus.offsetMinutes}m)` 
                    : 'Real Time'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-medical-text-primary mb-2">
              Jump Forward
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-medical-text-secondary mb-1">Hours</label>
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full p-2 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-hours"
                >
                  {Array.from({ length: 25 }, (_, i) => (
                    <option key={i} value={i}>{i}h</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-medical-text-secondary mb-1">Minutes</label>
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full p-2 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-minutes"
                >
                  {[0, 15, 30, 45].map(min => (
                    <option key={min} value={min}>{min}m</option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            data-testid="button-close-time"
          >
            Close
          </button>
          
          {timeStatus?.isSimulating && (
            <button
              onClick={handleResetTime}
              disabled={resetTimeMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              data-testid="button-reset-time"
            >
              {resetTimeMutation.isPending ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Resetting...</>
              ) : (
                <><i className="fas fa-undo mr-2"></i>Reset to Real Time</>
              )}
            </button>
          )}
          
          <button
            onClick={handleJumpTime}
            disabled={jumpTimeMutation.isPending}
            className="flex-1 px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            data-testid="button-jump-time"
          >
            {jumpTimeMutation.isPending ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Jumping...</>
            ) : (
              <><i className="fas fa-forward mr-2"></i>Jump Forward</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}