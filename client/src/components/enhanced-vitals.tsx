import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Patient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { VitalSim, VitalSimRef } from './vital-sim';

interface VitalsProps {
  patient: Patient;
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

interface IntakeOutput {
  id: string;
  patientId: string;
  type: 'intake' | 'output';
  category: string;
  amount: number;
  description?: string;
  recordedAt: string;
  recordedBy?: string;
  createdAt: string;
}

interface Assessment {
  id: string;
  patientId: string;
  assessmentType: string;
  score?: number;
  description?: string;
  findings?: string;
  assessedAt: string;
  assessedBy?: string;
  createdAt: string;
}

export function EnhancedVitals({ patient }: VitalsProps) {
  const [activeTab, setActiveTab] = useState<'vitals' | 'intake' | 'assessments'>('vitals');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'vitals' | 'intake' | 'assessments'>('vitals');
  const [selectedVitals, setSelectedVitals] = useState({
    heartRate: true,
    bloodPressure: true,
    respiration: false,
    oxygen: false,
  });
  
  const vitalSimRef = useRef<VitalSimRef>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Form states
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

  const [newIntakeOutput, setNewIntakeOutput] = useState({
    type: "intake" as 'intake' | 'output',
    category: "",
    amount: "",
    description: "",
    recordedAt: new Date().toISOString().slice(0, 16), // Current date/time
  });

  const [newAssessment, setNewAssessment] = useState({
    assessmentType: "",
    score: "",
    description: "",
    findings: "",
    assessedAt: new Date().toISOString().slice(0, 16), // Current date/time
  });

  // Delete states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: 'assessment' | 'intakeOutput'; name: string } | null>(null);
  const [deletePin, setDeletePin] = useState("");

  // Data queries
  const { data: vitals = [], isLoading: vitalsLoading } = useQuery<VitalSigns[]>({
    queryKey: ['/api/patients', patient.id, 'vitals'],
  });

  const { data: intakeOutput = [], isLoading: ioLoading } = useQuery<IntakeOutput[]>({
    queryKey: ['/api/patients', patient.id, 'intake-output'],
  });

  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery<Assessment[]>({
    queryKey: ['/api/patients', patient.id, 'assessments'],
  });

  // Manual vitals logging function
  const logCurrentVitals = async () => {
    if (!vitalSimRef.current) {
      toast({
        title: "Monitor Not Ready",
        description: "Please wait for the vitals monitor to initialize.",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await vitalSimRef.current.logCurrentVitals();
      if (success) {
        toast({
          title: "Vitals Logged",
          description: "Current vital signs have been successfully recorded to the database.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to log current vitals. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error logging vitals:', error);
      toast({
        title: "Error",
        description: "Failed to log current vitals. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Mutations
  const addVitalsMutation = useMutation({
    mutationFn: async (vitalData: any) => {
      return await apiRequest(`/api/patients/${patient.id}/vitals`, 'POST', vitalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'vitals'] });
      handleModalClose();
      toast({
        title: "Vitals Recorded",
        description: "New vital signs have been successfully recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record vital signs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addIntakeOutputMutation = useMutation({
    mutationFn: async (ioData: any) => {
      return await apiRequest(`/api/patients/${patient.id}/intake-output`, 'POST', ioData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'intake-output'] });
      handleModalClose();
      toast({
        title: "Intake/Output Recorded",
        description: "New intake/output record has been successfully added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record intake/output. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: any) => {
      return await apiRequest(`/api/patients/${patient.id}/assessments`, 'POST', assessmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'assessments'] });
      handleModalClose();
      toast({
        title: "Assessment Recorded",
        description: "New assessment has been successfully recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete mutations
  const deleteAssessmentMutation = useMutation({
    mutationFn: async ({ assessmentId, pin }: { assessmentId: string; pin: string }) => {
      return await apiRequest(`/api/assessments/${assessmentId}`, 'DELETE', { pin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'assessments'] });
      toast({
        title: "Assessment Deleted",
        description: "Assessment record has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteIntakeOutputMutation = useMutation({
    mutationFn: async ({ intakeOutputId, pin }: { intakeOutputId: string; pin: string }) => {
      return await apiRequest(`/api/intake-output/${intakeOutputId}`, 'DELETE', { pin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'intake-output'] });
      toast({
        title: "Record Deleted",
        description: "Intake/output record has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete intake/output record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleModalClose = () => {
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
    setNewIntakeOutput({
      type: "intake",
      category: "",
      amount: "",
      description: "",
      recordedAt: new Date().toISOString().slice(0, 16),
    });
    setNewAssessment({
      assessmentType: "",
      score: "",
      description: "",
      findings: "",
      assessedAt: new Date().toISOString().slice(0, 16),
    });
  };

  // Delete handlers
  const handleDeleteRequest = (id: string, type: 'assessment' | 'intakeOutput', name: string) => {
    setDeleteItem({ id, type, name });
    setShowDeleteDialog(true);
    setDeletePin("");
  };

  const handleDeleteConfirm = () => {
    if (!deleteItem) return;
    
    // Check if PIN is required (only for instructors, not admins)
    if (user?.role === 'instructor' && !deletePin) return;

    if (deleteItem.type === 'assessment') {
      deleteAssessmentMutation.mutate({ assessmentId: deleteItem.id, pin: deletePin });
    } else {
      deleteIntakeOutputMutation.mutate({ intakeOutputId: deleteItem.id, pin: deletePin });
    }

    setShowDeleteDialog(false);
    setDeleteItem(null);
    setDeletePin("");
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteItem(null);
    setDeletePin("");
  };

  const handleSubmit = () => {
    if (modalType === 'vitals') {
      const vitalData = {
        ...newVitals,
        pulse: parseInt(newVitals.pulse) || 0,
        respirationRate: parseInt(newVitals.respirationRate) || 0,
        bloodPressureSystolic: parseInt(newVitals.bloodPressureSystolic) || 0,
        bloodPressureDiastolic: parseInt(newVitals.bloodPressureDiastolic) || 0,
        oxygenSaturation: newVitals.oxygenSaturation ? parseInt(newVitals.oxygenSaturation) : undefined,
        takenBy: user?.username,
        takenAt: newVitals.takenAt,
      };
      addVitalsMutation.mutate(vitalData);
    } else if (modalType === 'intake') {
      const ioData = {
        ...newIntakeOutput,
        amount: parseInt(newIntakeOutput.amount) || 0,
      };
      addIntakeOutputMutation.mutate(ioData);
    } else if (modalType === 'assessments') {
      const assessmentData = {
        ...newAssessment,
        score: newAssessment.score ? parseInt(newAssessment.score) : undefined,
      };
      addAssessmentMutation.mutate(assessmentData);
    }
  };

  // Prepare chart data
  const vitalsChartData = vitals
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(vital => ({
      time: new Date(vital.createdAt).toLocaleDateString(),
      pulse: vital.pulse,
      temperature: parseFloat(vital.temperature) || 0,
      respirationRate: vital.respirationRate,
      systolic: vital.bloodPressureSystolic,
      diastolic: vital.bloodPressureDiastolic,
      oxygen: vital.oxygenSaturation || 0,
    }));

  const intakeOutputChartData = intakeOutput
    .reduce((acc: any, io) => {
      const date = new Date(io.createdAt).toLocaleDateString();
      const existing = acc.find((item: any) => item.date === date);
      if (existing) {
        if (io.type === 'intake') {
          existing.intake += io.amount;
        } else {
          existing.output += io.amount;
        }
      } else {
        acc.push({
          date,
          intake: io.type === 'intake' ? io.amount : 0,
          output: io.type === 'output' ? io.amount : 0,
        });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const openAddModal = (type: 'vitals' | 'intake' | 'assessments') => {
    // Get current local time in correct format for datetime-local input
    const now = new Date();
    const currentDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    // Reset all forms with current time
    setNewVitals({
      pulse: "",
      temperature: "",
      respirationRate: "",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      oxygenSaturation: "",
      notes: "",
      takenAt: currentDateTime,
    });
    setNewIntakeOutput({
      type: "intake",
      category: "",
      amount: "",
      description: "",
      recordedAt: currentDateTime,
    });
    setNewAssessment({
      assessmentType: "",
      score: "",
      description: "",
      findings: "",
      assessedAt: currentDateTime,
    });
    
    setModalType(type);
    setShowAddModal(true);
  };

  if (vitalsLoading || ioLoading || assessmentsLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Tabs */}
      <div className="bg-white rounded-xl shadow-medical border border-medical-border">
        <div className="border-b border-medical-border">
          <div className="flex items-center justify-between p-6">
            <h3 className="text-lg font-semibold text-medical-text-primary">
              <i className="fas fa-heartbeat mr-2 text-medical-primary"></i>Enhanced Vital Signs & Assessment
            </h3>
          </div>
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('vitals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vitals'
                  ? 'border-medical-primary text-medical-primary'
                  : 'border-transparent text-medical-text-muted hover:text-medical-text-primary'
              }`}
              data-testid="tab-vitals"
            >
              <i className="fas fa-heartbeat mr-2"></i>Vital Signs
            </button>
            <button
              onClick={() => setActiveTab('intake')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'intake'
                  ? 'border-medical-primary text-medical-primary'
                  : 'border-transparent text-medical-text-muted hover:text-medical-text-primary'
              }`}
              data-testid="tab-intake"
            >
              <i className="fas fa-tint mr-2"></i>Intake/Output
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assessments'
                  ? 'border-medical-primary text-medical-primary'
                  : 'border-transparent text-medical-text-muted hover:text-medical-text-primary'
              }`}
              data-testid="tab-assessments"
            >
              <i className="fas fa-clipboard-check mr-2"></i>Assessments
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Vital Signs Tab */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              {/* VitalSim Monitor */}
              <div className="w-full">
                <VitalSim 
                  ref={vitalSimRef}
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


              {/* Recent Vitals */}
              <div>
                <h5 className="font-medium text-medical-text-primary mb-3">Recent Readings</h5>
                {vitals.length === 0 ? (
                  <div className="text-center py-8 text-medical-text-muted">
                    <i className="fas fa-heartbeat text-4xl mb-4 opacity-30"></i>
                    <p>No vital signs recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vitals
                      .sort((a, b) => new Date(b.takenAt || b.createdAt).getTime() - new Date(a.takenAt || a.createdAt).getTime())
                      .slice(0, 5).map((vital) => (
                      <div key={vital.id} className="p-4 border border-medical-border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="font-medium">HR: {vital.pulse} bpm</span>
                            <span className="font-medium">BP: {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}</span>
                            <span className="font-medium">Temp: {vital.temperature}°F</span>
                            <span className="font-medium">RR: {vital.respirationRate}</span>
                            {vital.oxygenSaturation && (
                              <span className="font-medium">O2: {vital.oxygenSaturation}%</span>
                            )}
                          </div>
                          <div className="text-xs text-medical-text-muted">
                            {new Date(vital.takenAt || vital.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {vital.notes && (
                          <p className="text-sm text-medical-text-secondary mt-2">{vital.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Intake/Output Tab */}
          {activeTab === 'intake' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-medical-text-primary">Intake/Output Monitoring</h4>
                <button
                  onClick={() => openAddModal('intake')}
                  className="px-4 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-intake"
                >
                  <i className="fas fa-plus mr-2"></i>Add I/O Record
                </button>
              </div>

              {/* I/O Chart */}
              {intakeOutputChartData.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-medical-text-primary mb-4">Daily Intake/Output Balance</h5>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={intakeOutputChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} mL`, '']} />
                      <Legend />
                      <Bar dataKey="intake" fill="#10b981" name="Intake (mL)" />
                      <Bar dataKey="output" fill="#ef4444" name="Output (mL)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent I/O Records */}
              <div>
                <h5 className="font-medium text-medical-text-primary mb-3">Recent Records</h5>
                {intakeOutput.length === 0 ? (
                  <div className="text-center py-8 text-medical-text-muted">
                    <i className="fas fa-tint text-4xl mb-4 opacity-30"></i>
                    <p>No intake/output records yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {intakeOutput.slice(0, 10).map((io) => (
                      <div key={io.id} className={`p-4 border rounded-lg ${
                        io.type === 'intake' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              io.type === 'intake' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <div className="font-medium">
                                {io.type.charAt(0).toUpperCase() + io.type.slice(1)}: {io.amount} mL
                              </div>
                              <div className="text-sm text-medical-text-muted">
                                Category: {io.category}
                              </div>
                              {io.description && (
                                <div className="text-sm text-medical-text-secondary mt-1">
                                  {io.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-xs text-medical-text-muted">
                              {new Date(io.createdAt).toLocaleString()}
                            </div>
                            {(user?.role === 'instructor' || user?.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteRequest(io.id, 'intakeOutput', `${io.type} record (${io.amount} mL ${io.category})`)}
                                className="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-100 transition-colors"
                                title="Delete record"
                                data-testid={`button-delete-intake-output-${io.id}`}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assessments Tab */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-medical-text-primary">Patient Assessments</h4>
                <button
                  onClick={() => openAddModal('assessments')}
                  className="px-4 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-assessment"
                >
                  <i className="fas fa-plus mr-2"></i>Add Assessment
                </button>
              </div>

              {/* Recent Assessments */}
              <div>
                <h5 className="font-medium text-medical-text-primary mb-3">Assessment History</h5>
                {assessments.length === 0 ? (
                  <div className="text-center py-8 text-medical-text-muted">
                    <i className="fas fa-clipboard-check text-4xl mb-4 opacity-30"></i>
                    <p>No assessments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assessments.slice(0, 10).map((assessment) => (
                      <div key={assessment.id} className="p-4 border border-medical-border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="font-medium text-medical-text-primary">
                              {assessment.assessmentType}
                            </div>
                            {assessment.score !== undefined && (
                              <div className="px-2 py-1 bg-medical-primary/10 text-medical-primary rounded text-sm font-medium">
                                Score: {assessment.score}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-xs text-medical-text-muted">
                              {new Date(assessment.createdAt).toLocaleString()}
                            </div>
                            {(user?.role === 'instructor' || user?.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteRequest(assessment.id, 'assessment', `${assessment.assessmentType} assessment`)}
                                className="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-100 transition-colors"
                                title="Delete assessment"
                                data-testid={`button-delete-assessment-${assessment.id}`}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                        {assessment.description && (
                          <div className="text-sm text-medical-text-secondary mb-2">
                            <strong>Description:</strong> {assessment.description}
                          </div>
                        )}
                        {assessment.findings && (
                          <div className="text-sm text-medical-text-secondary">
                            <strong>Findings:</strong> {assessment.findings}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-medical-border">
              <h3 className="text-lg font-semibold text-medical-text-primary">
                <i className={`fas ${modalType === 'vitals' ? 'fa-heartbeat' : modalType === 'intake' ? 'fa-tint' : 'fa-clipboard-check'} mr-2`}></i>
                Add {modalType === 'vitals' ? 'Vital Signs' : modalType === 'intake' ? 'Intake/Output' : 'Assessment'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              {modalType === 'vitals' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Heart Rate (bpm) *</label>
                      <input
                        type="number"
                        value={newVitals.pulse}
                        onChange={(e) => setNewVitals({...newVitals, pulse: e.target.value})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="input-pulse"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Temperature (°F) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newVitals.temperature}
                        onChange={(e) => setNewVitals({...newVitals, temperature: e.target.value})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="input-temperature"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Respiratory Rate *</label>
                      <input
                        type="number"
                        value={newVitals.respirationRate}
                        onChange={(e) => setNewVitals({...newVitals, respirationRate: e.target.value})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="input-respiration"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Oxygen Saturation (%)</label>
                      <input
                        type="number"
                        value={newVitals.oxygenSaturation}
                        onChange={(e) => setNewVitals({...newVitals, oxygenSaturation: e.target.value})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="input-oxygen"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Systolic BP *</label>
                      <input
                        type="number"
                        value={newVitals.bloodPressureSystolic}
                        onChange={(e) => setNewVitals({...newVitals, bloodPressureSystolic: e.target.value})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="input-systolic"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Diastolic BP *</label>
                      <input
                        type="number"
                        value={newVitals.bloodPressureDiastolic}
                        onChange={(e) => setNewVitals({...newVitals, bloodPressureDiastolic: e.target.value})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="input-diastolic"
                      />
                    </div>
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
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Notes</label>
                    <textarea
                      value={newVitals.notes}
                      onChange={(e) => setNewVitals({...newVitals, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                      placeholder="Additional observations..."
                      data-testid="textarea-vitals-notes"
                    />
                  </div>
                </>
              )}

              {modalType === 'intake' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Type *</label>
                      <select
                        value={newIntakeOutput.type}
                        onChange={(e) => setNewIntakeOutput({...newIntakeOutput, type: e.target.value as 'intake' | 'output'})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="select-io-type"
                      >
                        <option value="intake">Intake</option>
                        <option value="output">Output</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-medical-text-secondary mb-2">Amount (mL) *</label>
                      <input
                        type="number"
                        value={newIntakeOutput.amount}
                        onChange={(e) => setNewIntakeOutput({...newIntakeOutput, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                        data-testid="input-io-amount"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Category *</label>
                    <select
                      value={newIntakeOutput.category}
                      onChange={(e) => setNewIntakeOutput({...newIntakeOutput, category: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                      data-testid="select-io-category"
                    >
                      <option value="">Select category...</option>
                      {newIntakeOutput.type === 'intake' ? (
                        <>
                          <option value="oral">Oral</option>
                          <option value="iv">IV Fluids</option>
                          <option value="feeding-tube">Feeding Tube</option>
                          <option value="medication">Medication</option>
                        </>
                      ) : (
                        <>
                          <option value="urine">Urine</option>
                          <option value="emesis">Emesis</option>
                          <option value="drain">Drain</option>
                          <option value="stool">Stool</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date & Time Recorded *</label>
                    <input
                      type="datetime-local"
                      value={newIntakeOutput.recordedAt}
                      onChange={(e) => setNewIntakeOutput({...newIntakeOutput, recordedAt: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                      data-testid="input-io-datetime"
                    />
                    <p className="text-xs text-medical-text-muted mt-1">When was this recorded?</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Description</label>
                    <textarea
                      value={newIntakeOutput.description}
                      onChange={(e) => setNewIntakeOutput({...newIntakeOutput, description: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                      placeholder="Additional details..."
                      data-testid="textarea-io-description"
                    />
                  </div>
                </>
              )}

              {modalType === 'assessments' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Assessment Type *</label>
                    <select
                      value={newAssessment.assessmentType}
                      onChange={(e) => setNewAssessment({...newAssessment, assessmentType: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                      data-testid="select-assessment-type"
                    >
                      <option value="">Select assessment type...</option>
                      <option value="pain_scale">Pain Scale (0-10)</option>
                      <option value="neurological">Neurological Check</option>
                      <option value="fall_risk">Fall Risk Assessment</option>
                      <option value="mental_status">Mental Status</option>
                      <option value="skin_integrity">Skin Integrity</option>
                      <option value="mobility">Mobility Assessment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Score (if applicable)</label>
                    <input
                      type="number"
                      value={newAssessment.score}
                      onChange={(e) => setNewAssessment({...newAssessment, score: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                      placeholder="e.g., Pain scale 0-10"
                      data-testid="input-assessment-score"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Description</label>
                    <textarea
                      value={newAssessment.description}
                      onChange={(e) => setNewAssessment({...newAssessment, description: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                      placeholder="Assessment description..."
                      data-testid="textarea-assessment-description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date & Time Assessed *</label>
                    <input
                      type="datetime-local"
                      value={newAssessment.assessedAt}
                      onChange={(e) => setNewAssessment({...newAssessment, assessedAt: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                      data-testid="input-assessment-datetime"
                    />
                    <p className="text-xs text-medical-text-muted mt-1">When was this assessment performed?</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-medical-text-secondary mb-2">Findings</label>
                    <textarea
                      value={newAssessment.findings}
                      onChange={(e) => setNewAssessment({...newAssessment, findings: e.target.value})}
                      className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-24 resize-none"
                      placeholder="Detailed findings and observations..."
                      data-testid="textarea-assessment-findings"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-medical-border">
              <button
                onClick={handleModalClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                data-testid="button-cancel-modal"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={addVitalsMutation.isPending || addIntakeOutputMutation.isPending || addAssessmentMutation.isPending}
                className="px-6 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="button-save-modal"
              >
                {(addVitalsMutation.isPending || addIntakeOutputMutation.isPending || addAssessmentMutation.isPending) ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
                ) : (
                  <><i className="fas fa-save mr-2"></i>Save</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border max-w-md w-full">
            <div className="p-6 border-b border-medical-border">
              <h3 className="text-lg font-semibold text-medical-text-primary">
                <i className="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                Confirm Deletion
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-medical-text-secondary">
                Are you sure you want to delete this {deleteItem.name}? This action cannot be undone.
              </p>
              
              {user?.role === 'instructor' && (
                <div>
                  <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                    Enter your PIN to confirm:
                  </label>
                  <input
                    type="password"
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value)}
                    className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                    placeholder="Enter PIN"
                    data-testid="input-delete-pin"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-medical-border flex space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 text-medical-text-secondary border border-medical-border rounded-lg hover:bg-gray-50 transition-colors"
                data-testid="button-cancel-delete"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={(user?.role === 'instructor' && !deletePin) || deleteAssessmentMutation.isPending || deleteIntakeOutputMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="button-confirm-delete"
              >
                {(deleteAssessmentMutation.isPending || deleteIntakeOutputMutation.isPending) ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fas fa-trash mr-2"></i>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}