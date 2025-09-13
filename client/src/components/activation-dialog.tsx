import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ActivationDialogProps {
  onActivationSuccess: () => void;
  onTrialMode?: () => void;
}

export function ActivationDialog({ onActivationSuccess, onTrialMode }: ActivationDialogProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState('');
  const [showTrialOption, setShowTrialOption] = useState(false);

  useEffect(() => {
    // Show trial option after 30 seconds if user hasn't activated
    const timer = setTimeout(() => {
      setShowTrialOption(true);
    }, 30000);
    
    return () => clearTimeout(timer);
  }, []);

  const formatLicenseKey = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // Add dashes every 4 characters, max 16 characters
    const formatted = clean.match(/.{1,4}/g)?.slice(0, 4).join('-') || clean;
    
    return formatted;
  };

  const handleLicenseKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
    setError('');
  };

  const handleActivate = async () => {
    if (!licenseKey || licenseKey.length < 19) {
      setError('Please enter a complete license key');
      return;
    }

    setIsActivating(true);
    setError('');

    try {
      // Send activation request to Electron main process
      const result = await window.electronAPI?.activateLicense(licenseKey);
      
      if (result?.success) {
        onActivationSuccess();
      } else {
        setError(result?.error || 'Activation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Activation failed. Please check your internet connection and try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleTrial = () => {
    if (onTrialMode) {
      onTrialMode();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isActivating) {
      handleActivate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-key text-white text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Activate MedChart Pro</h2>
          <p className="text-gray-600 text-sm">
            Enter your license key to unlock the full version of MedChart Pro
          </p>
        </div>

        {/* License Key Input */}
        <div className="mb-6">
          <label htmlFor="licenseKey" className="block text-sm font-medium text-gray-700 mb-2">
            License Key
          </label>
          <input
            id="licenseKey"
            type="text"
            value={licenseKey}
            onChange={handleLicenseKeyChange}
            onKeyPress={handleKeyPress}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-medical-primary font-mono text-center tracking-wider"
            maxLength={19}
            disabled={isActivating}
            data-testid="license-key-input"
          />
          <p className="text-xs text-gray-500 mt-1 text-center">
            Enter the 16-character license key you received with your purchase
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleActivate}
            disabled={isActivating || !licenseKey}
            className="w-full bg-medical-primary hover:bg-medical-primary/90 text-white py-2.5"
            data-testid="activate-button"
          >
            {isActivating ? (
              <div className="flex items-center justify-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Activating...
              </div>
            ) : (
              <>
                <i className="fas fa-unlock-alt mr-2"></i>
                Activate License
              </>
            )}
          </Button>

          {showTrialOption && onTrialMode && (
            <Button
              onClick={handleTrial}
              variant="outline"
              className="w-full py-2.5"
              disabled={isActivating}
              data-testid="trial-button"
            >
              <i className="fas fa-clock mr-2"></i>
              Continue with 7-day Trial
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-center text-xs text-gray-500">
            <p className="mb-2">Need help with activation?</p>
            <div className="space-y-1">
              <p>• Check your purchase email for the license key</p>
              <p>• Ensure you're connected to the internet</p>
              <p>• Contact support if you continue having issues</p>
            </div>
          </div>
        </div>

        {/* Purchase Link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              window.electronAPI?.openExternal('https://medchartpro.com/purchase');
            }}
            className="text-medical-primary hover:text-medical-primary/80 text-sm underline"
          >
            Don't have a license? Purchase MedChart Pro
          </button>
        </div>
      </div>
    </div>
  );
}

// Trial mode banner component
export function TrialBanner({ daysRemaining, onActivate }: { daysRemaining: number; onActivate: () => void }) {
  if (daysRemaining <= 0) {
    return (
      <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
        <i className="fas fa-exclamation-triangle mr-2"></i>
        Trial expired. Please activate your license to continue using MedChart Pro.
        <button
          onClick={onActivate}
          className="ml-3 px-3 py-1 bg-white text-red-600 rounded text-xs hover:bg-red-50"
        >
          Activate Now
        </button>
      </div>
    );
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm">
      <i className="fas fa-clock mr-2"></i>
      Trial: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
      <button
        onClick={onActivate}
        className="ml-3 px-3 py-1 bg-white text-orange-500 rounded text-xs hover:bg-orange-50"
      >
        Activate License
      </button>
    </div>
  );
}