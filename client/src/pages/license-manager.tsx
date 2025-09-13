import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface License {
  id: string;
  key: string;
  generated: string;
  status: 'unused' | 'used';
  usedDate?: string;
  customerInfo?: any;
}

interface UsageReport {
  total: number;
  unused: number;
  used: number;
  generatedToday: number;
}

export function LicenseManager() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [usageReport, setUsageReport] = useState<UsageReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [newLicenses, setNewLicenses] = useState<License[]>([]);
  const [validateKey, setValidateKey] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  // Mock data for demonstration (in real implementation, this would call the license generator API)
  const mockLicenses: License[] = [
    {
      id: '1',
      key: 'ABCD-EFGH-IJKL-M123',
      generated: '2025-01-15T10:00:00Z',
      status: 'unused'
    },
    {
      id: '2', 
      key: 'DEFG-HIJK-LMNO-P456',
      generated: '2025-01-15T10:01:00Z',
      status: 'used',
      usedDate: '2025-01-16T14:30:00Z',
      customerInfo: { email: 'customer@example.com' }
    }
  ];

  const mockUsageReport: UsageReport = {
    total: 250,
    unused: 180,
    used: 70,
    generatedToday: 25
  };

  useEffect(() => {
    // Load initial data
    setLicenses(mockLicenses);
    setUsageReport(mockUsageReport);
  }, []);

  const generateLicenses = async () => {
    setIsGenerating(true);
    setNewLicenses([]);

    try {
      // Simulate license generation (in real implementation, call the license generator)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generated: License[] = [];
      for (let i = 0; i < generateCount; i++) {
        generated.push({
          id: `gen-${Date.now()}-${i}`,
          key: generateMockLicenseKey(),
          generated: new Date().toISOString(),
          status: 'unused'
        });
      }
      
      setNewLicenses(generated);
      setLicenses(prev => [...prev, ...generated]);
      
      // Update usage report
      setUsageReport(prev => prev ? {
        ...prev,
        total: prev.total + generateCount,
        unused: prev.unused + generateCount,
        generatedToday: prev.generatedToday + generateCount
      } : null);
      
    } catch (error) {
      console.error('Error generating licenses:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const validateLicense = () => {
    // Mock validation
    const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(validateKey);
    const existsInDb = licenses.find(l => l.key === validateKey);
    
    setValidationResult({
      isValid: isValidFormat,
      existsInDatabase: !!existsInDb,
      status: existsInDb?.status || 'unknown',
      generated: existsInDb?.generated,
      used: existsInDb?.usedDate
    });
  };

  const exportLicenses = (format: 'json' | 'csv' | 'txt') => {
    let content = '';
    let filename = '';
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'csv':
        content = 'License Key,Generated Date,Status,Used Date\n' + 
                 licenses.map(l => `"${l.key}","${l.generated}","${l.status}","${l.usedDate || ''}"`).join('\n');
        filename = `licenses-${timestamp}.csv`;
        break;
      case 'txt':
        content = licenses.map(l => l.key).join('\n');
        filename = `license-keys-${timestamp}.txt`;
        break;
      default:
        content = JSON.stringify(licenses, null, 2);
        filename = `licenses-${timestamp}.json`;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">License Manager</h1>
          <p className="text-gray-600">Generate and manage MedChart Pro license keys</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <i className="fas fa-key mr-2"></i>
          Admin Panel
        </Badge>
      </div>

      {/* Usage Report */}
      {usageReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{usageReport.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unused</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{usageReport.unused}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{usageReport.used}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Generated Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{usageReport.generatedToday}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate Licenses */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Licenses</CardTitle>
          <CardDescription>Create new license keys for MedChart Pro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="count">Number of licenses to generate</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="1000"
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={generateLicenses} 
              disabled={isGenerating}
              className="mt-6"
              data-testid="generate-licenses-button"
            >
              {isGenerating ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Generating...</>
              ) : (
                <><i className="fas fa-plus mr-2"></i>Generate Licenses</>
              )}
            </Button>
          </div>

          {newLicenses.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Newly Generated Licenses:</h4>
              <Textarea
                readOnly
                value={newLicenses.map(l => l.key).join('\n')}
                className="h-32 font-mono text-sm"
              />
              <div className="flex space-x-2 mt-2">
                <Button size="sm" onClick={() => navigator.clipboard.writeText(newLicenses.map(l => l.key).join('\n'))}>
                  <i className="fas fa-copy mr-2"></i>Copy All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validate License */}
      <Card>
        <CardHeader>
          <CardTitle>Validate License Key</CardTitle>
          <CardDescription>Check if a license key is valid and get its status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="validate-key">License Key</Label>
              <Input
                id="validate-key"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={validateKey}
                onChange={(e) => setValidateKey(e.target.value.toUpperCase())}
                className="mt-1 font-mono"
              />
            </div>
            <Button onClick={validateLicense} disabled={!validateKey} className="mt-6">
              <i className="fas fa-check mr-2"></i>Validate
            </Button>
          </div>

          {validationResult && (
            <div className={`p-4 rounded-lg border ${
              validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center mb-2">
                <i className={`fas ${validationResult.isValid ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'} mr-2`}></i>
                <span className="font-semibold">
                  {validationResult.isValid ? 'Valid License Key' : 'Invalid License Key'}
                </span>
              </div>
              {validationResult.isValid && (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>In Database: {validationResult.existsInDatabase ? 'Yes' : 'No'}</p>
                  {validationResult.existsInDatabase && (
                    <>
                      <p>Status: <Badge variant={validationResult.status === 'used' ? 'secondary' : 'default'}>
                        {validationResult.status}
                      </Badge></p>
                      <p>Generated: {new Date(validationResult.generated).toLocaleDateString()}</p>
                      {validationResult.used && (
                        <p>Used: {new Date(validationResult.used).toLocaleDateString()}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Licenses</CardTitle>
          <CardDescription>Download license data in different formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button onClick={() => exportLicenses('json')} variant="outline" size="sm">
              <i className="fas fa-download mr-2"></i>Export JSON
            </Button>
            <Button onClick={() => exportLicenses('csv')} variant="outline" size="sm">
              <i className="fas fa-download mr-2"></i>Export CSV
            </Button>
            <Button onClick={() => exportLicenses('txt')} variant="outline" size="sm">
              <i className="fas fa-download mr-2"></i>Export Keys Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Licenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Licenses ({licenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">License Key</th>
                  <th className="text-left py-2">Generated</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Used Date</th>
                </tr>
              </thead>
              <tbody>
                {licenses.slice(-10).reverse().map((license) => (
                  <tr key={license.id} className="border-b">
                    <td className="py-2 font-mono text-xs">{license.key}</td>
                    <td className="py-2">{new Date(license.generated).toLocaleDateString()}</td>
                    <td className="py-2">
                      <Badge variant={license.status === 'used' ? 'secondary' : 'default'}>
                        {license.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {license.usedDate ? new Date(license.usedDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}