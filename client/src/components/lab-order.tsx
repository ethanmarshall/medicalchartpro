import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { type Patient, type LabTestType } from "@shared/schema";

interface LabOrderProps {
  onOrderComplete: () => void;
}

export function LabOrder({ onOrderComplete }: LabOrderProps) {
  const [testType, setTestType] = useState<'lab' | 'imaging'>('lab');
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedImagingTests, setSelectedImagingTests] = useState<string[]>([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: patients = [], isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  const { data: availableTests = [], isLoading: testsLoading } = useQuery<LabTestType[]>({
    queryKey: ['/api/lab-test-types'],
  });

  // Define common imaging test types
  const imagingTestTypes = [
    { code: 'CHEST_XRAY', name: 'Chest X-Ray', category: 'X-Ray', bodyPart: 'Chest' },
    { code: 'ABDO_XRAY', name: 'Abdominal X-Ray', category: 'X-Ray', bodyPart: 'Abdomen' },
    { code: 'HEAD_CT', name: 'Head CT Scan', category: 'CT', bodyPart: 'Head' },
    { code: 'CHEST_CT', name: 'Chest CT Scan', category: 'CT', bodyPart: 'Chest' },
    { code: 'BRAIN_MRI', name: 'Brain MRI', category: 'MRI', bodyPart: 'Brain' },
    { code: 'SPINE_MRI', name: 'Spine MRI', category: 'MRI', bodyPart: 'Spine' },
    { code: 'ABDO_US', name: 'Abdominal Ultrasound', category: 'Ultrasound', bodyPart: 'Abdomen' },
    { code: 'CARDIAC_US', name: 'Cardiac Echo', category: 'Ultrasound', bodyPart: 'Heart' }
  ];

  const orderLabsMutation = useMutation({
    mutationFn: async (orderData: { patientId: string, tests: string[], orderDate: string }) => {
      const response = await apiRequest('/api/lab-orders', 'POST', orderData);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Lab Orders Submitted Successfully",
        description: `${data.resultsCreated} lab results generated for patient`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      resetForm();
      onOrderComplete();
    },
    onError: () => {
      toast({
        title: "Order Failed",
        description: "Failed to submit lab orders. Please try again.",
        variant: "destructive",
      });
    },
  });

  const orderImagingMutation = useMutation({
    mutationFn: async (orderData: { patientId: string, tests: string[], orderDate: string }) => {
      const response = await apiRequest('/api/imaging-orders', 'POST', orderData);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Imaging Orders Submitted Successfully",
        description: `${data.resultsCreated} imaging studies ordered for patient`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      resetForm();
      onOrderComplete();
    },
    onError: () => {
      toast({
        title: "Order Failed",
        description: "Failed to submit imaging orders. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPatient("");
    setSelectedTests([]);
    setSelectedImagingTests([]);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setShowPinModal(false);
    setPin("");
  };

  const handleTestToggle = (testCode: string) => {
    if (testType === 'lab') {
      setSelectedTests(prev => 
        prev.includes(testCode) 
          ? prev.filter(code => code !== testCode)
          : [...prev, testCode]
      );
    } else {
      setSelectedImagingTests(prev => 
        prev.includes(testCode) 
          ? prev.filter(code => code !== testCode)
          : [...prev, testCode]
      );
    }
  };

  const handleOrderSubmit = () => {
    setError("");
    
    if (!selectedPatient) {
      setError("Please select a patient");
      return;
    }
    
    const hasTests = testType === 'lab' 
      ? selectedTests.length > 0 
      : selectedImagingTests.length > 0;
    
    if (!hasTests) {
      setError(`Please select at least one ${testType === 'lab' ? 'lab test' : 'imaging study'}`);
      return;
    }
    
    // Admin users bypass PIN requirement entirely
    if (user?.role === 'admin') {
      if (testType === 'lab') {
        orderLabsMutation.mutate({
          patientId: selectedPatient,
          tests: selectedTests,
          orderDate: orderDate
        });
      } else {
        orderImagingMutation.mutate({
          patientId: selectedPatient,
          tests: selectedImagingTests,
          orderDate: orderDate
        });
      }
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = () => {
    // Admin users bypass PIN requirement, others use correct PIN
    const effectivePin = user?.role === 'admin' ? '0000' : pin;
    const expectedPin = user?.role === 'admin' ? '0000' : '1234';
    
    if (effectivePin === expectedPin) {
      if (testType === 'lab') {
        orderLabsMutation.mutate({
          patientId: selectedPatient,
          tests: selectedTests,
          orderDate: orderDate
        });
      } else {
        orderImagingMutation.mutate({
          patientId: selectedPatient,
          tests: selectedImagingTests,
          orderDate: orderDate
        });
      }
    } else {
      toast({
        title: "Invalid PIN",
        description: `Incorrect PIN. ${testType === 'lab' ? 'Lab' : 'Imaging'} order cancelled.`,
        variant: "destructive",
      });
      setPin("");
    }
  };

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <i className="fas fa-clipboard-list text-6xl text-medical-primary mb-4"></i>
          <h3 className="text-2xl font-bold text-medical-text-primary mb-2">Order Testing</h3>
          <p className="text-medical-text-muted">Order laboratory tests and imaging studies for patients</p>
        </div>

        {/* Test Type Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-medical-background rounded-lg p-1 inline-flex">
            <button
              onClick={() => setTestType('lab')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                testType === 'lab'
                  ? 'bg-medical-primary text-white'
                  : 'text-medical-text-muted hover:text-medical-text-primary'
              }`}
              data-testid="tab-lab-tests"
            >
              <i className="fas fa-vial mr-2"></i>Lab Tests
            </button>
            <button
              onClick={() => setTestType('imaging')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                testType === 'imaging'
                  ? 'bg-medical-primary text-white'
                  : 'text-medical-text-muted hover:text-medical-text-primary'
              }`}
              data-testid="tab-imaging-tests"
            >
              <i className="fas fa-x-ray mr-2"></i>Imaging Studies
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h4 className="font-semibold text-medical-text-primary mb-4">
              <i className="fas fa-user-injured mr-2"></i>Select Patient
            </h4>
            
            {patientsLoading ? (
              <div className="text-center py-4">
                <i className="fas fa-spinner fa-spin text-medical-primary"></i>
                <span className="ml-2">Loading patients...</span>
              </div>
            ) : (
              <select 
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                data-testid="select-patient"
              >
                <option value="">Choose a patient...</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} (ID: {patient.id})
                  </option>
                ))}
              </select>
            )}
            
            {selectedPatientData && (
              <div className="mt-3 p-3 bg-white rounded border border-medical-border">
                <p className="text-sm">
                  <strong>{selectedPatientData.name}</strong> - {selectedPatientData.age} years old, {selectedPatientData.sex} - {selectedPatientData.department}
                </p>
              </div>
            )}
          </div>

          {/* Order Date */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h4 className="font-semibold text-medical-text-primary mb-4">
              <i className="fas fa-calendar mr-2"></i>Order Date
            </h4>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
              data-testid="input-order-date"
            />
          </div>

          {/* Test Selection */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h4 className="font-semibold text-medical-text-primary mb-4">
              <i className={`fas ${testType === 'lab' ? 'fa-flask' : 'fa-x-ray'} mr-2`}></i>
              Select {testType === 'lab' ? 'Laboratory Tests' : 'Imaging Studies'} ({testType === 'lab' ? selectedTests.length : selectedImagingTests.length} selected)
            </h4>
            
            {testsLoading ? (
              <div className="text-center py-4">
                <i className="fas fa-spinner fa-spin text-medical-primary"></i>
                <span className="ml-2">Loading test types...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testType === 'lab' ? (
                  availableTests.map(test => (
                    <label 
                      key={test.code} 
                      className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTests.includes(test.code)
                          ? 'border-medical-primary bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`test-option-${test.code}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.code)}
                        onChange={() => handleTestToggle(test.code)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-medical-text-primary">{test.name}</div>
                        <div className="text-xs text-medical-text-muted mt-1">
                          Code: {test.code} | Reference: {test.referenceRange}
                        </div>
                      </div>
                    </label>
                  ))
                ) : (
                  imagingTestTypes.map(test => (
                    <label 
                      key={test.code} 
                      className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedImagingTests.includes(test.code)
                          ? 'border-medical-primary bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`imaging-option-${test.code}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImagingTests.includes(test.code)}
                        onChange={() => handleTestToggle(test.code)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-medical-text-primary">{test.name}</div>
                        <div className="text-xs text-medical-text-muted mt-1">
                          Category: {test.category} | Body Part: {test.bodyPart}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700" data-testid="error-message">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}

          {/* Order Button */}
          <div className="text-center">
            <button
              onClick={handleOrderSubmit}
              disabled={orderLabsMutation.isPending || orderImagingMutation.isPending}
              className="px-8 py-3 bg-medical-primary hover:bg-teal-800 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
              data-testid="button-order-tests"
            >
              <i className={`fas ${testType === 'lab' ? 'fa-vial' : 'fa-x-ray'} mr-2`}></i>
              {(orderLabsMutation.isPending || orderImagingMutation.isPending) 
                ? 'Processing Order...' 
                : `Order ${testType === 'lab' ? 'Laboratory Tests' : 'Imaging Studies'}`
              }
            </button>
          </div>
        </div>
      </div>

      {/* PIN Confirmation Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lock text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-medical-text-primary mb-2">
                Confirm {testType === 'lab' ? 'Lab' : 'Imaging'} Order
              </h3>
              <p className="text-medical-text-secondary mb-4">
                Ordering {testType === 'lab' ? selectedTests.length : selectedImagingTests.length} {testType === 'lab' ? 'test' : 'study'}{(testType === 'lab' ? selectedTests.length : selectedImagingTests.length) !== 1 ? 's' : ''} for {selectedPatientData?.name}
              </p>
              <p className="text-medical-text-muted mb-6">Enter PIN to confirm order</p>
              
              <div className="mb-6">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full p-4 text-center text-2xl font-mono border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  maxLength={4}
                  data-testid="input-order-pin"
                  onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {setShowPinModal(false); setPin("");}}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  data-testid="button-cancel-order-pin"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePinSubmit}
                  disabled={!pin || orderLabsMutation.isPending || orderImagingMutation.isPending}
                  className="flex-1 px-4 py-3 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-confirm-order"
                >
                  {(orderLabsMutation.isPending || orderImagingMutation.isPending) ? 'Ordering...' : 'Confirm Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}