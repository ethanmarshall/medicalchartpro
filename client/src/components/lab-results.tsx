import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Patient, type LabResult, type ImagingFiles } from "@shared/schema";
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
  const [selectedImagingResult, setSelectedImagingResult] = useState<ImagingFiles | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [uploadForm, setUploadForm] = useState({
    studyType: '',
    studyDate: '',
    bodyPart: '',
    orderingPhysician: '',
    findings: '',
    impression: '',
    imageFile: null as File | null
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [selectedExpandResult, setSelectedExpandResult] = useState<any>(null);
  const [showExpandImagingModal, setShowExpandImagingModal] = useState(false);
  const [selectedExpandImagingResult, setSelectedExpandImagingResult] = useState<ImagingFiles | null>(null);
  
  const { user } = useAuth();
  const canDelete = user?.role === 'instructor' || user?.role === 'admin';
  
  const { data: labResults = [], isLoading } = useQuery<LabResult[]>({
    queryKey: ['/api/patients', patient.id, 'lab-results'],
  });

  const { data: imagingResults = [], isLoading: imagingLoading } = useQuery<ImagingFiles[]>({
    queryKey: ['/api/patients', patient.id, 'imaging-results'],
    enabled: resultType === 'imaging',
  });

  // Ensure arrays are never undefined (defensive programming)
  const safeLabResults = Array.isArray(labResults) ? labResults : [];
  const safeImagingResults = Array.isArray(imagingResults) ? imagingResults : [];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'abnormal':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'normal':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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

  // Delete imaging result mutation
  const deleteImagingResultMutation = useMutation({
    mutationFn: async ({ imagingResultId, pin }: { imagingResultId: string; pin: string }) => {
      return await apiRequest(`/api/imaging-results/${imagingResultId}`, 'DELETE', { pin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'imaging-results'] });
      setShowDeleteModal(false);
      setSelectedImagingResult(null);
      setPin('');
      setError('');
    },
    onError: (error: any) => {
      if (error.message.includes('401')) {
        setError('Invalid PIN code');
      } else if (error.message.includes('403')) {
        setError('Access denied. Instructor or admin role required.');
      } else {
        setError('Failed to delete imaging result');
      }
    },
  });

  const handleDeleteClick = (result: LabResult | ImagingFiles, type: 'lab' | 'imaging' = 'lab') => {
    if (type === 'lab') {
      setSelectedLabResult(result as LabResult);
      setSelectedImagingResult(null);
    } else {
      setSelectedImagingResult(result as ImagingFiles);
      setSelectedLabResult(null);
    }
    setShowDeleteModal(true);
    setPin('');
    setError('');
  };

  const handleDeleteConfirm = () => {
    // Admin users bypass PIN requirement
    const effectivePin = user?.role === 'admin' ? '0000' : pin;
    
    if (selectedLabResult) {
      deleteLabResultMutation.mutate({ labResultId: selectedLabResult.id, pin: effectivePin });
    } else if (selectedImagingResult) {
      deleteImagingResultMutation.mutate({ imagingResultId: selectedImagingResult.id, pin: effectivePin });
    }
  };

  const handleViewImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  // Upload imaging result mutation
  const uploadImagingResultMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest(`/api/patients/${patient.id}/imaging-results`, 'POST', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'imaging-results'] });
      setShowUploadModal(false);
      setUploadForm({
        studyType: '',
        studyDate: '',
        bodyPart: '',
        orderingPhysician: '',
        findings: '',
        impression: '',
        imageFile: null
      });
      setError('');
      setUploadErrors({});
    },
    onError: (error: any) => {
      setError('Failed to upload imaging result');
    },
  });

  const handleUploadSubmit = () => {
    const errors: Record<string, string> = {};
    
    if (!uploadForm.studyType.trim()) errors.studyType = 'Study type is required';
    if (!uploadForm.studyDate) errors.studyDate = 'Study date is required';
    if (!uploadForm.bodyPart.trim()) errors.bodyPart = 'Body part is required';
    if (!uploadForm.orderingPhysician.trim()) errors.orderingPhysician = 'Ordering physician is required';
    
    if (Object.keys(errors).length > 0) {
      setUploadErrors(errors);
      return;
    }
    
    setUploadErrors({});
    setError('');

    const formData = new FormData();
    formData.append('studyType', uploadForm.studyType);
    formData.append('studyDate', uploadForm.studyDate);
    formData.append('bodyPart', uploadForm.bodyPart);
    formData.append('reportedBy', uploadForm.orderingPhysician);
    formData.append('studyDescription', uploadForm.studyType);
    formData.append('findings', uploadForm.findings);
    formData.append('impression', uploadForm.impression);
    
    if (uploadForm.imageFile) {
      formData.append('imageFile', uploadForm.imageFile);
    }

    uploadImagingResultMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm(prev => ({ ...prev, imageFile: e.target.files![0] }));
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

  const handlePrintResults = () => {
    const currentResults = resultType === 'lab' ? labResults : imagingResults;
    
    if (resultType === 'lab') {
      const printContent = safeLabResults.map(result => `
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
    } else {
      // Enhanced imaging results print with images
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const imagingContent = safeImagingResults.map((result: any) => {
          const imageSection = result.imageUrl ? `
            <div style="margin: 15px 0; text-align: center;">
              <img src="${window.location.origin}${result.imageUrl}" 
                   style="max-width: 100%; max-height: 400px; border: 1px solid #e5e7eb; border-radius: 8px;" 
                   onload="this.style.display='block'" 
                   onerror="this.style.display='none'; this.parentNode.innerHTML='<p style=color:red;>Image could not be loaded</p>'" />
              <p style="font-size: 12px; color: #666; margin-top: 5px;">Medical Image - ${result.studyType}</p>
            </div>
          ` : '<p style="color: #999; font-style: italic;">No image available</p>';
          
          return `
            <div class="result">
              <h4>${result.studyType || 'Imaging Study'}</h4>
              <p><strong>Date:</strong> ${result.studyDate ? new Date(result.studyDate).toLocaleDateString() : 'Not specified'}</p>
              <p><strong>Body Part:</strong> ${result.bodyPart || 'Not specified'}</p>
              <p><strong>Ordering Physician:</strong> ${result.orderingPhysician || 'Not specified'}</p>
              <p><strong>Findings:</strong> ${result.findings || 'None recorded'}</p>
              <p><strong>Impression:</strong> ${result.impression || 'None recorded'}</p>
              ${imageSection}
              <hr style="margin: 20px 0;">
            </div>
          `;
        }).join('');

        printWindow.document.write(`
          <html>
            <head>
              <title>Imaging Results - ${patient.name}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
                h1, h2 { color: #1f2937; }
                .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
                .result { margin-bottom: 30px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
                .result h4 { margin-top: 0; color: #1f2937; }
                img { display: block; margin: 10px auto; }
                @media print {
                  .result { page-break-inside: avoid; }
                  img { max-height: 300px !important; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Imaging Results</h1>
                <h2>Patient: ${patient.name}</h2>
                <p>Medical Record Number: ${patient.id}</p>
                <p>Date of Birth: ${patient.dob || 'Not specified'}</p>
                <p>Printed: ${new Date().toLocaleString()}</p>
              </div>
              ${imagingContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (isLoading || imagingLoading) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-medical border border-medical-border p-4 sm:p-6 mx-auto">
        <div className="flex items-center space-x-2 mb-4 justify-center">
          <i className="fas fa-spinner fa-spin text-medical-primary"></i>
          <span className="text-medical-text-primary text-sm sm:text-base">Loading {resultType} results...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-medical border border-medical-border p-3 sm:p-4 md:p-6 mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-medical-text-primary flex-shrink-0">
          <i className="fas fa-vial text-medical-primary mr-2"></i>Patient Results
        </h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
          {/* Result Type Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setResultType('lab')}
              className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors min-h-[40px] flex items-center justify-center ${
                resultType === 'lab' 
                  ? 'bg-white text-medical-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="button-lab-results"
            >
              <i className="fas fa-flask mr-1"></i><span className="hidden sm:inline">Lab Results</span><span className="sm:hidden">Lab</span>
            </button>
            <button
              onClick={() => setResultType('imaging')}
              className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors min-h-[40px] flex items-center justify-center ${
                resultType === 'imaging' 
                  ? 'bg-white text-medical-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="button-imaging-results"
            >
              <i className="fas fa-image mr-1"></i><span className="hidden sm:inline">Imaging</span><span className="sm:hidden">IMG</span>
            </button>
          </div>
          
          <div className="text-xs sm:text-sm text-medical-text-muted flex-shrink-0">
            {resultType === 'lab' 
              ? `${safeLabResults.length} result${safeLabResults.length !== 1 ? 's' : ''}` 
              : `${safeImagingResults.length} result${safeImagingResults.length !== 1 ? 's' : ''}`
            }
          </div>
          
          {canDelete && resultType === 'imaging' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-700 transition-colors min-h-[40px] flex items-center justify-center"
              data-testid="button-upload-image"
            >
              <i className="fas fa-upload mr-1 sm:mr-2"></i><span className="hidden sm:inline">Upload Results</span><span className="sm:hidden">Upload</span>
            </button>
          )}
          
          {((resultType === 'lab' && safeLabResults.length > 0) || (resultType === 'imaging' && safeImagingResults.length > 0)) && (
            <button
              onClick={handlePrintResults}
              className="px-3 py-2 bg-medical-primary text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors min-h-[40px] flex items-center justify-center"
              data-testid="button-print-results"
            >
              <i className="fas fa-print mr-1 sm:mr-2"></i><span className="hidden sm:inline">Print {resultType === 'lab' ? 'Lab Results' : 'Imaging Results'}</span><span className="sm:hidden">Print</span>
            </button>
          )}
          
          {/* View Mode Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors min-h-[40px] flex items-center justify-center ${
                viewMode === 'cards' 
                  ? 'bg-white text-medical-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="button-cards-view"
            >
              <i className="fas fa-th-large mr-1"></i><span className="hidden sm:inline">Cards</span><span className="sm:hidden">Card</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors min-h-[40px] flex items-center justify-center ${
                viewMode === 'table' 
                  ? 'bg-white text-medical-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="button-table-view"
            >
              <i className="fas fa-table mr-1"></i><span className="hidden sm:inline">Table</span><span className="sm:hidden">Tbl</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content based on selected result type */}
      {resultType === 'lab' ? (
        // Lab Results Section
        safeLabResults.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-medical-text-muted mx-auto">
            <i className="fas fa-vial text-4xl sm:text-6xl mb-3 sm:mb-4 opacity-20"></i>
            <p className="text-base sm:text-lg font-medium mb-2">No Lab Results</p>
            <p className="text-xs sm:text-sm px-4">No laboratory test results available for this patient.</p>
          </div>
        ) : viewMode === 'cards' ? (
          // Lab Results Card View
          <div className="space-y-3 sm:space-y-4">
            {labResults
              .sort((a, b) => {
                const aDate = a.takenAt ? new Date(a.takenAt).getTime() : 0;
                const bDate = b.takenAt ? new Date(b.takenAt).getTime() : 0;
                return bDate - aDate;
              })
              .map((result) => (
                <div 
                  key={result.id} 
                  className="border border-medical-border rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow relative mx-auto"
                  data-testid={`lab-result-${result.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-12 sm:pr-20 min-w-0">
                      <div className="mb-2">
                        <h4 className="font-medium text-medical-text-primary text-base sm:text-lg truncate">
                          <i className={`${getStatusIcon(result.status)} mr-1 sm:mr-2 text-medical-primary`}></i>
                          {result.testName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <span className="text-medical-text-primary font-semibold text-sm sm:text-base">
                            {result.value} {result.unit}
                          </span>
                          <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                            {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      {result.referenceRange && (
                        <div className="text-xs sm:text-sm text-medical-text-muted mb-2">
                          <strong>Reference Range:</strong> {result.referenceRange}
                        </div>
                      )}
                      
                      <div className="text-xs sm:text-sm text-medical-text-muted mb-2">
                        <strong>Collected:</strong> {result.takenAt ? new Date(result.takenAt).toLocaleDateString() : 'Not specified'}
                      </div>
                      
                      {result.notes && (
                        <div className="text-xs sm:text-sm text-medical-text-secondary">
                          <strong>Notes:</strong> <span className="break-words">{result.notes}</span>
                        </div>
                      )}
                    </div>
                    
                    {canDelete && (
                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                        <button
                          onClick={() => handleDeleteClick(result)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          data-testid={`delete-card-lab-result-${result.id}`}
                          title="Delete lab result"
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          // Lab Results Table View
          <div className="overflow-x-auto rounded-lg border border-medical-border">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-medical-border">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Test</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Value</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden sm:table-cell">Reference Range</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Status</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden md:table-cell">Date</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden lg:table-cell">Notes</th>
                  {canDelete && <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Actions</th>}
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
                  <tr key={result.id} className="border-b border-medical-border hover:bg-gray-50" data-testid={`lab-row-${result.id}`}>
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center">
                        <i className={`${getStatusIcon(result.status)} mr-1 sm:mr-2 text-medical-primary text-sm`}></i>
                        <span className="font-medium text-medical-text-primary text-xs sm:text-sm truncate">{result.testName}</span>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 font-semibold text-medical-text-primary text-xs sm:text-sm">
                      <div className="truncate">{result.value} {result.unit}</div>
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm text-medical-text-muted hidden sm:table-cell">
                      <div className="truncate">{result.referenceRange || '-'}</div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                        <span className="hidden sm:inline">{result.status.charAt(0).toUpperCase() + result.status.slice(1)}</span>
                        <span className="sm:hidden">{result.status.charAt(0).toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm text-medical-text-muted hidden md:table-cell">
                      {result.takenAt 
                        ? new Date(result.takenAt).toLocaleDateString()
                        : 'Not specified'
                      }
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm text-medical-text-muted max-w-xs hidden lg:table-cell">
                      <div className="truncate" title={result.notes || ''}>
                        {result.notes && result.notes.length > 10 
                          ? `${result.notes.substring(0, 10)}...` 
                          : result.notes || '-'
                        }
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button
                          onClick={() => {
                            setSelectedExpandResult(result);
                            setShowExpandModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          data-testid={`expand-table-lab-result-${result.id}`}
                          title="View full lab result"
                        >
                          <i className="fas fa-eye text-sm"></i>
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(result)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                            data-testid={`delete-table-lab-result-${result.id}`}
                            title="Delete lab result"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // Imaging Results Section
        safeImagingResults.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-medical-text-muted mx-auto">
            <i className="fas fa-image text-4xl sm:text-6xl mb-3 sm:mb-4 opacity-20"></i>
            <p className="text-base sm:text-lg font-medium mb-2">No Imaging Results</p>
            <p className="text-xs sm:text-sm px-4">No imaging studies available for this patient.</p>
          </div>
        ) : viewMode === 'cards' ? (
          // Imaging Results Card View
          <div className="space-y-3 sm:space-y-4">
            {safeImagingResults.map((result: any) => (
              <div 
                key={result.id} 
                className="border border-medical-border rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow relative mx-auto"
                data-testid={`imaging-result-${result.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-12 sm:pr-20 min-w-0">
                    <div className="mb-2">
                      <h4 className="font-medium text-medical-text-primary text-base sm:text-lg truncate">
                        <i className="fas fa-image mr-1 sm:mr-2 text-medical-primary"></i>
                        {result.studyType || 'Imaging Study'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-medical-text-muted">
                        <span className="flex items-center">
                          <i className="fas fa-calendar mr-1"></i>
                          {result.studyDate ? new Date(result.studyDate).toLocaleDateString() : 'Date not specified'}
                        </span>
                        <span className="flex items-center truncate">
                          <i className="fas fa-stethoscope mr-1"></i>
                          {result.orderingPhysician || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    
                    {result.bodyPart && (
                      <div className="text-xs sm:text-sm text-medical-text-secondary mb-2">
                        <strong>Body Part:</strong> {result.bodyPart}
                      </div>
                    )}
                    
                    {result.findings && (
                      <div className="text-xs sm:text-sm text-medical-text-secondary mb-2">
                        <strong>Findings:</strong> <span className="break-words">{result.findings}</span>
                      </div>
                    )}
                    
                    {result.impression && (
                      <div className="text-xs sm:text-sm text-medical-text-secondary mb-2">
                        <strong>Impression:</strong> <span className="break-words">{result.impression}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 mt-3">
                      {result.imageUrl && (
                        <button
                          onClick={() => handleViewImage(result.imageUrl)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors min-h-[40px] flex items-center justify-center"
                          data-testid={`view-image-${result.id}`}
                        >
                          <i className="fas fa-image mr-1"></i>View Images
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {canDelete && (
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <button
                        onClick={() => handleDeleteClick(result, 'imaging')}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        data-testid={`delete-card-imaging-result-${result.id}`}
                        title="Delete imaging result"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Imaging Results Table View
          <div className="overflow-x-auto rounded-lg border border-medical-border">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-medical-border">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Study Type</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden sm:table-cell">Date</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden md:table-cell">Body Part</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden lg:table-cell">Ordering Physician</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm hidden lg:table-cell">Findings</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-medical-text-secondary text-xs sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeImagingResults.map((result: any) => (
                  <tr key={result.id} className="border-b border-medical-border hover:bg-gray-50" data-testid={`imaging-row-${result.id}`}>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <div className="flex items-center">
                        <i className="fas fa-image mr-1 sm:mr-2 text-medical-primary text-sm"></i>
                        <span className="text-xs sm:text-sm truncate">{result.studyType || 'Imaging Study'}</span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-medical-text-secondary text-xs sm:text-sm hidden sm:table-cell">
                      {result.studyDate ? new Date(result.studyDate).toLocaleDateString() : 'Not specified'}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-medical-text-secondary text-xs sm:text-sm hidden md:table-cell">
                      <div className="truncate">{result.bodyPart || 'Not specified'}</div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-medical-text-secondary text-xs sm:text-sm hidden lg:table-cell">
                      <div className="truncate">{result.reportedBy || 'Not specified'}</div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-medical-text-secondary text-xs sm:text-sm hidden lg:table-cell">
                      <div className="max-w-xs truncate" title={result.findings}>
                        {result.findings && result.findings.length > 10 
                          ? `${result.findings.substring(0, 10)}...` 
                          : result.findings || 'No findings recorded'
                        }
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button
                          onClick={() => {
                            setSelectedExpandImagingResult(result);
                            setShowExpandImagingModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          data-testid={`expand-table-imaging-result-${result.id}`}
                          title="View full imaging result"
                        >
                          <i className="fas fa-eye text-sm"></i>
                        </button>
                        {result.imageUrl && (
                          <button
                            onClick={() => handleViewImage(result.imageUrl)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                            data-testid={`view-table-image-${result.id}`}
                            title="View images"
                          >
                            <i className="fas fa-image text-sm"></i>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(result, 'imaging')}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                            data-testid={`delete-table-imaging-result-${result.id}`}
                            title="Delete imaging result"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete {selectedLabResult ? 'Lab' : 'Imaging'} Result
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this {selectedLabResult ? 'lab' : 'imaging'} result for{' '}
              <strong>
                {selectedLabResult ? selectedLabResult.testName : selectedImagingResult?.studyType}
              </strong>? 
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
                disabled={deleteLabResultMutation.isPending || deleteImagingResultMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {(deleteLabResultMutation.isPending || deleteImagingResultMutation.isPending) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-file-medical mr-2"></i>Upload Imaging Results
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a new imaging study with diagnostic images and clinical findings.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Type *
                </label>
                <select
                  value={uploadForm.studyType}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, studyType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="select-study-type"
                >
                  <option value="">Select study type</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="CT">CT Scan</option>
                  <option value="MRI">MRI</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="Nuclear Medicine">Nuclear Medicine</option>
                  <option value="Mammography">Mammography</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Date *
                </label>
                <input
                  type="date"
                  value={uploadForm.studyDate}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, studyDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="input-study-date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Part *
                </label>
                <input
                  type="text"
                  value={uploadForm.bodyPart}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, bodyPart: e.target.value }))}
                  placeholder="e.g., Chest, Head, Abdomen"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="input-body-part"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordering Physician *
                </label>
                <input
                  type="text"
                  value={uploadForm.orderingPhysician}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, orderingPhysician: e.target.value }))}
                  placeholder="e.g., Dr. Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  data-testid="input-ordering-physician"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Findings
              </label>
              <textarea
                value={uploadForm.findings}
                onChange={(e) => setUploadForm(prev => ({ ...prev, findings: e.target.value }))}
                placeholder="Describe the radiological findings..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                data-testid="textarea-findings"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impression
              </label>
              <textarea
                value={uploadForm.impression}
                onChange={(e) => setUploadForm(prev => ({ ...prev, impression: e.target.value }))}
                placeholder="Clinical impression and recommendations..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                data-testid="textarea-impression"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Images
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <i className="fas fa-cloud-upload text-3xl text-gray-400 mb-3"></i>
                <p className="text-sm text-gray-600 mb-2">
                  Click to upload or drag and drop diagnostic images
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  JPEG, PNG, DICOM files up to 50MB each
                </p>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.dcm,.dicom"
                  onChange={handleFileChange}
                  className="w-full"
                  data-testid="input-image-upload"
                />
                {uploadForm.imageFile && (
                  <div className="mt-3 text-sm text-green-600">
                    <i className="fas fa-check-circle mr-1"></i>
                    File selected: {uploadForm.imageFile.name}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({
                    studyType: '',
                    studyDate: '',
                    bodyPart: '',
                    orderingPhysician: '',
                    findings: '',
                    impression: '',
                    imageFile: null
                  });
                  setError('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={uploadImagingResultMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={uploadImagingResultMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                data-testid="button-upload-confirm"
              >
                {uploadImagingResultMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>Uploading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload mr-2"></i>Upload Result
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expand Lab Result Modal */}
      {showExpandModal && selectedExpandResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-file-medical mr-2"></i>Lab Result Details
              </h3>
              <button
                onClick={() => setShowExpandModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-close-expand-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandResult.testName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandResult.value} {selectedExpandResult.unit}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Range</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandResult.referenceRange || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedExpandResult.status)}`}>
                    {selectedExpandResult.status.charAt(0).toUpperCase() + selectedExpandResult.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Taken</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandResult.takenAt 
                      ? new Date(selectedExpandResult.takenAt).toLocaleDateString()
                      : 'Not specified'
                    }
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border min-h-[100px] whitespace-pre-wrap">
                  {selectedExpandResult.notes || 'No notes available'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expand Imaging Result Modal */}
      {showExpandImagingModal && selectedExpandImagingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-image mr-2"></i>Imaging Result Details
              </h3>
              <button
                onClick={() => setShowExpandImagingModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-close-expand-imaging-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Study Type</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandImagingResult.studyType || 'Imaging Study'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Study Date</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandImagingResult.studyDate 
                      ? new Date(selectedExpandImagingResult.studyDate).toLocaleDateString()
                      : 'Not specified'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body Part</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandImagingResult.bodyPart || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordering Physician</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedExpandImagingResult.reportedBy || 'Not specified'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border min-h-[100px] whitespace-pre-wrap">
                  {selectedExpandImagingResult.findings || 'No findings recorded'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impression</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border min-h-[100px] whitespace-pre-wrap">
                  {selectedExpandImagingResult.impression || 'No impression recorded'}
                </div>
              </div>
              
              {selectedExpandImagingResult.imageUrl && (
                <div className="flex justify-center">
                  <button
                    onClick={() => selectedExpandImagingResult.imageUrl && handleViewImage(selectedExpandImagingResult.imageUrl)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center"
                    data-testid={`view-image-from-expand-${selectedExpandImagingResult.id}`}
                  >
                    <i className="fas fa-image mr-2"></i>View Medical Images
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Image Viewer Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-screen m-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-image mr-2"></i>Medical Images
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-close-image-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-auto">
              <div className="flex justify-center">
                <img
                  src={selectedImageUrl}
                  alt="Medical imaging study"
                  className="max-w-full max-h-80 object-contain"
                  data-testid="modal-medical-image"
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  High-resolution medical imaging study
                </p>
                <div className="mt-2 flex justify-center space-x-2">
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">
                    <i className="fas fa-search-plus mr-1"></i>Zoom In
                  </button>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">
                    <i className="fas fa-search-minus mr-1"></i>Zoom Out
                  </button>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedImageUrl || '';
                      link.download = 'medical-image.jpg';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                  >
                    <i className="fas fa-download mr-1"></i>Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}