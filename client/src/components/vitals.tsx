import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Patient, type Vitals } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface VitalsProps {
  patient: Patient;
}

export function Vitals({ patient }: VitalsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVital, setSelectedVital] = useState<Vitals | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canDeleteVitals = user?.role === 'instructor' || user?.role === 'admin';
  
  const [newVitals, setNewVitals] = useState({
    pulse: "",
    temperature: "",
    respirationRate: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    oxygenSaturation: "",
    notes: "",
    takenAt: new Date().toISOString().slice(0, 16), // Current date/time
  });

  const { data: vitals = [], isLoading } = useQuery<Vitals[]>({
    queryKey: ['/api/patients', patient.id, 'vitals'],
  });

  const addVitalsMutation = useMutation({
    mutationFn: async (vitalData: any) => {
      return await apiRequest(`/api/patients/${patient.id}/vitals`, 'POST', vitalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'vitals'] });
      setShowAddModal(false);
      setNewVitals({
        pulse: "",
        temperature: "",
        respirationRate: "",
        bloodPressureSystolic: "",
        bloodPressureDiastolic: "",
        oxygenSaturation: "",
        notes: "",
        takenAt: new Date().toISOString().slice(0, 16),
      });
      toast({
        title: "Vitals Recorded",
        description: "New vital signs have been successfully recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to record vital signs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteVitalsMutation = useMutation({
    mutationFn: async ({ vitalId, pin }: { vitalId: string; pin: string }) => {
      return await apiRequest(`/api/vitals/${vitalId}`, 'DELETE', { pin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'vitals'] });
      setShowDeleteModal(false);
      setSelectedVital(null);
      setDeletePin('');
      setDeleteError('');
      toast({
        title: "Vitals Deleted",
        description: "Vitals record has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      if (error.message.includes("401")) {
        setDeleteError("Invalid PIN code");
      } else {
        setDeleteError("Failed to delete vitals record");
      }
    },
  });

  const handleDeleteClick = (vital: Vitals) => {
    setSelectedVital(vital);
    setShowDeleteModal(true);
    setDeletePin('');
    setDeleteError('');
  };

  const handleConfirmDelete = () => {
    if (!selectedVital || (!deletePin && user?.role !== 'admin')) {
      setDeleteError("Please enter PIN");
      return;
    }
    // Admin users bypass PIN requirement
    const effectivePin = user?.role === 'admin' ? '0000' : deletePin;
    deleteVitalsMutation.mutate({ vitalId: selectedVital.id, pin: effectivePin });
  };

  const getVitalStatus = (type: string, value: number) => {
    switch (type) {
      case 'pulse':
        if (value < 60) return { status: 'low', color: 'text-blue-600 bg-blue-50 border-blue-200' };
        if (value > 100) return { status: 'high', color: 'text-red-600 bg-red-50 border-red-200' };
        return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200' };
      case 'respiration':
        if (value < 12) return { status: 'low', color: 'text-blue-600 bg-blue-50 border-blue-200' };
        if (value > 20) return { status: 'high', color: 'text-red-600 bg-red-50 border-red-200' };
        return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200' };
      case 'systolic':
        if (value < 90) return { status: 'low', color: 'text-blue-600 bg-blue-50 border-blue-200' };
        if (value > 140) return { status: 'high', color: 'text-red-600 bg-red-50 border-red-200' };
        return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200' };
      case 'diastolic':
        if (value < 60) return { status: 'low', color: 'text-blue-600 bg-blue-50 border-blue-200' };
        if (value > 90) return { status: 'high', color: 'text-red-600 bg-red-50 border-red-200' };
        return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200' };
      case 'oxygen':
        if (value < 95) return { status: 'low', color: 'text-red-600 bg-red-50 border-red-200' };
        return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200' };
      default:
        return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200' };
    }
  };

  const getTemperatureStatus = (temp: string) => {
    const celsius = temp.includes('°C') ? parseFloat(temp) : ((parseFloat(temp) - 32) * 5/9);
    if (celsius < 36.1) return { status: 'low', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (celsius > 37.2) return { status: 'high', color: 'text-red-600 bg-red-50 border-red-200' };
    return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200' };
  };

  const handleAddVitals = () => {
    const vitalData = {
      pulse: parseInt(newVitals.pulse),
      temperature: newVitals.temperature,
      respirationRate: parseInt(newVitals.respirationRate),
      bloodPressureSystolic: parseInt(newVitals.bloodPressureSystolic),
      bloodPressureDiastolic: parseInt(newVitals.bloodPressureDiastolic),
      oxygenSaturation: newVitals.oxygenSaturation ? parseInt(newVitals.oxygenSaturation) : undefined,
      notes: newVitals.notes || undefined,
      takenBy: newVitals.takenBy || undefined,
    };
    addVitalsMutation.mutate(vitalData);
  };

  const getMostRecentVitals = () => {
    if (vitals.length === 0) return null;
    return vitals.sort((a, b) => new Date(b.takenAt || 0).getTime() - new Date(a.takenAt || 0).getTime())[0];
  };

  const recentVitals = getMostRecentVitals();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <i className="fas fa-spinner fa-spin text-medical-primary"></i>
          <span className="text-medical-text-primary">Loading vital signs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-medical-text-primary">
          <i className="fas fa-heartbeat text-medical-primary mr-2"></i>Vital Signs
        </h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-medical-text-muted">
            {vitals.length} record{vitals.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors"
            data-testid="button-add-vitals"
          >
            <i className="fas fa-plus mr-2"></i>Record Vitals
          </button>
          {vitals.length > 0 && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-white text-medical-primary shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="button-vitals-cards-view"
              >
                <i className="fas fa-th-large mr-1"></i>Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-medical-primary shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="button-vitals-table-view"
              >
                <i className="fas fa-table mr-1"></i>Table
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current Vitals Dashboard */}
      {recentVitals && (
        <div className="mb-6 p-4 bg-gradient-to-r from-medical-primary/5 to-teal-50 rounded-lg border border-medical-border">
          <h4 className="text-md font-medium text-medical-text-primary mb-3">
            <i className="fas fa-clock mr-2"></i>Current Vitals
            <span className="text-sm text-medical-text-muted ml-2">
              Last recorded: {new Date(recentVitals.takenAt || '').toLocaleString([], { 
                timeZone: 'America/New_York',
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${getVitalStatus('pulse', recentVitals.pulse).color}`}>
                {recentVitals.pulse}
              </div>
              <p className="text-xs text-medical-text-muted mt-1">Pulse (bpm)</p>
            </div>
            <div className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold ${getTemperatureStatus(recentVitals.temperature).color}`}>
                {recentVitals.temperature}
              </div>
              <p className="text-xs text-medical-text-muted mt-1">Temperature</p>
            </div>
            <div className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${getVitalStatus('respiration', recentVitals.respirationRate).color}`}>
                {recentVitals.respirationRate}
              </div>
              <p className="text-xs text-medical-text-muted mt-1">Respiration (rpm)</p>
            </div>
            <div className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold ${getVitalStatus('systolic', recentVitals.bloodPressureSystolic).color}`}>
                {recentVitals.bloodPressureSystolic}/{recentVitals.bloodPressureDiastolic}
              </div>
              <p className="text-xs text-medical-text-muted mt-1">Blood Pressure</p>
            </div>
          </div>
        </div>
      )}

      {vitals.length === 0 ? (
        <div className="text-center py-8 text-medical-text-muted">
          <i className="fas fa-heartbeat text-4xl mb-4 opacity-30"></i>
          <p className="text-lg font-medium mb-2">No Vital Signs Recorded</p>
          <p className="text-sm">Click "Record Vitals" to add the first vital signs entry.</p>
        </div>
      ) : (
        <div>
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Date/Time</th>
                    <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Pulse</th>
                    <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Temperature</th>
                    <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Respiration</th>
                    <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Blood Pressure</th>
                    <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">O2 Sat</th>
                    <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Taken By</th>
                    {canDeleteVitals && (
                      <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {vitals
                    .sort((a, b) => new Date(b.takenAt || 0).getTime() - new Date(a.takenAt || 0).getTime())
                    .map((vital) => (
                      <tr key={vital.id} className="border-b border-gray-100 hover:bg-gray-50" data-testid={`vitals-row-${vital.id}`}>
                        <td className="py-3 px-4">
                          <div className="text-sm text-medical-text-primary">
                            {vital.takenAt ? new Date(vital.takenAt).toLocaleString() : 'Not recorded'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVitalStatus('pulse', vital.pulse).color}`}>
                            {vital.pulse} bpm
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTemperatureStatus(vital.temperature).color}`}>
                            {vital.temperature}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVitalStatus('respiration', vital.respirationRate).color}`}>
                            {vital.respirationRate} rpm
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVitalStatus('systolic', vital.bloodPressureSystolic).color}`}>
                            {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {vital.oxygenSaturation ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVitalStatus('oxygen', vital.oxygenSaturation).color}`}>
                              {vital.oxygenSaturation}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-medical-text-primary">{vital.takenBy || 'Unknown'}</div>
                        </td>
                        {canDeleteVitals && (
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteClick(vital)}
                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              data-testid={`button-delete-vital-${vital.id}`}
                            >
                              <i className="fas fa-trash mr-1"></i>Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vitals
                .sort((a, b) => new Date(b.takenAt || 0).getTime() - new Date(a.takenAt || 0).getTime())
                .map((vital) => (
                  <div key={vital.id} className="p-4 border border-medical-border rounded-lg" data-testid={`vitals-card-${vital.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-medical-text-primary">
                        {vital.takenAt ? new Date(vital.takenAt).toLocaleDateString() : 'No date'}
                      </h4>
                      <span className="text-xs text-medical-text-muted">
                        {vital.takenAt ? new Date(vital.takenAt).toLocaleTimeString() : 'No time'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-medical-text-muted">Pulse:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getVitalStatus('pulse', vital.pulse).color}`}>
                          {vital.pulse} bpm
                        </span>
                      </div>
                      <div>
                        <span className="text-medical-text-muted">Temp:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getTemperatureStatus(vital.temperature).color}`}>
                          {vital.temperature}
                        </span>
                      </div>
                      <div>
                        <span className="text-medical-text-muted">Resp:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getVitalStatus('respiration', vital.respirationRate).color}`}>
                          {vital.respirationRate} rpm
                        </span>
                      </div>
                      <div>
                        <span className="text-medical-text-muted">BP:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getVitalStatus('systolic', vital.bloodPressureSystolic).color}`}>
                          {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}
                        </span>
                      </div>
                      {vital.oxygenSaturation && (
                        <div>
                          <span className="text-medical-text-muted">O2 Sat:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getVitalStatus('oxygen', vital.oxygenSaturation).color}`}>
                            {vital.oxygenSaturation}%
                          </span>
                        </div>
                      )}
                      {vital.takenBy && (
                        <div>
                          <span className="text-medical-text-muted">By:</span>
                          <span className="ml-2 text-medical-text-primary">{vital.takenBy}</span>
                        </div>
                      )}
                    </div>
                    {vital.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-medical-text-muted text-xs">Notes:</span>
                        <p className="text-sm text-medical-text-primary mt-1">{vital.notes}</p>
                      </div>
                    )}
                    {canDeleteVitals && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                        <button
                          onClick={() => handleDeleteClick(vital)}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          data-testid={`button-delete-vital-${vital.id}`}
                        >
                          <i className="fas fa-trash mr-1"></i>Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Add Vitals Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-medical-border">
              <h3 className="text-lg font-semibold text-medical-text-primary">
                <i className="fas fa-heartbeat mr-2"></i>Record Vital Signs
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                    Pulse (bpm) *
                  </label>
                  <input
                    type="number"
                    value={newVitals.pulse}
                    onChange={(e) => setNewVitals({...newVitals, pulse: e.target.value})}
                    className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                    placeholder="80"
                    data-testid="input-pulse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                    Temperature *
                  </label>
                  <input
                    type="text"
                    value={newVitals.temperature}
                    onChange={(e) => setNewVitals({...newVitals, temperature: e.target.value})}
                    className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                    placeholder="98.6°F"
                    data-testid="input-temperature"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                    Respiration (rpm) *
                  </label>
                  <input
                    type="number"
                    value={newVitals.respirationRate}
                    onChange={(e) => setNewVitals({...newVitals, respirationRate: e.target.value})}
                    className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                    placeholder="16"
                    data-testid="input-respiration"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                    O2 Saturation (%)
                  </label>
                  <input
                    type="number"
                    value={newVitals.oxygenSaturation}
                    onChange={(e) => setNewVitals({...newVitals, oxygenSaturation: e.target.value})}
                    className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                    placeholder="98"
                    data-testid="input-oxygen-saturation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                  Blood Pressure *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={newVitals.bloodPressureSystolic}
                    onChange={(e) => setNewVitals({...newVitals, bloodPressureSystolic: e.target.value})}
                    className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                    placeholder="120"
                    data-testid="input-systolic"
                  />
                  <input
                    type="number"
                    value={newVitals.bloodPressureDiastolic}
                    onChange={(e) => setNewVitals({...newVitals, bloodPressureDiastolic: e.target.value})}
                    className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                    placeholder="80"
                    data-testid="input-diastolic"
                  />
                </div>
                <p className="text-xs text-medical-text-muted mt-1">Systolic / Diastolic</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date & Time Taken *</label>
                <input
                  type="datetime-local"
                  value={newVitals.takenAt}
                  onChange={(e) => setNewVitals({...newVitals, takenAt: e.target.value})}
                  className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                  data-testid="input-vitals-datetime"
                />
                <p className="text-xs text-medical-text-muted mt-1">When were these vitals taken?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                  Notes
                </label>
                <textarea
                  value={newVitals.notes}
                  onChange={(e) => setNewVitals({...newVitals, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                  placeholder="Additional observations..."
                  data-testid="textarea-vitals-notes"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-medical-border">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                data-testid="button-cancel-vitals"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVitals}
                disabled={!newVitals.pulse || !newVitals.temperature || !newVitals.respirationRate || !newVitals.bloodPressureSystolic || !newVitals.bloodPressureDiastolic || addVitalsMutation.isPending}
                className="px-6 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="button-save-vitals"
              >
                {addVitalsMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Recording...</>
                ) : (
                  <><i className="fas fa-save mr-2"></i>Record Vitals</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Vitals Modal */}
      {showDeleteModal && selectedVital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border max-w-md w-full">
            <div className="p-6 border-b border-medical-border">
              <h3 className="text-lg font-semibold text-red-600">
                <i className="fas fa-trash mr-2"></i>Delete Vitals Record
              </h3>
            </div>
            <div className="p-6">
              <p className="text-medical-text-primary mb-4">
                Are you sure you want to delete this vitals record taken on {new Date(selectedVital.takenAt || '').toLocaleString()}?
              </p>
              <p className="text-sm text-red-600 mb-4">This action cannot be undone.</p>
              
              <div>
                <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                  Enter PIN to confirm deletion:
                </label>
                <input
                  type="password"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter PIN"
                  data-testid="input-delete-pin"
                />
                {deleteError && (
                  <p className="text-red-500 text-sm mt-2">{deleteError}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-medical-border">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedVital(null);
                  setDeletePin('');
                  setDeleteError('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                data-testid="button-cancel-delete"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteVitalsMutation.isPending}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="button-confirm-delete"
              >
                {deleteVitalsMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Deleting...</>
                ) : (
                  <><i className="fas fa-trash mr-2"></i>Delete Record</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}