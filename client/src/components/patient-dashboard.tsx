import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Patient } from "@shared/schema";

interface PatientDashboardProps {
  onPatientSelect: (patient: Patient) => void;
}

type DepartmentFilter = 'All' | 'Labor & Delivery' | 'Newborn' | 'Postpartum';

export function PatientDashboard({ onPatientSelect }: PatientDashboardProps) {
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('All');

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  const filteredPatients = (departmentFilter === 'All' 
    ? patients 
    : patients.filter(patient => patient.department === departmentFilter))
    .sort((a, b) => {
      // Extract last name (assume last word is last name)
      const aLastName = a.name.split(' ').pop()?.toLowerCase() || '';
      const bLastName = b.name.split(' ').pop()?.toLowerCase() || '';
      
      // Sort by last name first
      if (aLastName !== bLastName) {
        return aLastName.localeCompare(bLastName);
      }
      
      // If last names are the same, sort by age
      return a.age - b.age;
    });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'triage': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'observation': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active labor': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ldr (labor, delivery, recovery)': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivery imminent': return 'bg-red-100 text-red-800 border-red-200';
      case 'pushing / second stage': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'in or / c-section': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pacu (post-anesthesia care unit)': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'postpartum recovery': return 'bg-green-100 text-green-800 border-green-200';
      case 'postpartum / couplet care': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'discharge pending': return 'bg-slate-100 text-slate-800 border-slate-200';
      // Legacy status fallbacks
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': 
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'improving':
      case 'recovering': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const hasAllergies = (allergies: string) => {
    const lowerAllergies = allergies?.toLowerCase() || '';
    return allergies && 
           lowerAllergies !== 'none' && 
           lowerAllergies !== 'nka' &&
           !lowerAllergies.includes('no known allergies');
  };

  const getDepartmentStats = () => {
    const stats = patients.reduce((acc, patient) => {
      acc[patient.department] = (acc[patient.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: patients.length,
      'Labor & Delivery': stats['Labor & Delivery'] || 0,
      'Newborn': stats['Newborn'] || 0,
      'Postpartum': (stats['Postpartum'] || 0) + (stats['Postpartum Recovery'] || 0),
    };
  };

  const stats = getDepartmentStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Department Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-medical-border text-center">
          <p className="text-2xl font-bold text-medical-text-primary">{stats.total}</p>
          <p className="text-sm text-medical-text-muted">Total Patients</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
          <p className="text-2xl font-bold text-purple-700">{stats['Labor & Delivery']}</p>
          <p className="text-sm text-purple-600">Labor & Delivery</p>
        </div>
        <div className="bg-pink-50 p-4 rounded-lg border border-pink-200 text-center">
          <p className="text-2xl font-bold text-pink-700">{stats['Postpartum']}</p>
          <p className="text-sm text-pink-600">Postpartum</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats['Newborn']}</p>
          <p className="text-sm text-blue-600">Newborn</p>
        </div>
      </div>

      {/* Department Filter */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-medical border border-medical-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-medical-text-primary">
            <i className="fas fa-users text-medical-primary mr-2"></i>Patient Dashboard
          </h3>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Labor & Delivery', 'Newborn', 'Postpartum'] as DepartmentFilter[]).map((dept) => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  departmentFilter === dept
                    ? 'bg-medical-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid={`filter-${dept.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="sm:hidden">{dept.split(' ')[0]}</span>
                <span className="hidden sm:inline">{dept}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Patient Table */}
        <div className="overflow-x-auto sm:overflow-x-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-medical-border">
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Name</th>
                <th className="text-center py-2 sm:py-3 px-1 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden sm:table-cell">Bed</th>
                <th className="text-center py-2 sm:py-3 px-1 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden sm:table-cell">Age</th>
                <th className="text-center py-2 sm:py-3 px-1 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden sm:table-cell">Allergies</th>
                <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden sm:table-cell">Status</th>
                <th className="text-center py-2 sm:py-3 px-1 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden md:table-cell">Provider</th>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden lg:table-cell">Notes</th>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-medical-text-muted">
                    {departmentFilter === 'All' ? 'No patients found' : `No patients in ${departmentFilter}`}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr 
                    key={patient.id} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    data-testid={`patient-row-${patient.id}`}
                  >
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-medical-primary to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                          {patient.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-medical-text-primary leading-tight break-words text-xs sm:text-sm" data-testid={`name-${patient.id}`}>
                            {patient.name}
                          </p>
                          <p className="text-xs text-medical-text-muted mt-0.5 sm:mt-1">{patient.department}</p>
                          <div className="sm:hidden mt-1 space-y-1">
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="font-mono text-medical-text-primary font-medium" data-testid={`bed-mobile-${patient.id}`}>
                                Bed: {patient.bed}
                              </span>
                              <span className="text-medical-text-primary" data-testid={`age-mobile-${patient.id}`}>
                                Age: {patient.age}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-1 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`} data-testid={`status-mobile-${patient.id}`}>
                                {patient.status.length > 12 ? patient.status.substring(0, 12) + '...' : patient.status}
                              </span>
                              {hasAllergies(patient.allergies) && (
                                <div className="flex items-center space-x-1">
                                  <i className="fas fa-exclamation-triangle text-red-500 text-xs" title="Has allergies"></i>
                                  <span className="text-red-600 font-medium text-xs">Allergies</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center hidden sm:table-cell">
                      <span className="font-mono text-medical-text-primary font-medium text-xs sm:text-sm" data-testid={`bed-${patient.id}`}>
                        {patient.bed}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center hidden sm:table-cell">
                      <span className="text-medical-text-primary text-xs sm:text-sm" data-testid={`age-${patient.id}`}>
                        {patient.age}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                        {hasAllergies(patient.allergies) && (
                          <i className="fas fa-exclamation-triangle text-red-500 text-xs sm:text-sm" title="Has allergies" data-testid={`allergy-alert-${patient.id}`}></i>
                        )}
                        <span className={`text-xs sm:text-sm ${hasAllergies(patient.allergies) ? 'text-red-600 font-medium' : 'text-gray-500'}`} data-testid={`allergies-${patient.id}`}>
                          {patient.allergies.length > 8 ? patient.allergies.substring(0, 8) + '...' : patient.allergies}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center hidden sm:table-cell">
                      <span className={`inline-flex px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium border break-words text-center ${getStatusColor(patient.status)}`} data-testid={`status-${patient.id}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center hidden md:table-cell">
                      <span className="text-medical-text-primary text-xs sm:text-sm" data-testid={`provider-${patient.id}`}>
                        {patient.provider.length > 10 ? patient.provider.substring(0, 10) + '...' : patient.provider}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 hidden lg:table-cell">
                      <span 
                        className="text-medical-text-muted text-xs sm:text-sm block break-words leading-tight" 
                        title={patient.notes}
                        data-testid={`notes-${patient.id}`}
                      >
                        {patient.notes ? (patient.notes.length > 30 ? patient.notes.substring(0, 30) + '...' : patient.notes) : 'No notes'}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <button
                        onClick={() => onPatientSelect(patient)}
                        className="bg-medical-primary hover:bg-teal-800 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto"
                        data-testid={`view-patient-${patient.id}`}
                      >
                        <i className="fas fa-eye mr-1 sm:mr-1"></i><span className="hidden sm:inline">View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}