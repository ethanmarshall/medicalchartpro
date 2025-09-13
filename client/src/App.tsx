import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AlertProvider } from "@/contexts/alert-context";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import MedPyxis from "@/pages/medpyxis";
import NotFound from "@/pages/not-found";
import Login from "@/components/login";
import { ActivationDialog, TrialBanner } from "@/components/activation-dialog";
import { DatabaseSetupDialog } from "@/components/database-setup-dialog";
import { LicenseManager } from "@/pages/license-manager";
import { useState, useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [forceRefresh, setForceRefresh] = useState(false);
  const [activationStatus, setActivationStatus] = useState<{
    isActivated: boolean;
    activationInfo: any;
    trialInfo: any;
  } | null>(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  const handleLoginSuccess = () => {
    setForceRefresh(!forceRefresh);
    queryClient.invalidateQueries();
  };

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(!!window.electronAPI);
    
    // Check activation status if in Electron
    if (window.electronAPI) {
      checkActivationStatus();
      
      // Listen for activation required events
      window.electronAPI.onActivationRequired(() => {
        setShowActivationDialog(true);
      });
      
      return () => {
        window.electronAPI?.removeAllListeners('activation-required');
      };
    }
  }, []);

  const checkActivationStatus = async () => {
    if (window.electronAPI) {
      try {
        const status = await window.electronAPI.checkActivationStatus();
        setActivationStatus(status);
        
        // Show activation dialog if not activated and no valid trial
        if (!status.isActivated && (!status.trialInfo || status.trialInfo.expired)) {
          setShowActivationDialog(true);
        }
      } catch (error) {
        console.error('Error checking activation status:', error);
      }
    }
  };

  const handleActivationSuccess = async () => {
    setShowActivationDialog(false);
    await checkActivationStatus();
    
    // Check if database setup is needed
    const needsSetup = await checkDatabaseSetupRequired();
    if (needsSetup) {
      setShowDatabaseSetup(true);
    } else {
      setSetupComplete(true);
    }
  };

  const handleTrialMode = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.startTrial();
        setShowActivationDialog(false);
        await checkActivationStatus();
        
        // Check if database setup is needed
        const needsSetup = await checkDatabaseSetupRequired();
        if (needsSetup) {
          setShowDatabaseSetup(true);
        } else {
          setSetupComplete(true);
        }
      } catch (error) {
        console.error('Error starting trial:', error);
      }
    }
  };

  const handleActivateFromBanner = () => {
    setShowActivationDialog(true);
  };

  const checkDatabaseSetupRequired = async () => {
    try {
      // Check if database has been initialized
      const response = await fetch('/api/admin/setup-status');
      if (response.ok) {
        const { needsSetup } = await response.json();
        return needsSetup;
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
    return true; // Default to requiring setup
  };

  const handleDatabaseTemplateSelected = async (templateId: string) => {
    try {
      const response = await fetch('/api/admin/setup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId }),
      });
      
      if (response.ok) {
        setShowDatabaseSetup(false);
        setSetupComplete(true);
        // Invalidate queries to refresh data
        queryClient.invalidateQueries();
      } else {
        console.error('Database setup failed');
      }
    } catch (error) {
      console.error('Error setting up database:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show trial banner if in trial mode
  const showTrialBanner = isElectron && activationStatus && !activationStatus.isActivated && 
                         activationStatus.trialInfo && !activationStatus.trialInfo.expired;
  
  const trialExpired = isElectron && activationStatus && !activationStatus.isActivated && 
                      activationStatus.trialInfo && activationStatus.trialInfo.expired;

  return (
    <>
      {/* Trial Banner */}
      {showTrialBanner && (
        <TrialBanner 
          daysRemaining={activationStatus.trialInfo.daysRemaining}
          onActivate={handleActivateFromBanner}
        />
      )}
      
      {/* Trial Expired Banner */}
      {trialExpired && (
        <TrialBanner 
          daysRemaining={0}
          onActivate={handleActivateFromBanner}
        />
      )}
      
      {/* Main Routes */}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/medpyxis" component={MedPyxis} />
        <Route path="/license-manager" component={LicenseManager} />
        <Route component={NotFound} />
      </Switch>
      
      {/* Activation Dialog */}
      {showActivationDialog && (
        <ActivationDialog
          onActivationSuccess={handleActivationSuccess}
          onTrialMode={handleTrialMode}
        />
      )}
      
      {/* Database Setup Dialog */}
      {showDatabaseSetup && (
        <DatabaseSetupDialog
          onTemplateSelected={handleDatabaseTemplateSelected}
          onSkip={() => {
            setShowDatabaseSetup(false);
            setSetupComplete(true);
          }}
        />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AlertProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AlertProvider>
    </QueryClientProvider>
  );
}

export default App;
