import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Patient, type LabResult } from "@shared/schema";
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface LabResultsProps {
  patient: Patient;
}

export function LabResults({ patient }: LabResultsProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [resultType, setResultType] = useState<'lab' | 'imaging'>('lab');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLabResult, setSelectedLabResult] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const canDelete = user?.role === 'instructor' || user?.role === 'admin';
  
  const { data: labResults = [], isLoading } = useQuery<LabResult[]>({
    queryKey: ['/api/patients', patient.id, 'lab-results'],
  });

  const { data: imagingResults = [], isLoading: imagingLoading } = useQuery<any[]>({
    queryKey: ['/api/patients', patient.id, 'imaging-results'],
    enabled: resultType === 'imaging',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  // Delete lab result mutation
  const deleteLabResultMutation = useMutation({
    mutationFn: async ({ labResultId, pin }: { labResultId: string; pin: string }) => {
      return await apiRequest(`/api/lab-results/${labResultId}`, 'DELETE', { pin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'lab-results'] });
      setShowDeleteModal(false);
      setSelectedLabResult(null);
      setPin('');
      setError('');
    },
    onError: (error: any) => {
      if (error.message.includes('401')) {
        setError('Invalid PIN code');
      } else if (error.message.includes('403')) {
        setError('Access denied. Instructor or admin role required.');
      } else {
        setError('Failed to delete lab result');
      }
    },
  });

  const handleDeleteClick = (labResult: any) => {
    setSelectedLabResult(labResult);
    setShowDeleteModal(true);
    setPin('');
    setError('');
  };

  const handleDeleteConfirm = () => {
    if (selectedLabResult) {
      deleteLabResultMutation.mutate({ labResultId: selectedLabResult.id, pin });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return 'fas fa-exclamation-triangle';
      case 'high':
        return 'fas fa-arrow-up';
      case 'low':
        return 'fas fa-arrow-down';
      default:
        return 'fas fa-check-circle';
    }
  };

  const handlePrintLabResults = () => {
    const printContent = labResults.map(result => `
      Test: ${result.testName}
      Value: ${result.value} ${result.unit}
      Reference Range: ${result.referenceRange || 'N/A'}
      Status: ${result.status}
      Collected: ${result.takenAt ? new Date(result.takenAt).toLocaleString() : 'Not specified'}
      Notes: ${result.notes || 'None'}
      ---
    `).join('');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lab Results - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2 { color: #1f2937; }
              .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
              .result { margin-bottom: 20px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Laboratory Results</h1>
              <h2>Patient: ${patient.name}</h2>
              <p>Medical Record Number: ${patient.id}</p>
              <p>Date of Birth: ${patient.dob || 'Not specified'}</p>
              <p>Printed: ${new Date().toLocaleString()}</p>
            </div>
            <pre>${printContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading || imagingLoading) {
    return (
      <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <i className="fas fa-spinner fa-spin text-medical-primary"></i>
          <span className="text-medical-text-primary">Loading {resultType} results...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-medical-text-primary">
          <i className="fas fa-vial text-medical-primary mr-2"></i>Patient Results
        </h3>
        <div className="flex items-center space-x-4">
          {/* Result Type Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setResultType('lab')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                resultType === 'lab' 
                  ? 'bg-white text-medical-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="button-lab-results"
            >
              <i className="fas fa-flask mr-1"></i>Lab Results
            </button>
            <button
              onClick={() => setResultType('imaging')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                resultType === 'imaging' 
                  ? 'bg-white text-medical-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="button-imaging-results"
            >
              <i className="fas fa-image mr-1"></i>Imaging
            </button>
          </div>
          
          <div className="text-sm text-medical-text-muted">
            {resultType === 'lab' 
              ? `${labResults.length} result${labResults.length !== 1 ? 's' : ''}` 
              : `${imagingResults.length} result${imagingResults.length !== 1 ? 's' : ''}`
            }
          </div>
          
          {((resultType === 'lab' && labResults.length > 0) || (resultType === 'imaging' && imagingResults.length > 0)) && (
            <button
              onClick={handlePrintLabResults}
              className="px-3 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors"
              data-testid="button-print-results"
            >
              <i className="fas fa-print mr-2"></i>Print {resultType === 'lab' ? 'Lab Results' : 'Imaging Results'}
            </button>
          )}
          
          {/* View Mode Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white text-medical-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="button-cards-view"
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
              data-testid="button-table-view"
            >
              <i className="fas fa-table mr-1"></i>Table
            </button>
          </div>
        </div>
      </div>

      {/* Content based on selected result type */}
      {resultType === 'lab' ? (
        labResults.length === 0 ? (
          <div className="text-center py-12 text-medical-text-muted">
            <i className="fas fa-vial text-6xl mb-4 opacity-20"></i>
            <p className="text-lg font-medium mb-2">No Lab Results</p>
            <p className="text-sm">No laboratory test results available for this patient.</p>
          </div>
        ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {labResults
            .sort((a, b) => {
              const aDate = a.takenAt ? new Date(a.takenAt).getTime() : 0;
              const bDate = b.takenAt ? new Date(b.takenAt).getTime() : 0;
              return bDate - aDate;
            })
            .map((result) => (
              <div 
                key={result.id} 
                className="border border-medical-border rounded-lg p-4 hover:shadow-sm transition-shadow relative"
                data-testid={`lab-result-${result.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-20">
                    <div className="mb-2">
                      <h4 className="font-medium text-medical-text-primary" data-testid={`test-name-${result.id}`}>
                        {result.testName}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-medical-text-secondary">Value:</span>
                        <span className="ml-2 text-medical-text-primary" data-testid={`test-value-${result.id}`}>
                          {result.value} {result.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-medical-text-secondary">Reference:</span>
                        <span className="ml-2 text-medical-text-primary" data-testid={`test-reference-${result.id}`}>
                          {result.referenceRange || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-medical-text-secondary">Collected:</span>
                        <span className="ml-2 text-medical-text-primary" data-testid={`test-collected-${result.id}`}>
                          {result.takenAt 
                            ? `${new Date(result.takenAt).toLocaleDateString()} at ${new Date(result.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Not specified'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                      <i className={`${getStatusIcon(result.status)} mr-1`}></i>
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteClick(result)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        data-testid={`delete-lab-result-${result.id}`}
                        title="Delete lab result"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="lab-results-table">
            <thead>
              <tr className="border-b-2 border-medical-border">
                <th className="text-left p-3 font-semibold text-medical-text-primary">Test Name</th>
                <th className="text-left p-3 font-semibold text-medical-text-primary">Code</th>
                <th className="text-left p-3 font-semibold text-medical-text-primary">Value</th>
                <th className="text-left p-3 font-semibold text-medical-text-primary">Reference Range</th>
                <th className="text-left p-3 font-semibold text-medical-text-primary">Status</th>
                <th className="text-left p-3 font-semibold text-medical-text-primary">Collected</th>
                <th className="text-left p-3 font-semibold text-medical-text-primary">Notes</th>
                {canDelete && <th className="text-left p-3 font-semibold text-medical-text-primary">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {labResults
                .sort((a, b) => {
                  const aDate = a.takenAt ? new Date(a.takenAt).getTime() : 0;
                  const bDate = b.takenAt ? new Date(b.takenAt).getTime() : 0;
                  return bDate - aDate;
                })
                .map((result) => (
                  <tr 
                    key={result.id} 
                    className="border-b border-medical-border hover:bg-slate-50 transition-colors"
                    data-testid={`table-row-${result.id}`}
                  >
                    <td className="p-3">
                      <div className="font-medium text-medical-text-primary">
                        {result.testName}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-medical-text-muted">
                      {result.testCode || '-'}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-medical-text-primary">
                        {result.value} {result.unit}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-medical-text-muted">
                      {result.referenceRange || 'N/A'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                        <i className={`${getStatusIcon(result.status)} mr-1`}></i>
                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-medical-text-muted">
                      {result.takenAt 
                        ? new Date(result.takenAt).toLocaleDateString()
                        : 'Not specified'
                      }
                    </td>
                    <td className="p-3 text-sm text-medical-text-muted max-w-xs">
                      <div className="truncate" title={result.notes || ''}>
                        {result.notes || '-'}
                      </div>
                    </td>
                    {canDelete && (
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteClick(result)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          data-testid={`delete-table-lab-result-${result.id}`}
                          title="Delete lab result"
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Lab Result</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this lab result for <strong>{selectedLabResult?.testName}</strong>? 
              This action cannot be undone.
            </p>
            
            {user?.role === 'instructor' && (
              <div className="mb-4">
                <label htmlFor="deletePin" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter PIN to confirm deletion
                </label>
                <input
                  id="deletePin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter instructor PIN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={deleteLabResultMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={deleteLabResultMutation.isPending || (user?.role === 'instructor' && !pin)}
              >
                {deleteLabResultMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Imaging Results Section */
        imagingResults.length === 0 ? (
          <div className="text-center py-12 text-medical-text-muted">
            <i className="fas fa-image text-6xl mb-4 opacity-20"></i>
            <p className="text-lg font-medium mb-2">No Imaging Results</p>
            <p className="text-sm">No imaging studies available for this patient.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="space-y-4">
            {imagingResults.map((result: any) => (
              <div 
                key={result.id} 
                className="border border-medical-border rounded-lg p-4 hover:shadow-sm transition-shadow"
                data-testid={`imaging-result-${result.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2">
                      <h4 className="font-medium text-medical-text-primary text-lg">
                        <i className="fas fa-image mr-2 text-medical-primary"></i>
                        {result.studyType || 'Imaging Study'}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-medical-text-muted">
                        <span>
                          <i className="fas fa-calendar mr-1"></i>
                          {result.studyDate ? new Date(result.studyDate).toLocaleDateString() : 'Date not specified'}
                        </span>
                        <span>
                          <i className="fas fa-stethoscope mr-1"></i>
                          {result.orderingPhysician || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    
                    {result.bodyPart && (
                      <div className="text-sm text-medical-text-secondary mb-2">
                        <strong>Body Part:</strong> {result.bodyPart}
                      </div>
                    )}
                    
                    {result.findings && (
                      <div className="text-sm text-medical-text-secondary mb-2">
                        <strong>Findings:</strong> {result.findings}
                      </div>
                    )}
                    
                    {result.impression && (
                      <div className="text-sm text-medical-text-secondary">
                        <strong>Impression:</strong> {result.impression}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Imaging Table View */
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-medical-border">
                  <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Study Type</th>
                  <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Body Part</th>
                  <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Ordering Physician</th>
                  <th className="text-left py-3 px-4 font-medium text-medical-text-secondary">Findings</th>
                </tr>
              </thead>
              <tbody>
                {imagingResults.map((result: any) => (
                  <tr key={result.id} className="border-b border-medical-border hover:bg-gray-50" data-testid={`imaging-row-${result.id}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <i className="fas fa-image mr-2 text-medical-primary"></i>
                        {result.studyType || 'Imaging Study'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-medical-text-secondary">
                      {result.studyDate ? new Date(result.studyDate).toLocaleDateString() : 'Not specified'}
                    </td>
                    <td className="py-3 px-4 text-medical-text-secondary">
                      {result.bodyPart || 'Not specified'}
                    </td>
                    <td className="py-3 px-4 text-medical-text-secondary">
                      {result.orderingPhysician || 'Not specified'}
                    </td>
                    <td className="py-3 px-4 text-medical-text-secondary">
                      <div className="max-w-xs truncate" title={result.findings}>
                        {result.findings || 'No findings recorded'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}