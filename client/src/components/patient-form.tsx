import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type InsertPatient } from "@shared/schema";

interface PatientFormProps {
  onPatientAdded: () => void;
}

const generateNewPatientId = () => {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

const generateMRN = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

const generateFIN = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

const calculateAgeFromDOB = (dob: string): number => {
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

export function PatientForm({ onPatientAdded }: PatientFormProps) {
  const [showWarning, setShowWarning] = useState(true);
  const [generatedId] = useState(() => generateNewPatientId());
  const [generatedMRN] = useState(() => generateMRN());
  const [generatedFIN] = useState(() => generateFIN());
  const [formData, setFormData] = useState<Omit<InsertPatient, 'id' | 'chartData'>>({
    name: '',
    dob: '',
    age: 0,
    doseWeight: '',
    sex: 'Female',
    mrn: generatedMRN,
    fin: generatedFIN,
    admitted: new Date().toISOString().split('T')[0], // Auto-fill today's date
    isolation: 'None',
    bed: 'LD-103', // Auto-fill bed for default L&D department
    allergies: 'None',
    status: 'Triage',
    provider: 'Dr. Sarah Mitchell',
    notes: '',
    department: 'Labor & Delivery'
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPatientMutation = useMutation({
    mutationFn: async (patient: InsertPatient) => {
      // Use the same endpoint as admin dashboard
      const response = await apiRequest('/api/admin/patients', 'POST', patient);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Patient registered successfully",
        description: `${data.name} has been added with ID: ${data.id}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      onPatientAdded();
    },
    onError: () => {
      toast({
        title: "Registration failed",
        description: "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Auto-fill bed based on department selection
    if (name === 'department') {
      let bedValue = formData.bed;
      if (value === 'Labor & Delivery') {
        bedValue = 'LD-103';
      } else if (value === 'Newborn') {
        bedValue = 'NB-201';
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        bed: bedValue
      }));
      return;
    }
    
    // Handle input validation for specific fields
    if (name === 'mrn' || name === 'fin') {
      // Only allow digits and limit to 8 digits
      const digitsOnly = value.replace(/\D/g, '').slice(0, 8);
      setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      return;
    }
    
    if (name === 'id' || name === 'patientId') {
      // Only allow digits and limit to 12 digits for patient barcode field
      const digitsOnly = value.replace(/\D/g, '').slice(0, 12);
      setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      return;
    }
    
    setFormData(prev => {
      const newData = { 
        ...prev, 
        [name]: name === 'age' ? parseInt(value, 10) || 0 : value 
      };
      
      // Auto-calculate age when DOB changes
      if (name === 'dob' && value) {
        newData.age = calculateAgeFromDOB(value);
      }
      
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate fresh ID on each submit like admin dashboard
    const patient: InsertPatient = {
      ...formData,
      id: generateNewPatientId(), // Generate fresh ID each time
      chartData: JSON.stringify({
        background: '',
        summary: '',
        discharge: '',
        handoff: ''
      })
    };
    createPatientMutation.mutate(patient);
  };

  return (
    <>
      {/* PII Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-orange-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-medical-text-primary mb-2">Training Environment Warning</h3>
              <div className="text-left space-y-3 text-sm text-medical-text-secondary">
                <p className="font-semibold text-orange-600">⚠️ DO NOT ENTER REAL PATIENT INFORMATION</p>
                <p>This is a training application. For educational purposes only:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Use fictional names and data only</li>
                  <li>Do not enter real patient information</li>
                  <li>Do not enter real personal identifiable information (PII)</li>
                  <li>Data entered may not be secure or private</li>
                </ul>
                <p className="font-medium text-medical-text-primary">Examples of safe test data:</p>
                <ul className="list-disc ml-5 space-y-1 text-xs">
                  <li>Names: "John Doe", "Jane Smith", "Test Patient"</li>
                  <li>Use fictional dates and information</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setShowWarning(false)}
              className="w-full px-4 py-3 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 font-medium transition-colors"
              data-testid="button-understand-warning"
            >
              <i className="fas fa-check mr-2"></i>I Understand - Continue to Form
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-medical-text-primary mb-2">Register New Patient</h3>
        <p className="text-medical-text-muted">Enter complete patient information for medical record creation</p>
      </div>

      {/* Generated Patient ID Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm font-medium text-medical-text-secondary mb-1">Generated Patient ID (Barcode)</p>
        <p className="text-2xl font-mono font-bold text-medical-primary" data-testid="text-generated-id">{generatedId}</p>
        <p className="text-xs text-medical-text-muted mt-1">This ID will be printed on the patient wristband</p>
      </div>

      {/* Patient Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-medical-text-primary border-b border-medical-border pb-2">Personal Information</h4>
          
          <div>
            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Full Name *</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              required 
              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent" 
              placeholder="Enter patient's full name"
              data-testid="input-patient-name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Date of Birth *</label>
              <input 
                type="date" 
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required 
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                data-testid="input-patient-dob"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Age *</label>
              <input 
                type="number" 
                name="age"
                value={formData.age}
                onChange={handleChange}
                required 
                min="0"
                max="120"
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-gray-50" 
                placeholder="Auto-calculated from DOB"
                data-testid="input-patient-age"
                readOnly
              />
              <p className="text-xs text-medical-text-muted mt-1">Automatically calculated from date of birth</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Sex *</label>
              <select 
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                required 
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
                data-testid="select-patient-sex"
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
                name="doseWeight"
                value={formData.doseWeight}
                onChange={handleChange}
                required 
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent" 
                placeholder="e.g., 70 kg"
                data-testid="input-patient-weight"
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-medical-text-primary border-b border-medical-border pb-2">Medical Information</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">MRN * (8 digits)</label>
              <input 
                type="text" 
                name="mrn"
                value={formData.mrn}
                onChange={handleChange}
                required 
                maxLength={8}
                pattern="[0-9]{8}"
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent font-mono" 
                placeholder="12345678"
                data-testid="input-patient-mrn"
              />
              <p className="text-xs text-medical-text-muted mt-1">Auto-generated 8-digit medical record number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">FIN * (8 digits)</label>
              <input 
                type="text" 
                name="fin"
                value={formData.fin}
                onChange={handleChange}
                required 
                maxLength={8}
                pattern="[0-9]{8}"
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent font-mono" 
                placeholder="87654321"
                data-testid="input-patient-fin"
              />
              <p className="text-xs text-medical-text-muted mt-1">Auto-generated 8-digit financial number</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Admission Date *</label>
            <input 
              type="date" 
              name="admitted"
              value={formData.admitted}
              onChange={handleChange}
              required 
              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent"
              data-testid="input-patient-admitted"
            />
            <p className="text-xs text-medical-text-muted mt-1">Auto-filled with today's date</p>
          </div>
          
          
          <div>
            <label className="block text-sm font-medium text-medical-text-secondary mb-2">Isolation Precautions</label>
            <select 
              name="isolation"
              value={formData.isolation}
              onChange={handleChange}
              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
              data-testid="select-patient-isolation"
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
              name="department"
              value={formData.department}
              onChange={handleChange}
              required 
              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
              data-testid="select-patient-department"
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
                name="bed"
                value={formData.bed}
                onChange={handleChange}
                required 
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent" 
                placeholder="e.g., LD-102"
                data-testid="input-patient-bed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-text-secondary mb-2">Status *</label>
              <select 
                name="status"
                value={formData.status}
                onChange={handleChange}
                required 
                className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white"
                data-testid="select-patient-status"
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
              name="provider"
              value={formData.provider}
              onChange={handleChange}
              required 
              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent bg-white" 
              data-testid="select-patient-provider"
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
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent" 
              placeholder="e.g., Penicillin, None"
              data-testid="input-patient-allergies"
            />
          </div>
        </div>
      </div>
      
      {/* Additional Notes */}
      <div className="space-y-4">
        <h4 className="font-semibold text-medical-text-primary border-b border-medical-border pb-2">Clinical Notes</h4>
        <div>
          <label className="block text-sm font-medium text-medical-text-secondary mb-2">Notes</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent resize-none" 
            placeholder="Clinical notes, care instructions, or observations..."
            data-testid="textarea-patient-notes"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-center space-x-4 pt-6 border-t border-medical-border">
        <button 
          type="button" 
          onClick={onPatientAdded}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
          data-testid="button-cancel-registration"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={createPatientMutation.isPending}
          className="px-6 py-3 bg-medical-primary hover:bg-teal-800 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
          data-testid="button-save-patient"
        >
          <i className="fas fa-save mr-2"></i>
          {createPatientMutation.isPending ? 'Saving...' : 'Save Patient'}
        </button>
      </div>
    </form>
    </>
  );
}
