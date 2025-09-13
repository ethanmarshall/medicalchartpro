import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Barcode, PrintableBarcode } from "./barcode";
import { 
  type Medicine, 
  type Patient, 
  type User, 
  type LabTestType,
  type ImagingFiles,
  type Prescription,
  type Vitals,
  type LabResult,
  type CareNotes,
  type Administration 
} from "@shared/schema";

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'patients' | 'medicines' | 'prescriptions' | 'vitals' | 'results' | 'imaging' | 'care-notes' | 'administrations' | 'lab-tests' | 'intake-output' | 'assessments' | 'medication-links' | 'import-export' | 'barcodes'>('users');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{type: string, id: string} | null>(null);
  const [selectedVitals, setSelectedVitals] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Reset editing state when modal closes to prevent interference with patient page
  const handleClose = () => {
    setEditingItem(null);
    setShowDeleteConfirm(null);
    setSelectedVitals([]);
    onClose();
  };
  
  const queryClient = useQueryClient();


  // Fetch data for all sections
  const { data: users = [] } = useQuery<User[]>({ queryKey: ['/api/admin/users'] });
  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ['/api/admin/patients'] });
  const { data: medicines = [], isLoading: medicinesLoading, error: medicinesError } = useQuery<Medicine[]>({ 
    queryKey: ['/api/admin/medicines'], // Fixed: Remove cache-busting from URL path 
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const { data: prescriptions = [] } = useQuery<Prescription[]>({ queryKey: ['/api/admin/prescriptions'] });
  const { data: vitals = [] } = useQuery<Vitals[]>({ queryKey: ['/api/admin/vitals'] });
  const { data: labResults = [] } = useQuery<LabResult[]>({ queryKey: ['/api/admin/lab-results'] });
  const { data: careNotes = [] } = useQuery<CareNotes[]>({ queryKey: ['/api/admin/care-notes'] });
  const { data: administrations = [] } = useQuery<Administration[]>({ queryKey: ['/api/admin/administrations'] });
  const { data: labTestTypes = [] } = useQuery<LabTestType[]>({ queryKey: ['/api/admin/lab-test-types'] });
  const { data: imagingTypes = [] } = useQuery<ImagingFiles[]>({ queryKey: ['/api/admin/imaging-results'] });
  const { data: medicationLinks = [] } = useQuery<any[]>({ queryKey: ['/api/admin/medication-links'] });
  const { data: intakeOutputRecords = [] } = useQuery<any[]>({ queryKey: ['/api/admin/intake-output'] });
  const { data: assessmentRecords = [] } = useQuery<any[]>({ queryKey: ['/api/admin/assessments'] });

  // Generic CRUD mutations
  const createMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string, data: any }) => {
      console.log('CREATE: Sending request to', endpoint, 'with data:', data);
      
      // Check if this is an imaging result with file upload
      if (endpoint.includes('imaging-results') && data.imageFile) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            formData.append(key, data[key]);
          }
        });
        
        // Use fetch instead of apiRequest for file uploads
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('CREATE: File upload response:', result);
        return result;
      } else {
        const response = await apiRequest(endpoint, 'POST', data);
        console.log('CREATE: Response received:', response);
        return response;
      }
    },
    onSuccess: (result, variables) => {
      console.log('CREATE: Success! Created:', result);
      queryClient.invalidateQueries({ queryKey: [variables.endpoint] });
      
      // For prescription creation, also invalidate patient-specific prescription cache
      if (variables.endpoint === '/api/admin/prescriptions' && result.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients', result.patientId, 'prescriptions'] 
        });
      }
      
      // For patient-specific intake/output creation, also invalidate admin cache
      if (variables.endpoint.includes('/intake-output')) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/intake-output'] });
      }
      
      // For patient-specific assessments creation, also invalidate admin cache
      if (variables.endpoint.includes('/assessments')) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/assessments'] });
      }
      
      setEditingItem(null);
      toast({
        title: "Record Created",
        description: "The record has been successfully created.",
      });
    },
    onError: (error: any) => {
      console.error('CREATE: Error creating item:', error);
      toast({
        title: "Error Creating Record",
        description: error?.message || "Failed to create the record. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string, data: any }) => {
      console.log('UPDATE: Sending PUT request to', endpoint, 'with data:', data);
      const response = await apiRequest(endpoint, 'PUT', data);
      console.log('UPDATE: Response received:', response);
      return response;
    },
    onSuccess: (result, variables) => {
      const baseEndpoint = variables.endpoint.split('/').slice(0, -1).join('/');
      queryClient.invalidateQueries({ queryKey: [baseEndpoint] });
      
      // For prescription updates, also invalidate patient-specific prescription cache
      if (baseEndpoint === '/api/admin/prescriptions' && variables.data?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients', variables.data.patientId, 'prescriptions'] 
        });
      }
      
      // For intake/output updates, also invalidate patient-specific cache
      if (baseEndpoint === '/api/admin/intake-output' && variables.data?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients', variables.data.patientId, 'intake-output'] 
        });
      }
      
      // For assessment updates, also invalidate patient-specific cache
      if (baseEndpoint === '/api/admin/assessments' && variables.data?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients', variables.data.patientId, 'assessments'] 
        });
      }
      
      setEditingItem(null);
      toast({
        title: "Record Updated",
        description: "The record has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error('UPDATE: Error updating item:', error);
      console.error('UPDATE: Error message:', error.message);
      console.error('UPDATE: Error stack:', error.stack);
      toast({
        title: "Update Failed",
        description: `There was an error updating the record: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Special mutation for prescription updates using PATCH and patient-specific endpoint
  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string, data: any }) => {
      console.log('UPDATE PRESCRIPTION: Sending PATCH request to', endpoint, 'with data:', data);
      const response = await apiRequest(endpoint, 'PATCH', {
        dosage: data.dosage,
        periodicity: data.periodicity,
        duration: data.duration,
        route: data.route,
        startDate: data.startDate,
        endDate: data.endDate,
        pin: '0000' // Admin bypass
      });
      console.log('UPDATE PRESCRIPTION: Success! Updated:', response);
      return response;
    },
    onSuccess: (result, variables) => {
      // Invalidate admin prescriptions cache
      queryClient.invalidateQueries({ queryKey: ['/api/admin/prescriptions'] });
      
      // Also invalidate patient-specific prescription cache if we have patientId
      const patientId = variables.data?.patientId;
      if (patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients', patientId, 'prescriptions'] 
        });
      }
      
      setEditingItem(null);
      toast({
        title: "Prescription Updated",
        description: "The prescription has been successfully updated.",
      });
    },
  });

  // Special mutation for patient updates using PATCH and patient endpoint
  const updatePatientSpecialMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string, data: any }) => {
      console.log('UPDATE PATIENT: Sending PATCH request to', endpoint, 'with data:', data);
      const response = await apiRequest(endpoint, 'PATCH', data);
      console.log('UPDATE PATIENT: Success! Updated:', response);
      return response;
    },
    onSuccess: (result, variables) => {
      // Invalidate admin patients cache
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients'] });
      
      // Also invalidate general patients cache
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      
      setEditingItem(null);
      toast({
        title: "Patient Updated",
        description: "The patient has been successfully updated.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ endpoint }: { endpoint: string }) => {
      const response = await apiRequest(endpoint, 'DELETE');
      return response;
    },
    onSuccess: (_, variables) => {
      const baseEndpoint = variables.endpoint.split('/').slice(0, -1).join('/');
      queryClient.invalidateQueries({ queryKey: [baseEndpoint] });
      
      // For prescription deletions, invalidate all patient prescription caches
      if (baseEndpoint === '/api/admin/prescriptions') {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients'],
          predicate: (query) => {
            // Invalidate any query that starts with ['/api/patients', patientId, 'prescriptions']
            const key = query.queryKey as string[];
            return key.length >= 3 && key[0] === '/api/patients' && key[2] === 'prescriptions';
          }
        });
      }
      
      // For intake/output deletions, also invalidate admin cache and patient-specific caches
      if (variables.endpoint.includes('/intake-output/')) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/intake-output'] });
        // Also invalidate any patient-specific intake-output caches
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients'],
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key.length >= 3 && key[0] === '/api/patients' && key[2] === 'intake-output';
          }
        });
      }
      
      // For assessments deletions, also invalidate admin cache and patient-specific caches
      if (variables.endpoint.includes('/assessments/')) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/assessments'] });
        // Also invalidate any patient-specific assessments caches
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients'],
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key.length >= 3 && key[0] === '/api/patients' && key[2] === 'assessments';
          }
        });
      }
      
      setShowDeleteConfirm(null);
      toast({
        title: "Record Deleted",
        description: "The record has been successfully deleted.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation for vitals
  const bulkDeleteVitalsMutation = useMutation({
    mutationFn: async (vitalIds: string[]) => {
      // Delete each vital individually
      await Promise.all(
        vitalIds.map(id => apiRequest(`/api/admin/vitals/${id}`, 'DELETE'))
      );
      return vitalIds;
    },
    onSuccess: (deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vitals'] });
      setSelectedVitals([]);
      toast({
        title: "Vitals Deleted",
        description: `Successfully deleted ${deletedIds.length} vital records.`,
        variant: "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete some vital records. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Import/Export functionality
  const exportDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/export', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to export database');
      }
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medchart-database-${new Date().toISOString().split('T')[0]}.sqlite`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  const importDatabaseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('database', file);
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      alert('Database imported successfully!');
    },
  });

  const handleCreate = (endpoint: string, data: any) => {
    createMutation.mutate({ endpoint, data });
  };

  const handleUpdate = (endpoint: string, data: any) => {
    updateMutation.mutate({ endpoint, data });
  };

  const updatePrescriptionSpecial = (endpoint: string, data: any) => {
    updatePrescriptionMutation.mutate({ endpoint, data });
  };

  const updatePatientSpecial = (endpoint: string, data: any) => {
    updatePatientSpecialMutation.mutate({ endpoint, data });
  };

  const handleDelete = (type: string, id: string) => {
    const endpoints = {
      users: `/api/admin/users/${id}`,
      patients: `/api/admin/patients/${id}`,
      medicines: `/api/admin/medicines/${id}`,
      prescriptions: `/api/admin/prescriptions/${id}`,
      vitals: `/api/admin/vitals/${id}`,
      results: `/api/admin/lab-results/${id}`,
      'care-notes': `/api/admin/care-notes/${id}`,
      administrations: `/api/admin/administrations/${id}`,
      'lab-tests': `/api/admin/lab-test-types/${id}`,
      imaging: `/api/admin/imaging-results/${id}`,
      'intake-output': `/api/admin/intake-output/${id}`,
      'assessment': `/api/admin/assessments/${id}`,
      'medication-link': `/api/admin/medication-links/${id}`,
    };
    deleteMutation.mutate({ endpoint: endpoints[type as keyof typeof endpoints] });
  };

  // Vitals selection handlers
  const handleSelectAllVitals = (checked: boolean) => {
    if (checked) {
      setSelectedVitals(vitals.map(v => v.id));
    } else {
      setSelectedVitals([]);
    }
  };

  const handleSelectVital = (vitalId: string, checked: boolean) => {
    if (checked) {
      setSelectedVitals(prev => [...prev, vitalId]);
    } else {
      setSelectedVitals(prev => prev.filter(id => id !== vitalId));
    }
  };

  const handleBulkDeleteVitals = () => {
    if (selectedVitals.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedVitals.length} vital record${selectedVitals.length > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      bulkDeleteVitalsMutation.mutate(selectedVitals);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.sqlite')) {
      importDatabaseMutation.mutate(file);
    } else {
      alert('Please select a valid SQLite database file (.sqlite)');
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'users', label: 'Users', icon: 'fas fa-users', count: users.length },
    { id: 'patients', label: 'Patients', icon: 'fas fa-user-injured', count: patients.length },
    { id: 'medicines', label: 'Medicines', icon: 'fas fa-pills', count: medicines.length },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'fas fa-prescription', count: prescriptions.length },
    { id: 'vitals', label: 'Vitals', icon: 'fas fa-heartbeat', count: vitals.length },
    { id: 'results', label: 'Lab Results', icon: 'fas fa-flask', count: labResults.length },
    { id: 'imaging', label: 'Imaging', icon: 'fas fa-x-ray', count: imagingTypes.length },
    { id: 'care-notes', label: 'Care Notes', icon: 'fas fa-notes-medical', count: careNotes.length },
    { id: 'administrations', label: 'Administrations', icon: 'fas fa-syringe', count: administrations.length },
    { id: 'lab-tests', label: 'Lab Test Types', icon: 'fas fa-vials', count: labTestTypes.length },
    { id: 'intake-output', label: 'Intake/Output', icon: 'fas fa-tint', count: intakeOutputRecords.length },
    { id: 'assessments', label: 'Assessments', icon: 'fas fa-clipboard-check', count: assessmentRecords.length },
    { id: 'medication-links', label: 'Medication Links', icon: 'fas fa-link', count: medicationLinks.length },
    { id: 'barcodes', label: 'Barcodes & Print', icon: 'fas fa-barcode', count: patients.length + medicines.length },
    { id: 'import-export', label: 'Import/Export', icon: 'fas fa-database', count: null }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white w-full h-full">
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-medical-primary to-medical-secondary text-white p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <i className="fas fa-shield-alt text-xl sm:text-2xl"></i>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Admin Dashboard</h2>
                <p className="text-xs sm:text-sm text-medical-primary-light hidden sm:block">Complete system management and database control</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
              data-testid="button-close-admin-dashboard"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-medical-border bg-gray-50">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors min-w-max ${
                  activeTab === tab.id
                    ? 'border-medical-primary text-medical-primary bg-white'
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:bg-white/50'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <i className={`${tab.icon} mr-1 sm:mr-2`}></i>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                {tab.count !== null && (
                  <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 sm:py-1 text-xs bg-medical-primary text-white rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 flex-1 overflow-y-auto">
          {/* Users Management */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                <h3 className="text-lg sm:text-xl font-semibold text-medical-text-primary">User Management</h3>
                <button
                  onClick={() => setEditingItem({ type: 'user', data: { username: '', pin: '', role: 'student' } })}
                  className="px-3 sm:px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors text-sm sm:text-base"
                  data-testid="button-add-user"
                >
                  <i className="fas fa-plus mr-1 sm:mr-2"></i>Add User
                </button>
              </div>

              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIN</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Created At</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{user.username}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500 capitalize">{user.role}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500 font-mono">
                          {currentUser?.role === 'instructor' && user.role === 'admin' ? '****' : user.pin}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <div className="flex space-x-1 sm:space-x-2">
                            {!(currentUser?.role === 'instructor' && user.role === 'admin') && (
                              <>
                                <button
                                  onClick={() => setEditingItem({ type: 'user', data: user })}
                                  className="px-2 sm:px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  data-testid={`button-edit-user-${user.id}`}
                                >
                                  <i className="fas fa-edit sm:hidden"></i>
                                  <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm({ type: 'users', id: user.id })}
                                  className="px-2 sm:px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <i className="fas fa-trash sm:hidden"></i>
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              </>
                            )}
                            {currentUser?.role === 'instructor' && user.role === 'admin' && (
                              <span className="px-2 sm:px-3 py-1 text-xs text-gray-500 italic">Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Patients Management */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Patient Management</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'patient', 
                    data: { 
                      name: '', 
                      dob: '', 
                      age: 0, 
                      doseWeight: '', 
                      sex: 'Female', 
                      mrn: Math.floor(10000000 + Math.random() * 90000000).toString(), 
                      fin: Math.floor(10000000 + Math.random() * 90000000).toString(), 
                      admitted: new Date().toISOString().split('T')[0], 
                      codeStatus: 'Full Code',
                      isolation: 'None', 
                      bed: 'LD-103', 
                      allergies: 'None', 
                      status: 'Triage', 
                      provider: 'Dr. Sarah Mitchell', 
                      notes: '', 
                      department: 'Labor & Delivery' 
                    } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-patient"
                >
                  <i className="fas fa-plus mr-2"></i>Add Patient
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patients.map(patient => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{patient.age}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{patient.department}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{patient.bed}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${patient.status === 'Stable' ? 'bg-green-100 text-green-800' : patient.status === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {patient.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{patient.mrn}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingItem({ type: 'patient', data: patient })}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              data-testid={`button-edit-patient-${patient.id}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ type: 'patients', id: patient.id })}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              data-testid={`button-delete-patient-${patient.id}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Medicines Management */}
          {activeTab === 'medicines' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">
                  Medicine Management 
                  <span className="text-sm text-gray-500 ml-2">
                    ({medicinesLoading ? 'Loading...' : `${medicines.length} medicines`})
                  </span>
                </h3>
                <button
                  onClick={() => {
                    setEditingItem({ 
                      type: 'medicine', 
                      data: { 
                        // No ID field - let backend generate sequential ID
                        name: '', 
                        drawer: 'A1', 
                        bin: '01', 
                        category: '', 
                        dose: 'Standard dose', 
                        route: 'PO', 
                        frequency: 'Daily', 
                        is_prn: 0 
                      } 
                    });
                  }}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-medicine"
                >
                  <i className="fas fa-plus mr-2"></i>Add Medicine
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drawer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRN</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {medicines.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(medicine => (
                      <tr key={medicine.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{medicine.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{medicine.drawer}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{medicine.bin}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{medicine.dose || 'Standard dose'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{medicine.route || 'PO'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{medicine.frequency || 'Daily'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${medicine.is_prn ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                            {medicine.is_prn ? 'PRN' : 'Scheduled'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{medicine.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingItem({ type: 'medicine', data: medicine })}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              data-testid={`button-edit-medicine-${medicine.id}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ type: 'medicines', id: medicine.id })}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              data-testid={`button-delete-medicine-${medicine.id}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prescriptions Management */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Prescription Management</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'prescription', 
                    data: { patientId: '', medicineId: '', dosage: '', periodicity: '', route: 'Oral', duration: '', startDate: '', endDate: '' } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-prescription"
                >
                  <i className="fas fa-plus mr-2"></i>Add Prescription
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {prescriptions.map(prescription => {
                      const patient = patients.find(p => p.id === prescription.patientId);
                      const medicine = medicines.find(m => m.id === prescription.medicineId);
                      return (
                        <tr key={prescription.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{medicine?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{prescription.dosage}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{prescription.periodicity}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{prescription.route}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{prescription.duration || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'prescription', data: prescription })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-prescription-${prescription.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'prescriptions', id: prescription.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-prescription-${prescription.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vitals Management */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Vitals Management</h3>
                <div className="flex space-x-3">
                  {selectedVitals.length > 0 && (
                    <button
                      onClick={handleBulkDeleteVitals}
                      disabled={bulkDeleteVitalsMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      data-testid="button-bulk-delete-vitals"
                    >
                      <i className="fas fa-trash mr-2"></i>
                      Delete Selected ({selectedVitals.length})
                    </button>
                  )}
                  <button
                    onClick={() => setEditingItem({ 
                      type: 'vital', 
                      data: { 
                        patientId: '', 
                        pulse: '', 
                        temperature: '', 
                        respirationRate: '', 
                        bloodPressureSystolic: '', 
                        bloodPressureDiastolic: '', 
                        oxygenSaturation: '', 
                        notes: '', 
                        takenAt: new Date().toISOString().slice(0, 16) 
                      } 
                    })}
                    className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                    data-testid="button-add-vital"
                  >
                    <i className="fas fa-plus mr-2"></i>Add Vitals
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={vitals.length > 0 && selectedVitals.length === vitals.length}
                          onChange={(e) => handleSelectAllVitals(e.target.checked)}
                          className="rounded border-gray-300 text-medical-primary focus:ring-medical-primary"
                          data-testid="checkbox-select-all-vitals"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pulse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BP</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resp Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">O2 Sat</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taken At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vitals.map(vital => {
                      const patient = patients.find(p => p.id === vital.patientId);
                      return (
                        <tr key={vital.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedVitals.includes(vital.id)}
                              onChange={(e) => handleSelectVital(vital.id, e.target.checked)}
                              className="rounded border-gray-300 text-medical-primary focus:ring-medical-primary"
                              data-testid={`checkbox-select-vital-${vital.id}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{vital.pulse} bpm</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{vital.temperature}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{vital.respirationRate}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{vital.oxygenSaturation || 'N/A'}%</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {vital.takenAt ? new Date(vital.takenAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'vital', data: vital })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-vital-${vital.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'vitals', id: vital.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-vital-${vital.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* Lab Results Management */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Lab Results Management</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'result', 
                    data: { patientId: '', testName: '', testCode: '', value: '', unit: '', referenceRange: '', status: 'normal', takenAt: '', resultedAt: '', notes: '' } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-result"
                >
                  <i className="fas fa-plus mr-2"></i>Add Lab Result
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Range</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taken At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {labResults.map(result => {
                      const patient = patients.find(p => p.id === result.patientId);
                      return (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{result.testName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{result.value} {result.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{result.referenceRange || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${result.status === 'normal' ? 'bg-green-100 text-green-800' : result.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {result.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {result.takenAt ? new Date(result.takenAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'result', data: result })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-result-${result.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'results', id: result.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-result-${result.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Care Notes Management */}
          {activeTab === 'care-notes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Care Notes Management</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'care-note', 
                    data: { patientId: '', content: '', category: 'nursing', createdBy: '' } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-care-note"
                >
                  <i className="fas fa-plus mr-2"></i>Add Care Note
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {careNotes.map(note => {
                      const patient = patients.find(p => p.id === note.patientId);
                      return (
                        <tr key={note.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">{note.category}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{note.content}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{note.createdBy}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'care-note', data: note })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-care-note-${note.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'care-notes', id: note.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-care-note-${note.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Administrations Management */}
          {activeTab === 'administrations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Medication Administrations</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'administration', 
                    data: { patientId: '', medicineId: '', administeredBy: '', status: 'success', message: '' } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-administration"
                >
                  <i className="fas fa-plus mr-2"></i>Add Administration
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Administered By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Administered At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {administrations.map(admin => {
                      const patient = patients.find(p => p.id === admin.patientId);
                      const medicine = medicines.find(m => m.id === admin.medicineId);
                      return (
                        <tr key={admin.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{medicine?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{admin.administeredBy || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${admin.status === 'success' ? 'bg-green-100 text-green-800' : admin.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{admin.message}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {admin.administeredAt ? new Date(admin.administeredAt).toLocaleString([], { 
                              timeZone: 'America/New_York',
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'administration', data: admin })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-administration-${admin.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'administrations', id: admin.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-administration-${admin.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lab Tests Management */}
          {activeTab === 'lab-tests' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Lab Test Types</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'lab-test', 
                    data: { code: '', name: '', category: '', unit: '', referenceRange: '', isActive: 1 } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-lab-test"
                >
                  <i className="fas fa-plus mr-2"></i>Add Lab Test
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Range</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {labTestTypes.map(test => (
                      <tr key={test.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{test.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{test.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{test.category || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{test.unit || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{test.referenceRange || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${test.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {test.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingItem({ type: 'lab-test', data: test })}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              data-testid={`button-edit-lab-test-${test.id}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ type: 'lab-tests', id: test.id })}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              data-testid={`button-delete-lab-test-${test.id}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Imaging Results Management */}
          {activeTab === 'imaging' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Imaging Results</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'imaging', 
                    data: { studyType: '', studyDescription: '', bodyPart: '' } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-imaging"
                >
                  <i className="fas fa-plus mr-2"></i>Add Imaging Result
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Study Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Study Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Body Part</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Study Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {imagingTypes.map(imaging => {
                      const patient = patients.find(p => p.id === imaging.patientId);
                      return (
                        <tr key={imaging.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{imaging.studyDescription}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">{imaging.studyType}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{imaging.bodyPart || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {imaging.studyDate ? new Date(imaging.studyDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'imaging', data: imaging })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-imaging-${imaging.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'imaging', id: imaging.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-imaging-${imaging.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Intake/Output Records Management */}
          {activeTab === 'intake-output' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Intake/Output Records</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'intake-output', 
                    data: { 
                      patientId: '', type: 'intake', category: '', amount: '', 
                      description: '', recordedAt: new Date().toISOString().slice(0, 16),
                      recordedBy: currentUser?.username || ''
                    } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-intake-output"
                >
                  <i className="fas fa-plus mr-2"></i>Add Record
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (mL)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {intakeOutputRecords.map(record => {
                      const patient = patients.find(p => p.id === record.patientId);
                      return (
                        <tr key={record.id || `io-${record.patientId}-${record.type}-${record.recordedAt}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.type === 'intake' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {record.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{record.category}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{record.amount}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{record.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{record.recordedBy}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(record.recordedAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'intake-output', data: record })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-intake-output-${record.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'intake-output', id: record.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-intake-output-${record.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Assessments Management */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-medical-text-primary">Assessment Records</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'assessment', 
                    data: { 
                      patientId: '', assessmentType: '', score: '', description: '', 
                      findings: '', assessedAt: new Date().toISOString().slice(0, 16),
                      assessedBy: currentUser?.username || ''
                    } 
                  })}
                  className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors"
                  data-testid="button-add-assessment"
                >
                  <i className="fas fa-plus mr-2"></i>Add Record
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-medical-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Findings</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessed By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessed At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assessmentRecords.map(assessment => {
                      const patient = patients.find(p => p.id === assessment.patientId);
                      return (
                        <tr key={assessment.id || `assess-${assessment.patientId}-${assessment.assessmentType}-${assessment.assessedAt}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{assessment.assessmentType}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {assessment.score !== null ? assessment.score : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{assessment.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{assessment.findings}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{assessment.assessedBy}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(assessment.assessedAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingItem({ type: 'assessment', data: assessment })}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                data-testid={`button-edit-assessment-${assessment.id}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'assessment', id: assessment.id })}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                data-testid={`button-delete-assessment-${assessment.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Medication Links Management */}
          {activeTab === 'medication-links' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                <h3 className="text-lg sm:text-xl font-semibold text-medical-text-primary">Medication Protocol Links</h3>
                <button
                  onClick={() => setEditingItem({ 
                    type: 'medication-link', 
                    data: { 
                      triggerMedicineId: '', 
                      followMedicineId: '',
                      delayMinutes: 0,
                      followFrequency: '',
                      followDurationHours: 24,
                      defaultDoseOverride: ''
                    } 
                  })}
                  className="px-3 sm:px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors text-sm sm:text-base"
                  data-testid="button-add-medication-link"
                >
                  <i className="fas fa-plus mr-1 sm:mr-2"></i>Add Protocol Link
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-medical-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-medical-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-medical-text-muted uppercase tracking-wider">Trigger Medicine</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-medical-text-muted uppercase tracking-wider">Follow Medicine</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-medical-text-muted uppercase tracking-wider">Delay</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-medical-text-muted uppercase tracking-wider">Frequency</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-medical-text-muted uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-medical-text-muted uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-medical-border">
                      {medicationLinks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-medical-text-muted">
                            <i className="fas fa-link text-2xl mb-2 opacity-50"></i>
                            <div>No medication protocol links found</div>
                            <div className="text-sm">Create your first protocol link to get started</div>
                          </td>
                        </tr>
                      ) : (
                        medicationLinks.map((link: any) => {
                          const triggerMedicine = medicines.find(m => m.id === link.triggerMedicineId);
                          const followMedicine = medicines.find(m => m.id === link.followMedicineId);
                          
                          return (
                            <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-medical-text-primary" data-testid={`text-trigger-medicine-${link.id}`}>
                                <div className="font-medium">{triggerMedicine?.name || 'Unknown'}</div>
                                <div className="text-xs text-medical-text-muted">ID: {link.triggerMedicineId}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-medical-text-primary" data-testid={`text-follow-medicine-${link.id}`}>
                                <div className="font-medium">{followMedicine?.name || 'Unknown'}</div>
                                <div className="text-xs text-medical-text-muted">ID: {link.followMedicineId}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-medical-text-primary" data-testid={`text-delay-${link.id}`}>
                                {link.delayMinutes} minutes
                              </td>
                              <td className="px-4 py-3 text-sm text-medical-text-primary" data-testid={`text-frequency-${link.id}`}>
                                {link.followFrequency}
                              </td>
                              <td className="px-4 py-3 text-sm text-medical-text-primary" data-testid={`text-duration-${link.id}`}>
                                {link.followDurationHours} hours
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditingItem({ type: 'medication-link', data: link })}
                                    className="text-medical-primary hover:text-medical-primary/80 transition-colors"
                                    data-testid={`button-edit-medication-link-${link.id}`}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm({ type: 'medication-link', id: link.id })}
                                    className="text-red-600 hover:text-red-700 transition-colors"
                                    data-testid={`button-delete-medication-link-${link.id}`}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Information Panel */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="fas fa-info-circle text-blue-600 mt-0.5 mr-3"></i>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Medication Protocol Links</div>
                    <div className="space-y-1">
                      <div>• Create protocol templates that automatically prompt for follow-up medications</div>
                      <div>• When the trigger medicine is administered, the follow-up prescription becomes active after the specified delay</div>
                      <div>• Example: Penicillin loading dose → followed by maintenance dose every 4 hours</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barcodes & Print */}
          {activeTab === 'barcodes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h3 className="text-lg sm:text-xl font-semibold text-medical-text-primary">Barcode Management & Printing</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      const patientBarcodes = patients.map(patient => 
                        `<div class="page-break" style="padding: 20px; text-align: center; border: 1px solid #ccc; margin-bottom: 20px; background: white;">
                          <h2 style="margin-bottom: 10px; color: #333;">${patient.name}</h2>
                          <canvas id="barcode-patient-${patient.id}" style="margin: 10px 0;"></canvas>
                          <p style="margin-top: 10px; font-weight: bold;">Patient ID: ${patient.id}</p>
                        </div>`
                      ).join('');
                      const medicationBarcodes = medicines.map(medicine => 
                        `<div class="page-break" style="padding: 20px; text-align: center; border: 1px solid #ccc; margin-bottom: 20px; background: white;">
                          <h2 style="margin-bottom: 10px; color: #333;">${medicine.name}</h2>
                          <canvas id="barcode-medicine-${medicine.id}" style="margin: 10px 0;"></canvas>
                          <p style="margin-top: 10px; font-weight: bold;">Medication ID: ${medicine.id}</p>
                        </div>`
                      ).join('');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>All Barcodes</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                                .page-break { break-inside: avoid; }
                                @media print { .page-break { page-break-after: always; } }
                              </style>
                            </head>
                            <body>
                              <h1 style="text-align: center; margin-bottom: 30px;">Medical Training System - All Barcodes</h1>
                              <h2 style="border-bottom: 2px solid #333; padding-bottom: 10px;">Patient Barcodes</h2>
                              ${patientBarcodes}
                              <h2 style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 40px;">Medication Barcodes</h2>
                              ${medicationBarcodes}
                              <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                              <script>
                                window.onload = function() {
                                  ${patients.map(patient => `JsBarcode("#barcode-patient-${patient.id}", "${patient.id}", {format: "CODE128", width: 3, height: 120, displayValue: true});`).join('')}
                                  ${medicines.map(medicine => `JsBarcode("#barcode-medicine-${medicine.id}", "${medicine.id}", {format: "CODE128", width: 3, height: 120, displayValue: true});`).join('')}
                                  setTimeout(() => window.print(), 1500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="px-3 sm:px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors text-sm sm:text-base"
                    data-testid="button-print-all-barcodes"
                  >
                    <i className="fas fa-print mr-1 sm:mr-2"></i>Print All Barcodes
                  </button>
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      const patientBarcodes = patients.map(patient => 
                        `<div class="page-break" style="padding: 20px; text-align: center; border: 1px solid #ccc; margin-bottom: 20px; background: white;">
                          <h2 style="margin-bottom: 10px; color: #333;">${patient.name}</h2>
                          <p style="margin-bottom: 5px; color: #666;">DOB: ${patient.dob}</p>
                          <canvas id="barcode-patient-${patient.id}" style="margin: 10px 0;"></canvas>
                          <p style="margin-top: 10px; font-weight: bold;">Patient ID: ${patient.id}</p>
                        </div>`
                      ).join('');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Patient Barcodes</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                                .page-break { break-inside: avoid; }
                                @media print { .page-break { page-break-after: always; } }
                              </style>
                            </head>
                            <body>
                              <h1 style="text-align: center; margin-bottom: 30px;">Medical Training System - Patient Barcodes</h1>
                              ${patientBarcodes}
                              <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                              <script>
                                window.onload = function() {
                                  ${patients.map(patient => `JsBarcode("#barcode-patient-${patient.id}", "${patient.id}", {format: "CODE128", width: 3, height: 120, displayValue: true});`).join('')}
                                  setTimeout(() => window.print(), 1500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                    data-testid="button-print-patient-barcodes"
                  >
                    <i className="fas fa-user-injured mr-1 sm:mr-2"></i>Print Patient Barcodes
                  </button>
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      const medicationBarcodes = medicines.map(medicine => 
                        `<div class="page-break" style="padding: 20px; text-align: center; border: 1px solid #ccc; margin-bottom: 20px; background: white;">
                          <h2 style="margin-bottom: 10px; color: #333;">${medicine.name}</h2>
                          <p style="margin-bottom: 5px; color: #666;">Drawer: ${medicine.drawer} | Bin: ${medicine.bin}</p>
                          <canvas id="barcode-medicine-${medicine.id}" style="margin: 10px 0;"></canvas>
                          <p style="margin-top: 10px; font-weight: bold;">Medication ID: ${medicine.id}</p>
                        </div>`
                      ).join('');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Medication Barcodes</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                                .page-break { break-inside: avoid; }
                                @media print { .page-break { page-break-after: always; } }
                              </style>
                            </head>
                            <body>
                              <h1 style="text-align: center; margin-bottom: 30px;">Medical Training System - Medication Barcodes</h1>
                              ${medicationBarcodes}
                              <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                              <script>
                                window.onload = function() {
                                  ${medicines.map(medicine => `JsBarcode("#barcode-medicine-${medicine.id}", "${medicine.id}", {format: "CODE128", width: 3, height: 120, displayValue: true});`).join('')}
                                  setTimeout(() => window.print(), 1500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                    data-testid="button-print-medication-barcodes"
                  >
                    <i className="fas fa-pills mr-1 sm:mr-2"></i>Print Medication Barcodes
                  </button>
                </div>
              </div>

              {/* Patient Barcodes Section */}
              <div className="bg-white border border-medical-border rounded-lg">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-medical-border">
                  <h4 className="text-base sm:text-lg font-semibold text-medical-text-primary flex items-center">
                    <i className="fas fa-user-injured mr-2 text-medical-primary"></i>
                    Patient ID Barcodes ({patients.length})
                  </h4>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {patients.map((patient) => (
                      <div key={patient.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                        <div className="text-center mb-3 sm:mb-4">
                          <h5 className="font-medium text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{patient.name}</h5>
                          <p className="text-xs sm:text-sm text-gray-600">DOB: {patient.dob}</p>
                        </div>
                        <div className="flex justify-center mb-3 sm:mb-4">
                          <Barcode value={patient.id} type="patient" width={1.5} height={80} className="scale-75 sm:scale-100" />
                        </div>
                        <button
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Patient Barcode - ${patient.name}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                                      .barcode-container { margin: 20px 0; }
                                    </style>
                                  </head>
                                  <body>
                                    <h1>Medical Training System</h1>
                                    <h2>${patient.name}</h2>
                                    <p>Date of Birth: ${patient.dob}</p>
                                    <div class="barcode-container">
                                      <canvas id="barcode"></canvas>
                                    </div>
                                    <p><strong>Patient ID: ${patient.id}</strong></p>
                                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                                    <script>
                                      window.onload = function() {
                                        JsBarcode("#barcode", "${patient.id}", {
                                          format: "CODE128",
                                          width: 3,
                                          height: 120,
                                          displayValue: true
                                        });
                                        setTimeout(() => window.print(), 1000);
                                      };
                                    </script>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }
                          }}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                          data-testid={`button-print-patient-${patient.id}`}
                        >
                          <i className="fas fa-print mr-1 sm:mr-2"></i>Print
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Medication Barcodes Section */}
              <div className="bg-white border border-medical-border rounded-lg">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-medical-border">
                  <h4 className="text-base sm:text-lg font-semibold text-medical-text-primary flex items-center">
                    <i className="fas fa-pills mr-2 text-medical-primary"></i>
                    Medication ID Barcodes ({medicines.length})
                  </h4>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {medicines.map((medicine) => (
                      <div key={medicine.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                        <div className="text-center mb-3 sm:mb-4">
                          <h5 className="font-medium text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{medicine.name}</h5>
                          <p className="text-xs sm:text-sm text-gray-600">Drawer: {medicine.drawer} | Bin: {medicine.bin}</p>
                        </div>
                        <div className="flex justify-center mb-3 sm:mb-4">
                          <Barcode value={medicine.id} type="medication" width={1.5} height={80} className="scale-75 sm:scale-100" />
                        </div>
                        <button
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Medication Barcode - ${medicine.name}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                                      .barcode-container { margin: 20px 0; }
                                    </style>
                                  </head>
                                  <body>
                                    <h1>Medical Training System</h1>
                                    <h2>${medicine.name}</h2>
                                    <p>Drawer: ${medicine.drawer} | Bin: ${medicine.bin}</p>
                                    <div class="barcode-container">
                                      <canvas id="barcode"></canvas>
                                    </div>
                                    <p><strong>Medication ID: ${medicine.id}</strong></p>
                                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                                    <script>
                                      window.onload = function() {
                                        JsBarcode("#barcode", "${medicine.id}", {
                                          format: "CODE128",
                                          width: 3,
                                          height: 120,
                                          displayValue: true
                                        });
                                        setTimeout(() => window.print(), 1000);
                                      };
                                    </script>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }
                          }}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs sm:text-sm"
                          data-testid={`button-print-medication-${medicine.id}`}
                        >
                          <i className="fas fa-print mr-1 sm:mr-2"></i>Print
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import/Export */}
          {activeTab === 'import-export' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-medical-text-primary">Database Import/Export</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Export Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <i className="fas fa-download text-blue-600 text-xl"></i>
                    <h4 className="text-lg font-medium text-blue-800">Export Database</h4>
                  </div>
                  <p className="text-blue-700 mb-4">
                    Export the current database as an SQLite file that can be shared or used as a backup.
                  </p>
                  <button
                    onClick={() => exportDatabaseMutation.mutate()}
                    disabled={exportDatabaseMutation.isPending}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    data-testid="button-export-database"
                  >
                    {exportDatabaseMutation.isPending ? (
                      <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</>
                    ) : (
                      <><i className="fas fa-download mr-2"></i>Export Database</>
                    )}
                  </button>
                </div>

                {/* Import Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <i className="fas fa-upload text-green-600 text-xl"></i>
                    <h4 className="text-lg font-medium text-green-800">Import Database</h4>
                  </div>
                  <p className="text-green-700 mb-4">
                    Import an SQLite database file to replace the current database. This will overwrite all existing data.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sqlite,.db"
                    onChange={handleFileImport}
                    className="hidden"
                    data-testid="input-import-file"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importDatabaseMutation.isPending}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    data-testid="button-import-database"
                  >
                    {importDatabaseMutation.isPending ? (
                      <><i className="fas fa-spinner fa-spin mr-2"></i>Importing...</>
                    ) : (
                      <><i className="fas fa-upload mr-2"></i>Import Database</>
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                  <div>
                    <h5 className="font-medium text-yellow-800 mb-2">Important Notes:</h5>
                    <ul className="text-yellow-700 space-y-1 text-sm">
                      <li>• Imported databases will completely replace existing data</li>
                      <li>• Export before importing to create a backup</li>
                      <li>• Only SQLite database files (.sqlite, .db) are supported</li>
                      <li>• Database templates can be shared between training installations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingItem.data.id ? 'Edit' : 'Add'} {editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)}
                </h3>
                
                {/* Dynamic form based on type */}
                <div className="space-y-4">
                  {editingItem.type === 'user' && (
                    <>
                      <input
                        type="text"
                        placeholder="Username"
                        value={editingItem.data.username || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, username: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-username"
                      />
                      <input
                        type="text"
                        placeholder="PIN"
                        value={editingItem.data.pin || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, pin: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-pin"
                      />
                      <select
                        value={editingItem.data.role || 'student'}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, role: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-role"
                      >
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </>
                  )}

                  {editingItem.type === 'patient' && (
                    <>
                      <div className="text-center mb-6">
                        <h4 className="text-lg font-semibold text-medical-text-primary mb-2">
                          {editingItem.data.id ? 'Edit Patient' : 'Register New Patient'}
                        </h4>
                        <p className="text-medical-text-muted">Enter complete patient information for medical record creation</p>
                      </div>

                      {/* Generated Patient ID Display - only for new patients */}
                      {!editingItem.data.id && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center mb-6">
                          <p className="text-sm font-medium text-medical-text-secondary mb-1">Generated Patient ID (Barcode)</p>
                          <p className="text-xl font-mono font-bold text-medical-primary">
                            {Math.floor(100000000000 + Math.random() * 900000000000).toString()}
                          </p>
                          <p className="text-xs text-medical-text-muted mt-1">This ID will be printed on the patient wristband</p>
                        </div>
                      )}

                      {/* Patient Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Personal Information */}
                        <div className="space-y-4">
                          <h5 className="font-semibold text-medical-text-primary border-b border-medical-border pb-2">Personal Information</h5>
                          
                          <div>
                            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Full Name *</label>
                            <input
                              type="text"
                              value={editingItem.data.name || ''}
                              onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, name: e.target.value}})}
                              required
                              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                              placeholder="Enter patient's full name"
                              data-testid="input-edit-patient-name"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date of Birth *</label>
                              <input
                                type="date"
                                value={editingItem.data.dob || ''}
                                onChange={(e) => {
                                  const calculateAge = (dob: string) => {
                                    if (!dob) return 0;
                                    const today = new Date();
                                    const birthDate = new Date(dob);
                                    let age = today.getFullYear() - birthDate.getFullYear();
                                    const monthDiff = today.getMonth() - birthDate.getMonth();
                                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                      age--;
                                    }
                                    return age;
                                  };
                                  const age = calculateAge(e.target.value);
                                  setEditingItem({...editingItem, data: {...editingItem.data, dob: e.target.value, age}});
                                }}
                                required
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                                data-testid="input-edit-patient-dob"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Age *</label>
                              <input
                                type="number"
                                value={editingItem.data.age || ''}
                                onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, age: parseInt(e.target.value) || 0}})}
                                required
                                min="0"
                                max="120"
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-gray-50"
                                placeholder="Auto-calculated from DOB"
                                data-testid="input-edit-patient-age"
                                readOnly
                              />
                              <p className="text-xs text-medical-text-muted mt-1">Automatically calculated from date of birth</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Sex *</label>
                              <select
                                value={editingItem.data.sex || ''}
                                onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, sex: e.target.value}})}
                                required
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
                                data-testid="select-edit-patient-sex"
                              >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Dose Weight *</label>
                              <input
                                type="text"
                                value={editingItem.data.doseWeight || ''}
                                onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, doseWeight: e.target.value}})}
                                required
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                                placeholder="e.g., 70 kg"
                                data-testid="input-edit-patient-dose-weight"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Medical Information */}
                        <div className="space-y-4">
                          <h5 className="font-semibold text-medical-text-primary border-b border-medical-border pb-2">Medical Information</h5>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">MRN * (8 digits)</label>
                              <input
                                type="text"
                                value={editingItem.data.mrn || ''}
                                onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, mrn: e.target.value}})}
                                required
                                maxLength={8}
                                pattern="[0-9]{8}"
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent font-mono"
                                placeholder="12345678"
                                data-testid="input-edit-patient-mrn"
                              />
                              <p className="text-xs text-medical-text-muted mt-1">Auto-generated 8-digit medical record number</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">FIN * (8 digits)</label>
                              <input
                                type="text"
                                value={editingItem.data.fin || ''}
                                onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, fin: e.target.value}})}
                                required
                                maxLength={8}
                                pattern="[0-9]{8}"
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent font-mono"
                                placeholder="87654321"
                                data-testid="input-edit-patient-fin"
                              />
                              <p className="text-xs text-medical-text-muted mt-1">Auto-generated 8-digit financial number</p>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Admission Date *</label>
                            <input
                              type="date"
                              value={editingItem.data.admitted || ''}
                              onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, admitted: e.target.value}})}
                              required
                              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                              data-testid="input-edit-patient-admitted"
                            />
                            <p className="text-xs text-medical-text-muted mt-1">Auto-filled with today's date</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Isolation Precautions</label>
                            <select
                              value={editingItem.data.isolation || ''}
                              onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, isolation: e.target.value}})}
                              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
                              data-testid="select-edit-patient-isolation"
                            >
                              <option value="None">None</option>
                              <option value="Contact Precautions">Contact Precautions</option>
                              <option value="Droplet Precautions">Droplet Precautions</option>
                              <option value="Airborne Precautions">Airborne Precautions</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Department *</label>
                            <select
                              value={editingItem.data.department || ''}
                              onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, department: e.target.value}})}
                              required
                              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
                              data-testid="select-edit-patient-department"
                            >
                              <option value="Labor & Delivery">Labor & Delivery</option>
                              <option value="Postpartum">Postpartum</option>
                              <option value="Newborn">Newborn</option>
                              <option value="Medical">Medical</option>
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Bed Assignment *</label>
                              <input
                                type="text"
                                value={editingItem.data.bed || ''}
                                onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, bed: e.target.value}})}
                                required
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                                placeholder="e.g., LD-102"
                                data-testid="input-edit-patient-bed"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Status *</label>
                              <select
                                value={editingItem.data.status || ''}
                                onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}
                                required
                                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
                                data-testid="select-edit-patient-status"
                              >
                                <option value="Triage">Triage</option>
                                <option value="Observation">Observation</option>
                                <option value="Active Labor">Active Labor</option>
                                <option value="Induction">Induction</option>
                                <option value="LDR (Labor, Delivery, Recovery)">LDR (Labor, Delivery, Recovery)</option>
                                <option value="Delivery Imminent">Delivery Imminent</option>
                                <option value="Pushing / Second Stage">Pushing / Second Stage</option>
                                <option value="In OR / C-section">In OR / C-section</option>
                                <option value="Pre-operative">Pre-operative</option>
                                <option value="PACU (Post-Anesthesia Care Unit)">PACU (Post-Anesthesia Care Unit)</option>
                                <option value="Postpartum Recovery">Postpartum Recovery</option>
                                <option value="Postpartum / Couplet Care">Postpartum / Couplet Care</option>
                                <option value="Preterm Labor">Preterm Labor</option>
                                <option value="Severe Preeclampsia">Severe Preeclampsia</option>
                                <option value="TOLAC">TOLAC</option>
                                <option value="NICU Care">NICU Care</option>
                                <option value="Discharge Pending">Discharge Pending</option>
                                <option value="Stable">Stable</option>
                                <option value="Critical">Critical</option>
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Attending Provider *</label>
                            <select
                              value={editingItem.data.provider || ''}
                              onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, provider: e.target.value}})}
                              required
                              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
                              data-testid="select-edit-patient-provider"
                            >
                              <option value="Dr. Sarah Mitchell">Dr. Sarah Mitchell</option>
                              <option value="Dr. Emily Rodriguez">Dr. Emily Rodriguez</option>
                              <option value="Dr. Michael Chen">Dr. Michael Chen</option>
                              <option value="Dr. Jessica Williams">Dr. Jessica Williams</option>
                              <option value="Dr. David Thompson">Dr. David Thompson</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Allergies</label>
                            <input
                              type="text"
                              value={editingItem.data.allergies || ''}
                              onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, allergies: e.target.value}})}
                              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                              placeholder="e.g., Penicillin, None"
                              data-testid="textarea-edit-patient-allergies"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Notes */}
                      <div className="space-y-4 mt-6">
                        <h5 className="font-semibold text-medical-text-primary border-b border-medical-border pb-2">Clinical Notes</h5>
                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Notes</label>
                          <textarea
                            value={editingItem.data.notes || ''}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, notes: e.target.value}})}
                            rows={3}
                            className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent resize-none"
                            placeholder="Clinical notes, care instructions, or observations..."
                            data-testid="textarea-edit-patient-notes"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {editingItem.type === 'medicine' && (
                    <>
                      {/* Medicine ID field - read-only for both new and existing medicines */}
                      <div className="bg-gray-50 p-3 border rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Medicine ID {editingItem.data.id ? '(Read-only)' : '(Auto-generated)'}
                        </label>
                        <input
                          type="text"
                          value={editingItem.data.id || 'Will be auto-generated'}
                          disabled
                          className="w-full p-2 border rounded bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                          data-testid="input-display-medicine-id"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {editingItem.data.id 
                            ? 'Medicine ID cannot be changed after creation'
                            : 'This ID will be assigned when the medicine is saved'
                          }
                        </p>
                      </div>
                      <input
                        type="text"
                        placeholder="Medicine Name"
                        value={editingItem.data.name || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, name: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-medicine-name"
                      />
                      <select
                        value={editingItem.data.category || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, category: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-medicine-category"
                      >
                        <option value="">Select Category</option>
                        <option value="painkiller">Painkiller</option>
                        <option value="antibiotic">Antibiotic</option>
                        <option value="anti-nausea">Anti-nausea</option>
                        <option value="sedative">Sedative</option>
                        <option value="anti-inflammatory">Anti-inflammatory</option>
                        <option value="antacid">Antacid</option>
                        <option value="vitamin">Vitamin/Supplement</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Drawer (e.g., A1)"
                          value={editingItem.data.drawer || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, drawer: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-medicine-drawer"
                        />
                        <input
                          type="text"
                          placeholder="Bin (e.g., 01)"
                          value={editingItem.data.bin || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, bin: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-medicine-bin"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Dose (e.g., 5mg, 10ml)"
                        value={editingItem.data.dose || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, dose: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-medicine-dose"
                      />
                      <select
                        value={editingItem.data.route || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, route: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-medicine-route"
                      >
                        <option value="">Select Route</option>
                        <option value="PO">PO (Oral)</option>
                        <option value="IV">IV (Intravenous)</option>
                        <option value="IVP">IVP (Intravenous Push)</option>
                        <option value="IM">IM (Intramuscular)</option>
                        <option value="PR">PR (Rectally)</option>
                        <option value="Vaginal Insert">Vaginal Insert (Vaginally)</option>
                        <option value="Intracervical">Intracervical</option>
                        <option value="SC">SC (Subcutaneous)</option>
                        <option value="Buccal">Buccal</option>
                        <option value="Topical">Topical</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Frequency (e.g., q6h, BID, PRN)"
                        value={editingItem.data.frequency || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, frequency: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-medicine-frequency"
                      />
                      <div className="flex items-center p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          id="edit-medicine-prn"
                          checked={editingItem.data.is_prn === 1 || editingItem.data.is_prn === true}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, is_prn: e.target.checked ? 1 : 0}})}
                          className="h-4 w-4 text-medical-primary focus:ring-medical-primary border-gray-300 rounded mr-2"
                          data-testid="checkbox-edit-medicine-prn"
                        />
                        <label htmlFor="edit-medicine-prn" className="text-gray-700">
                          PRN (As Needed) medication
                        </label>
                      </div>
                    </>
                  )}

                  {editingItem.type === 'prescription' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <select
                          value={editingItem.data.patientId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-edit-prescription-patient"
                        >
                          <option value="">Select Patient</option>
                          {patients.map(patient => (
                            <option key={patient.id} value={patient.id}>{patient.name}</option>
                          ))}
                        </select>
                        <select
                          value={editingItem.data.medicineId || ''}
                          onChange={(e) => {
                            const selectedMedicine = medicines.find(m => m.id === e.target.value);
                            setEditingItem({
                              ...editingItem, 
                              data: {
                                ...editingItem.data, 
                                medicineId: e.target.value,
                                // Auto-fill dosage, route, and frequency from selected medicine
                                dosage: selectedMedicine?.dose || editingItem.data.dosage || '',
                                route: selectedMedicine?.route || editingItem.data.route || '',
                                periodicity: selectedMedicine?.frequency || editingItem.data.periodicity || '',
                                selectedMedicineIsPrn: selectedMedicine?.is_prn || 0
                              }
                            });
                          }}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-edit-prescription-medicine"
                        >
                          <option value="">Select Medicine</option>
                          {medicines.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(medicine => (
                            <option key={medicine.id} value={medicine.id}>{medicine.name} (ID: {medicine.id})</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Dosage (e.g., 10mg)"
                          value={editingItem.data.dosage || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, dosage: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-prescription-dosage"
                        />
                        {editingItem.data.selectedMedicineIsPrn === 1 ? (
                          <select
                            value={editingItem.data.periodicity || ''}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, periodicity: e.target.value}})}
                            className="w-full p-3 border rounded-lg"
                            data-testid="select-edit-prescription-frequency"
                          >
                            <option value="">Select frequency...</option>
                            {editingItem.data.medicineId && medicines.find(m => m.id === editingItem.data.medicineId)?.frequency && (
                              <option value={medicines.find(m => m.id === editingItem.data.medicineId)?.frequency}>
                                {medicines.find(m => m.id === editingItem.data.medicineId)?.frequency}
                              </option>
                            )}
                            <option value="As Needed">As Needed</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Frequency (auto-filled)"
                            value={editingItem.data.periodicity || ''}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, periodicity: e.target.value}})}
                            className="w-full p-3 border rounded-lg"
                            data-testid="input-edit-prescription-frequency"
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <select
                          value={editingItem.data.route || 'PO'}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, route: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-edit-prescription-route"
                        >
                          <option value="PO">PO (Oral)</option>
                          <option value="IV">IV (Intravenous)</option>
                          <option value="IVP">IVP (Intravenous Push)</option>
                          <option value="IM">IM (Intramuscular)</option>
                          <option value="PR">PR (Rectally)</option>
                          <option value="Vaginal Insert">Vaginal Insert (Vaginally)</option>
                          <option value="Intracervical">Intracervical</option>
                          <option value="SC">SC (Subcutaneous)</option>
                          <option value="Buccal">Buccal</option>
                          <option value="Topical">Topical</option>
                        </select>
                        <select
                          value={editingItem.data.duration || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, duration: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-edit-prescription-duration"
                        >
                          <option value="">Select duration...</option>
                          <option value="1 day">1 day</option>
                          <option value="3 days">3 days</option>
                          <option value="5 days">5 days</option>
                          <option value="7 days">7 days</option>
                          <option value="10 days">10 days</option>
                          <option value="14 days">14 days</option>
                          <option value="2 weeks">2 weeks</option>
                          <option value="3 weeks">3 weeks</option>
                          <option value="1 month">1 month</option>
                          <option value="2 months">2 months</option>
                          <option value="3 months">3 months</option>
                          <option value="6 months">6 months</option>
                          <option value="As Needed">As Needed</option>
                          <option value="Ongoing">Ongoing</option>
                        </select>
                      </div>
                    </>
                  )}

                  {editingItem.type === 'vital' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Patient *</label>
                        <select
                          value={editingItem.data.patientId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-vital-patient"
                        >
                          <option value="">Select Patient</option>
                          {patients.map(patient => (
                            <option key={patient.id} value={patient.id}>{patient.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Pulse (bpm) *</label>
                          <input
                            type="number"
                            value={editingItem.data.pulse}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, pulse: parseInt(e.target.value) || 0}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="80"
                            data-testid="input-edit-vital-pulse"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Temperature *</label>
                          <input
                            type="text"
                            value={editingItem.data.temperature}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, temperature: e.target.value}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="98.6°F"
                            data-testid="input-edit-vital-temperature"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Respiration (rpm) *</label>
                          <input
                            type="number"
                            value={editingItem.data.respirationRate}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, respirationRate: parseInt(e.target.value) || 0}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="16"
                            data-testid="input-edit-vital-respiration"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">O2 Saturation (%)</label>
                          <input
                            type="number"
                            value={editingItem.data.oxygenSaturation}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, oxygenSaturation: parseInt(e.target.value) || 0}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="98"
                            data-testid="input-edit-vital-oxygen"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Blood Pressure *</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={editingItem.data.bloodPressureSystolic}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, bloodPressureSystolic: parseInt(e.target.value) || 0}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="120"
                            data-testid="input-edit-vital-systolic"
                          />
                          <input
                            type="number"
                            value={editingItem.data.bloodPressureDiastolic}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, bloodPressureDiastolic: parseInt(e.target.value) || 0}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="80"
                            data-testid="input-edit-vital-diastolic"
                          />
                        </div>
                        <p className="text-xs text-medical-text-muted mt-1">Systolic / Diastolic</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date & Time Taken *</label>
                        <input
                          type="datetime-local"
                          value={editingItem.data.takenAt || new Date().toISOString().slice(0, 16)}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, takenAt: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="input-edit-vital-datetime"
                        />
                        <p className="text-xs text-medical-text-muted mt-1">When were these vitals taken?</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Notes</label>
                        <textarea
                          value={editingItem.data.notes || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, notes: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                          placeholder="Additional observations..."
                          data-testid="textarea-edit-vital-notes"
                        />
                      </div>
                    </>
                  )}

                  {editingItem.type === 'result' && (
                    <>
                      <select
                        value={editingItem.data.patientId || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-result-patient"
                      >
                        <option value="">Select Patient</option>
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>{patient.name}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Test Name"
                          value={editingItem.data.testName}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, testName: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-result-test-name"
                        />
                        <input
                          type="text"
                          placeholder="Test Code"
                          value={editingItem.data.testCode}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, testCode: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-result-test-code"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Value"
                          value={editingItem.data.value}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, value: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-result-value"
                        />
                        <input
                          type="text"
                          placeholder="Unit (e.g., mg/dL)"
                          value={editingItem.data.unit}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, unit: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-result-unit"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Reference Range"
                        value={editingItem.data.referenceRange}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, referenceRange: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-result-reference"
                      />
                      <select
                        value={editingItem.data.status}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-result-status"
                      >
                        <option value="normal">Normal</option>
                        <option value="abnormal">Abnormal</option>
                        <option value="critical">Critical</option>
                        <option value="pending">Pending</option>
                      </select>
                    </>
                  )}

                  {editingItem.type === 'care-note' && (
                    <>
                      <select
                        value={editingItem.data.patientId || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-care-note-patient"
                      >
                        <option value="">Select Patient</option>
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>{patient.name}</option>
                        ))}
                      </select>
                      <select
                        value={editingItem.data.category}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, category: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-care-note-category"
                      >
                        <option value="nursing">Nursing</option>
                        <option value="physician">Physician</option>
                        <option value="therapy">Therapy</option>
                        <option value="social">Social Services</option>
                        <option value="discharge">Discharge Planning</option>
                      </select>
                      <textarea
                        placeholder="Care Note Content"
                        value={editingItem.data.content}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, content: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        rows={4}
                        data-testid="textarea-edit-care-note-content"
                      />
                      <input
                        type="text"
                        placeholder="Created By"
                        value={editingItem.data.createdBy}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, createdBy: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-care-note-created-by"
                      />
                    </>
                  )}

                  {editingItem.type === 'administration' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <select
                          value={editingItem.data.patientId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-edit-administration-patient"
                        >
                          <option value="">Select Patient</option>
                          {patients.map(patient => (
                            <option key={patient.id} value={patient.id}>{patient.name}</option>
                          ))}
                        </select>
                        <select
                          value={editingItem.data.medicineId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, medicineId: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-edit-administration-medicine"
                        >
                          <option value="">Select Medicine</option>
                          {medicines.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(medicine => (
                            <option key={medicine.id} value={medicine.id}>{medicine.name} (ID: {medicine.id})</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Administered By"
                        value={editingItem.data.administeredBy}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, administeredBy: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-administration-by"
                      />
                      <select
                        value={editingItem.data.status}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-administration-status"
                      >
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                      <textarea
                        placeholder="Administration Message/Notes"
                        value={editingItem.data.message}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, message: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        rows={3}
                        data-testid="textarea-edit-administration-message"
                      />
                    </>
                  )}

                  {editingItem.type === 'lab-test' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Test Name"
                          value={editingItem.data.name}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, name: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-lab-test-name"
                        />
                        <input
                          type="text"
                          placeholder="Test Code"
                          value={editingItem.data.code}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, code: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-lab-test-code"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Category"
                          value={editingItem.data.category}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, category: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-lab-test-category"
                        />
                        <input
                          type="text"
                          placeholder="Unit (e.g., mg/dL)"
                          value={editingItem.data.unit}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, unit: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-lab-test-unit"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Reference Range"
                        value={editingItem.data.referenceRange}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, referenceRange: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-lab-test-reference"
                      />
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingItem.data.isActive}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, isActive: e.target.checked ? 1 : 0}})}
                          className="w-4 h-4"
                          data-testid="checkbox-edit-lab-test-active"
                        />
                        <span>Active</span>
                      </label>
                    </>
                  )}

                  {editingItem.type === 'imaging' && (
                    <>
                      <select
                        value={editingItem.data.patientId || ''}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="select-edit-imaging-patient"
                      >
                        <option value="">Select Patient</option>
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>{patient.name}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <select
                          value={editingItem.data.studyType}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, studyType: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-edit-imaging-study-type"
                        >
                          <option value="">Select Study Type</option>
                          <option value="xray">X-Ray</option>
                          <option value="ct">CT Scan</option>
                          <option value="mri">MRI</option>
                          <option value="ultrasound">Ultrasound</option>
                          <option value="mammography">Mammography</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Body Part"
                          value={editingItem.data.bodyPart}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, bodyPart: e.target.value}})}
                          className="w-full p-3 border rounded-lg"
                          data-testid="input-edit-imaging-body-part"
                        />
                      </div>
                      <textarea
                        placeholder="Study Description"
                        value={editingItem.data.studyDescription}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, studyDescription: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        rows={3}
                        data-testid="textarea-edit-imaging-description"
                      />
                      <input
                        type="date"
                        placeholder="Study Date"
                        value={editingItem.data.studyDate}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, studyDate: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-imaging-study-date"
                      />
                      
                      {/* Image Upload Section */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <div className="text-center">
                          <i className="fas fa-image text-gray-400 text-3xl mb-3"></i>
                          <h4 className="text-lg font-medium text-gray-700 mb-2">Upload Medical Image</h4>
                          <p className="text-sm text-gray-500 mb-4">Upload X-rays, CT scans, MRI images, or other medical imaging files</p>
                          
                          <input
                            type="file"
                            accept="image/*,.dcm,.dicom"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Create object URL for preview
                                const imageUrl = URL.createObjectURL(file);
                                setEditingItem({...editingItem, data: {...editingItem.data, imageUrl, imageFile: file}});
                              }
                            }}
                            className="hidden"
                            id="imaging-file-upload"
                            data-testid="input-edit-imaging-file"
                          />
                          <label
                            htmlFor="imaging-file-upload"
                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                          >
                            <i className="fas fa-upload mr-2"></i>Choose Image File
                          </label>
                          
                          {editingItem.data.imageUrl && (
                            <div className="mt-4">
                              <img
                                src={editingItem.data.imageUrl}
                                alt="Medical imaging preview"
                                className="max-w-full h-48 object-contain mx-auto border rounded-lg"
                              />
                              <p className="text-sm text-gray-600 mt-2">
                                {editingItem.data.imageFile?.name || 'Current image'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <textarea
                        placeholder="Findings"
                        value={editingItem.data.findings}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, findings: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        rows={3}
                        data-testid="textarea-edit-imaging-findings"
                      />
                      <textarea
                        placeholder="Impression"
                        value={editingItem.data.impression}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, impression: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        rows={3}
                        data-testid="textarea-edit-imaging-impression"
                      />
                      <input
                        type="text"
                        placeholder="Reported By (Radiologist)"
                        value={editingItem.data.reportedBy}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, reportedBy: e.target.value}})}
                        className="w-full p-3 border rounded-lg"
                        data-testid="input-edit-imaging-reported-by"
                      />
                    </>
                  )}

                  {editingItem.type === 'intake-output' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Patient *</label>
                        <select
                          value={editingItem.data.patientId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-io-patient"
                        >
                          <option value="">Select Patient</option>
                          {patients.map(patient => (
                            <option key={patient.id} value={patient.id}>{patient.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Type *</label>
                          <select
                            value={editingItem.data.type || 'intake'}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, type: e.target.value, category: ''}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            data-testid="select-edit-io-type"
                          >
                            <option value="intake">Intake</option>
                            <option value="output">Output</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Amount (mL)</label>
                          <input
                            type="number"
                            value={editingItem.data.amount || ''}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, amount: e.target.value}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            data-testid="input-edit-io-amount"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Category *</label>
                        <select
                          value={editingItem.data.category || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, category: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-io-category"
                        >
                          <option value="">Select category...</option>
                          {editingItem.data.type === 'intake' ? (
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
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Description</label>
                        <textarea
                          value={editingItem.data.description || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, description: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                          placeholder="Additional details..."
                          data-testid="textarea-edit-io-description"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date & Time Recorded *</label>
                        <input
                          type="datetime-local"
                          value={editingItem.data.recordedAt ? editingItem.data.recordedAt.replace(' ', 'T').slice(0, 16) : ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, recordedAt: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="input-edit-io-datetime"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Recorded By</label>
                        <input
                          type="text"
                          value={editingItem.data.recordedBy || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, recordedBy: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          placeholder="Your name/username"
                          data-testid="input-edit-io-recorded-by"
                        />
                      </div>
                    </>
                  )}

                  {editingItem.type === 'assessment' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Patient *</label>
                        <select
                          value={editingItem.data.patientId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, patientId: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-assessment-patient"
                        >
                          <option value="">Select Patient</option>
                          {patients.map(patient => (
                            <option key={patient.id} value={patient.id}>{patient.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Assessment Type *</label>
                        <select
                          value={editingItem.data.assessmentType || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, assessmentType: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-assessment-type"
                        >
                          <option value="">Select assessment type...</option>
                          <option value="pain_scale">Pain Scale (0-10)</option>
                          <option value="neurological">Neurological Check</option>
                          <option value="fall_risk">Fall Risk Assessment</option>
                          <option value="mental_status">Mental Status</option>
                          <option value="skin_integrity">Skin Integrity</option>
                          <option value="mobility">Mobility Assessment</option>
                          <option value="cervical_dilation">Cervical Dilation</option>
                          <option value="fetal_heart_rate">Fetal Heart Rate</option>
                          <option value="maternal_vitals">Maternal Vitals</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Score (if applicable)</label>
                        <input
                          type="number"
                          value={editingItem.data.score || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, score: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          placeholder="e.g., Pain scale 0-10"
                          data-testid="input-edit-assessment-score"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Description</label>
                        <textarea
                          value={editingItem.data.description || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, description: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                          placeholder="Assessment description..."
                          data-testid="textarea-edit-assessment-description"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Findings</label>
                        <textarea
                          value={editingItem.data.findings || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, findings: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-20 resize-none"
                          placeholder="Clinical findings and observations..."
                          data-testid="textarea-edit-assessment-findings"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date & Time Assessed *</label>
                        <input
                          type="datetime-local"
                          value={editingItem.data.assessedAt ? editingItem.data.assessedAt.replace(' ', 'T').slice(0, 16) : ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, assessedAt: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="input-edit-assessment-datetime"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Assessed By</label>
                        <input
                          type="text"
                          value={editingItem.data.assessedBy || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, assessedBy: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          placeholder="Your name/username"
                          data-testid="input-edit-assessment-assessed-by"
                        />
                      </div>
                    </>
                  )}

                  {editingItem.type === 'medication-link' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Trigger Medicine *</label>
                        <select
                          value={editingItem.data.triggerMedicineId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, triggerMedicineId: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-medication-link-trigger"
                        >
                          <option value="">Select trigger medicine...</option>
                          {medicines.map(medicine => (
                            <option key={medicine.id} value={medicine.id}>
                              {medicine.name} (ID: {medicine.id}) - {medicine.dose} {medicine.unit}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-medical-text-muted mt-1">
                          Medicine that triggers the follow-up protocol when administered
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Follow-up Medicine *</label>
                        <select
                          value={editingItem.data.followMedicineId || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, followMedicineId: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-medication-link-follow"
                        >
                          <option value="">Select follow-up medicine...</option>
                          {medicines.map(medicine => (
                            <option key={medicine.id} value={medicine.id}>
                              {medicine.name} (ID: {medicine.id}) - {medicine.dose} {medicine.unit}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-medical-text-muted mt-1">
                          Medicine that will be prescribed as follow-up
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Delay (minutes) *</label>
                          <input
                            type="number"
                            min="0"
                            value={editingItem.data.delayMinutes || ''}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, delayMinutes: parseInt(e.target.value) || 0}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="0"
                            data-testid="input-edit-medication-link-delay"
                          />
                          <div className="text-xs text-medical-text-muted mt-1">
                            Time to wait after trigger administration
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Duration (hours) *</label>
                          <input
                            type="number"
                            min="1"
                            value={editingItem.data.followDurationHours || ''}
                            onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, followDurationHours: parseInt(e.target.value) || 24}})}
                            className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                            placeholder="24"
                            data-testid="input-edit-medication-link-duration"
                          />
                          <div className="text-xs text-medical-text-muted mt-1">
                            How long the follow-up protocol lasts
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Follow-up Frequency *</label>
                        <select
                          value={editingItem.data.followFrequency || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, followFrequency: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          data-testid="select-edit-medication-link-frequency"
                        >
                          <option value="">Select frequency...</option>
                          <option value="once">Once only</option>
                          <option value="every 15 minutes">Every 15 minutes</option>
                          <option value="every 30 minutes">Every 30 minutes</option>
                          <option value="every hour">Every hour</option>
                          <option value="every 2 hours">Every 2 hours</option>
                          <option value="every 4 hours">Every 4 hours</option>
                          <option value="every 6 hours">Every 6 hours</option>
                          <option value="every 8 hours">Every 8 hours</option>
                          <option value="every 12 hours">Every 12 hours</option>
                          <option value="daily">Daily</option>
                        </select>
                        <div className="text-xs text-medical-text-muted mt-1">
                          How often the follow-up medicine should be administered
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-medical-text-secondary mb-2">Default Dose Override (optional)</label>
                        <input
                          type="text"
                          value={editingItem.data.defaultDoseOverride || ''}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, defaultDoseOverride: e.target.value}})}
                          className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                          placeholder="e.g., 2.5 MU, 50mg, etc."
                          data-testid="input-edit-medication-link-dose-override"
                        />
                        <div className="text-xs text-medical-text-muted mt-1">
                          Override the default dose for follow-up medicine (leave blank to use medicine's default dose)
                        </div>
                      </div>

                      {/* Protocol Example */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <i className="fas fa-lightbulb text-blue-600 mt-0.5 mr-3"></i>
                          <div className="text-sm text-blue-800">
                            <div className="font-medium mb-1">Protocol Example</div>
                            <div>When trigger medicine is administered → wait {editingItem.data.delayMinutes || 0} minutes → start follow-up medicine {editingItem.data.followFrequency || '[frequency]'} for {editingItem.data.followDurationHours || 24} hours</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      console.log('FORM SUBMIT: Starting form submission for type:', editingItem.type);
                      console.log('FORM SUBMIT: Form data:', editingItem.data);
                      
                      // Map entity types to API endpoints
                      const endpointMap = {
                        'user': 'users',
                        'patient': 'patients', 
                        'medicine': 'medicines',
                        'prescription': 'prescriptions',
                        'vital': 'vitals',
                        'result': 'lab-results',
                        'care-note': 'care-notes',
                        'administration': 'administrations',
                        'lab-test': 'lab-test-types',
                        'imaging': 'imaging-results',
                        'intake-output': 'intake-output',
                        'assessment': 'assessments',
                        'medication-link': 'medication-links'
                      };
                      
                      const endpointBase = endpointMap[editingItem.type as keyof typeof endpointMap] || `${editingItem.type}s`;
                      console.log('FORM SUBMIT: Using endpoint base:', endpointBase);
                      
                      // Handle image upload for imaging entries
                      if (editingItem.type === 'imaging' && editingItem.data.imageFile) {
                        console.log('FORM SUBMIT: Image file found, will be handled by multer middleware');
                        // Don't delete the imageFile - we need it for the server upload
                      }
                      
                      // Special handling for patient-specific endpoints
                      let endpoint;
                      if (editingItem.type === 'prescription' && editingItem.data.id) {
                        // For prescription updates, use the patient-specific endpoint
                        endpoint = `/api/patients/${editingItem.data.patientId}/prescriptions/${editingItem.data.id}`;
                      } else if (editingItem.type === 'intake-output' && !editingItem.data.id) {
                        // For new intake/output records, use patient-specific endpoint
                        endpoint = `/api/patients/${editingItem.data.patientId}/intake-output`;
                      } else if (editingItem.type === 'assessment' && !editingItem.data.id) {
                        // For new assessment records, use patient-specific endpoint
                        endpoint = `/api/patients/${editingItem.data.patientId}/assessments`;
                      } else {
                        endpoint = editingItem.data.id 
                          ? `/api/admin/${endpointBase}/${editingItem.data.id}`
                          : `/api/admin/${endpointBase}`;
                      }
                      
                      console.log('FORM SUBMIT: Final endpoint:', endpoint);
                      console.log('FORM SUBMIT: Is update?', !!editingItem.data.id);
                      
                      if (editingItem.data.id) {
                        console.log('FORM SUBMIT: Calling handleUpdate');
                        // For prescription updates, use PATCH method for patient-specific endpoint
                        if (editingItem.type === 'prescription') {
                          updatePrescriptionSpecial(endpoint, editingItem.data);
                        } else if (editingItem.type === 'patient') {
                          // For patient updates, use the working PATCH route with only editable fields
                          const patientEndpoint = `/api/patients/${editingItem.data.id}`;
                          const editableFields = {
                            name: editingItem.data.name,
                            dob: editingItem.data.dob,
                            age: Number(editingItem.data.age) || 0,
                            doseWeight: editingItem.data.doseWeight,
                            sex: editingItem.data.sex,
                            mrn: editingItem.data.mrn,
                            fin: editingItem.data.fin,
                            admitted: editingItem.data.admitted,
                            isolation: editingItem.data.isolation,
                            bed: editingItem.data.bed,
                            allergies: editingItem.data.allergies,
                            status: editingItem.data.status,
                            provider: editingItem.data.provider,
                            notes: editingItem.data.notes,
                            department: editingItem.data.department,
                            chartData: editingItem.data.chartData
                          };
                          console.log('FORM SUBMIT: Using PATCH for patient with editable fields:', editableFields);
                          updatePatientSpecial(patientEndpoint, editableFields);
                        } else {
                          handleUpdate(endpoint, editingItem.data);
                        }
                      } else {
                        console.log('FORM SUBMIT: Calling handleCreate');
                        handleCreate(endpoint, editingItem.data);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90"
                    data-testid="button-save-edit"
                  >
                    {editingItem.data.id ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-4">Confirm Deletion</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this {showDeleteConfirm.type.slice(0, -1)}? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm.type, showDeleteConfirm.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}