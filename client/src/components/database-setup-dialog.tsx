import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DatabaseTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'General' | 'Specialty' | 'Custom';
  isDefault?: boolean;
}

interface DatabaseSetupDialogProps {
  onTemplateSelected: (templateId: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export function DatabaseSetupDialog({ onTemplateSelected, onSkip, isLoading = false }: DatabaseSetupDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('general');
  const [showCustomUpload, setShowCustomUpload] = useState(false);

  const templates: DatabaseTemplate[] = [
    {
      id: 'general',
      name: 'General Medicine',
      description: 'General medical practice with common medications and procedures',
      icon: '🏥',
      category: 'General',
      isDefault: true
    },
    {
      id: 'pediatrics',
      name: 'Pediatrics',
      description: 'Specialized for pediatric care with age-appropriate medications and dosages',
      icon: '👶',
      category: 'Specialty'
    },
    {
      id: 'cardiology',
      name: 'Cardiology',
      description: 'Cardiac care focused with cardiovascular medications and procedures',
      icon: '❤️',
      category: 'Specialty'
    },
    {
      id: 'labor_delivery',
      name: 'Labor & Delivery',
      description: 'Obstetric care with maternal and neonatal medications',
      icon: '👪',
      category: 'Specialty'
    },
    {
      id: 'emergency',
      name: 'Emergency Medicine',
      description: 'Emergency department with critical care medications and protocols',
      icon: '🚑',
      category: 'Specialty'
    },
    {
      id: 'surgery',
      name: 'Surgery',
      description: 'Surgical care with perioperative medications and procedures',
      icon: '🏥',
      category: 'Specialty'
    },
    {
      id: 'icu',
      name: 'Intensive Care Unit',
      description: 'Critical care with intensive monitoring and advanced medications',
      icon: '🏥',
      category: 'Specialty'
    },
    {
      id: 'oncology',
      name: 'Oncology',
      description: 'Cancer care with chemotherapy and supportive care medications',
      icon: '🎗️',
      category: 'Specialty'
    }
  ];

  const generalTemplates = templates.filter(t => t.category === 'General');
  const specialtyTemplates = templates.filter(t => t.category === 'Specialty');

  const handleContinue = () => {
    if (selectedTemplate) {
      onTemplateSelected(selectedTemplate);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-database text-white text-2xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Your Medical Database</h2>
            <p className="text-gray-600">
              Choose a pre-configured database template that matches your medical specialty. 
              This will populate your system with relevant medications, procedures, and sample data.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* General Medicine */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <i className="fas fa-star text-yellow-500 mr-2"></i>
              Recommended
            </h3>
            <div className="grid gap-4">
              {generalTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedTemplate === template.id
                      ? 'ring-2 ring-medical-primary border-medical-primary bg-blue-50'
                      : 'hover:shadow-md border-gray-200'
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{template.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex items-center mt-1">
                            <Badge variant="secondary" className="text-xs mr-2">
                              {template.category}
                            </Badge>
                            {template.isDefault && (
                              <Badge variant="default" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <i className="fas fa-check-circle text-medical-primary text-xl"></i>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Specialty Templates */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <i className="fas fa-stethoscope text-medical-primary mr-2"></i>
              Medical Specialties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specialtyTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedTemplate === template.id
                      ? 'ring-2 ring-medical-primary border-medical-primary bg-blue-50'
                      : 'hover:shadow-md border-gray-200'
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{template.icon}</span>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="outline" className="text-xs mt-1">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <i className="fas fa-check-circle text-medical-primary text-lg"></i>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Template Option */}
          <div className="mb-6">
            <Card className="border-dashed border-2 border-gray-300">
              <CardHeader>
                <div className="text-center">
                  <i className="fas fa-upload text-gray-400 text-2xl mb-2"></i>
                  <CardTitle className="text-base text-gray-600">Custom Template</CardTitle>
                  <CardDescription className="text-sm">
                    Have a custom database template? Contact support to have it configured for your organization.
                  </CardDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      if (window.electronAPI) {
                        window.electronAPI.openExternal('mailto:support@medchartpro.com?subject=Custom Database Template Request');
                      }
                    }}
                  >
                    <i className="fas fa-envelope mr-2"></i>
                    Contact Support
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <i className="fas fa-info-circle mr-2"></i>
              You can always change or customize your database configuration later in the admin panel.
            </div>
            <div className="flex space-x-3">
              {onSkip && (
                <Button
                  variant="outline"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  Skip Setup
                </Button>
              )}
              <Button
                onClick={handleContinue}
                disabled={!selectedTemplate || isLoading}
                className="bg-medical-primary hover:bg-medical-primary/90"
                data-testid="continue-setup-button"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Setting up database...
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrow-right mr-2"></i>
                    Continue with {templates.find(t => t.id === selectedTemplate)?.name || 'Selected Template'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template preview component (for future use)
export function TemplatePreview({ templateId }: { templateId: string }) {
  const [templateData, setTemplateData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This would fetch template preview data
  // For now, just show loading or static preview

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-semibold mb-2">Template Preview</h4>
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading template preview...</div>
      ) : (
        <div className="text-sm text-gray-600">
          <p>This template includes:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Pre-configured medications and dosages</li>
            <li>Sample patient data</li>
            <li>Relevant lab test types</li>
            <li>Medical procedures and protocols</li>
          </ul>
        </div>
      )}
    </div>
  );
}