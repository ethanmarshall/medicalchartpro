import { useState } from "react";
import { Link } from "wouter";
import { PatientDashboard } from "@/components/patient-dashboard";
import { PatientChart } from "@/components/patient-chart";
import { AdminDashboard } from "@/components/admin-dashboard";
import { TimeSimulationModal } from "@/components/time-simulation";
import { UserManagement } from "@/components/user-management";
import { DoseCalculator } from "@/components/dose-calculator";
import { MedicationAlerts } from "@/components/medication-alerts";
import { AlertMenuButton } from "@/components/alert-menu-button";
import { VitalsMonitor } from "@/components/vitals-monitor";
import logoImage from "@assets/IMG_1772_1756955496751.jpeg";
import { type Patient } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useBackgroundVitalLogging } from "@/hooks/useBackgroundVitalLogging";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, User } from "lucide-react";

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showTimeSimulation, setShowTimeSimulation] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showDoseCalculator, setShowDoseCalculator] = useState(false);
  const [showVitalsMonitor, setShowVitalsMonitor] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pendingAction, setPendingAction] = useState<'admin' | 'time' | 'users' | ''>('');
  const { user, isLoading } = useAuth();

  // Enable background vital logging for all patients
  const { isLogging, patientCount } = useBackgroundVitalLogging();


  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
  });

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logoutMutation.mutate();
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
  };

  const handleProfileClick = () => {
    setShowMenuModal(true);
  };

  const handlePinSubmit = () => {
    if (pin === "112794" || pin === "0000") {
      setShowPinModal(false);
      if (pendingAction === 'admin') {
        setShowAdminDashboard(true);
      } else if (pendingAction === 'time') {
        setShowTimeSimulation(true);
      } else if (pendingAction === 'users') {
        setShowUserManagement(true);
      }
    } else {
      alert("Incorrect PIN. Access denied.");
    }
    setPin("");
    setPendingAction('');
  };

  const handleCloseAdminDashboard = () => {
    setShowAdminDashboard(false);
  };

  const handleCloseTimeSimulation = () => {
    setShowTimeSimulation(false);
  };

  const handleCloseUserManagement = () => {
    setShowUserManagement(false);
  };

  const handleMenuSelection = (selection: 'admin' | 'time' | 'users') => {
    setShowMenuModal(false);
    setPendingAction(selection);
    
    // Skip PIN for admin users accessing admin dashboard or time simulation
    if (selection === 'admin' && user?.role === 'admin') {
      setShowAdminDashboard(true);
      setPendingAction('');
    } else if (selection === 'time' && user?.role === 'admin') {
      setShowTimeSimulation(true);
      setPendingAction('');
    } else {
      setShowPinModal(true);
      setPin("");
    }
  };

  if (selectedPatient) {
    return <PatientChart patient={selectedPatient} onClear={handleClearPatient} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-background to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-medical-border shadow-sm" data-testid="header-dashboard">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 md:py-4">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
                <img src={logoImage} alt="MedChart Pro Logo" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-medical-text-primary">MedChart Pro</h1>
                <p className="text-xs sm:text-sm text-medical-text-muted">Patient Dashboard</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-medical-text-primary">MedChart</h1>
              </div>
            </Link>
            <div className="flex items-center space-x-1 sm:space-x-4">
              <Link href="/">
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base" data-testid="link-home">
                  <i className="fas fa-home mr-1 sm:mr-2"></i><span className="hidden sm:inline">Home</span>
                </button>
              </Link>
              <Link href="/medpyxis">
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base" data-testid="link-medpyxis">
                  <i className="fas fa-pills mr-1 sm:mr-2"></i><span className="hidden sm:inline">MedPyxis</span>
                </button>
              </Link>
              <button 
                onClick={() => setShowVitalsMonitor(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base" 
                data-testid="button-vitals-monitor"
              >
                <i className="fas fa-heartbeat mr-1 sm:mr-2"></i><span className="hidden sm:inline">Vitals</span>
              </button>
              <AlertMenuButton />
              <button 
                onClick={handleProfileClick}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-medical-secondary rounded-full flex items-center justify-center hover:bg-medical-secondary/90 transition-colors"
                data-testid="button-profile"
              >
                <i className="fas fa-cog text-white text-xs sm:text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Welcome Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-medical-text-primary mb-2">Patient Dashboard</h2>
          <p className="text-sm sm:text-base text-medical-text-secondary max-w-2xl mx-auto px-4 sm:px-0">
            Monitor all patients at a glance with filtering by department and comprehensive patient information.
          </p>
        </div>

        <PatientDashboard onPatientSelect={handlePatientSelect} />
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl border border-medical-border p-4 sm:p-6 max-w-md mx-auto w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lock text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-medical-text-primary mb-2">
                {pendingAction === 'time' ? 'Time Simulation Access' : 
                 pendingAction === 'users' ? 'User Management Access' : 'Database Management Access'}
              </h3>
              <p className="text-medical-text-secondary mb-6">
                {pendingAction === 'time' ? 'Enter PIN to access time simulation' : 
                 pendingAction === 'users' ? 'Enter PIN to access user management' : 'Enter PIN to access database management'}
              </p>
              
              <div className="mb-6">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full p-4 text-center text-2xl font-mono border border-medical-border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  maxLength={6}
                  data-testid="input-pin"
                  onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {setShowPinModal(false); setPin(""); setPendingAction('');}}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  data-testid="button-cancel-pin"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePinSubmit()}
                  disabled={!pin}
                  className="flex-1 px-4 py-3 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-submit-pin"
                >
                  Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl border border-medical-border p-4 sm:p-6 max-w-md mx-auto w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-medical-text-primary mb-2">
                {isLoading ? 'Loading...' : (user?.role === 'student' || !user?.role) ? 'Profile' : 'Administrative Menu'}
              </h3>
              <p className="text-medical-text-secondary mb-6">
                {isLoading ? 'Please wait...' : (user?.role === 'student' || !user?.role) ? 'Student information and settings' : 'Select an option to continue'}
              </p>
            </div>

            {isLoading ? (
              // Loading state - show spinner
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-medical-primary"></div>
                <p className="mt-2 text-medical-text-secondary">Loading...</p>
              </div>
            ) : user?.role === 'student' || !user?.role || user?.role === undefined ? (
              // Student view or default when role is undefined - only show ID and logout
              <>
                <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                  <div className="flex items-center">
                    <User className="text-blue-600 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-semibold text-blue-900">Student ID</div>
                      <div className="text-sm text-blue-700">{user?.username || 'Loading...'}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {setShowMenuModal(false); setShowDoseCalculator(true);}}
                  className="w-full p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-left mb-3"
                  data-testid="button-dose-calculator-student"
                >
                  <div className="flex items-center">
                    <i className="fas fa-calculator text-orange-600 text-xl mr-3"></i>
                    <div>
                      <div className="font-semibold text-orange-900">Dose Calculator</div>
                      <div className="text-sm text-orange-700">Calculate medication dosages</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left mb-3"
                  data-testid="button-logout"
                >
                  <div className="flex items-center">
                    <LogOut className="text-red-600 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-semibold text-red-900">
                        {logoutMutation.isPending ? "Logging out..." : "Logout"}
                      </div>
                      <div className="text-sm text-red-700">Sign out of your account</div>
                    </div>
                  </div>
                </button>
              </>
            ) : (
              // Instructor/Admin view - only show for confirmed admin/instructor roles
              <>
                <button
                  onClick={() => handleMenuSelection('admin')}
                  className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left mb-3"
                  data-testid="button-admin-dashboard"
                >
                  <div className="flex items-center">
                    <i className="fas fa-shield-alt text-blue-600 text-xl mr-3"></i>
                    <div>
                      <div className="font-semibold text-blue-900">Admin Dashboard</div>
                      <div className="text-sm text-blue-700">Complete system management: users, patients, medicines, lab tests, imaging & database</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuSelection('time')}
                  className="w-full p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-left mb-3"
                  data-testid="button-time-simulation"
                >
                  <div className="flex items-center">
                    <i className="fas fa-clock text-indigo-600 text-xl mr-3"></i>
                    <div>
                      <div className="font-semibold text-indigo-900">Time Simulation</div>
                      <div className="text-sm text-indigo-700">Training mode - Jump forward in time</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {setShowMenuModal(false); setShowDoseCalculator(true);}}
                  className="w-full p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-left mb-3"
                  data-testid="button-dose-calculator-admin"
                >
                  <div className="flex items-center">
                    <i className="fas fa-calculator text-orange-600 text-xl mr-3"></i>
                    <div>
                      <div className="font-semibold text-orange-900">Dose Calculator</div>
                      <div className="text-sm text-orange-700">Calculate medication dosages</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left mb-3"
                  data-testid="button-logout-admin"
                >
                  <div className="flex items-center">
                    <LogOut className="text-red-600 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-semibold text-red-900">
                        {logoutMutation.isPending ? "Logging out..." : "Logout"}
                      </div>
                      <div className="text-sm text-red-700">Sign out of your account</div>
                    </div>
                  </div>
                </button>
              </>
            )}
            
            <button
              onClick={() => setShowMenuModal(false)}
              className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              data-testid="button-cancel-menu"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admin Dashboard Modal - Only render for admin/instructor users */}
      {(user?.role === 'admin' || user?.role === 'instructor') && (
        <AdminDashboard 
          isOpen={showAdminDashboard} 
          onClose={handleCloseAdminDashboard} 
        />
      )}
      
      {/* Time Simulation Modal */}
      <TimeSimulationModal 
        isOpen={showTimeSimulation} 
        onClose={handleCloseTimeSimulation} 
      />
      
      {/* User Management Modal */}
      <UserManagement 
        isOpen={showUserManagement} 
        onClose={handleCloseUserManagement} 
      />

      {/* Dose Calculator Modal */}
      <DoseCalculator
        isOpen={showDoseCalculator}
        onClose={() => setShowDoseCalculator(false)}
      />

      {/* Vitals Monitor Modal */}
      <VitalsMonitor
        isOpen={showVitalsMonitor}
        onClose={() => setShowVitalsMonitor(false)}
      />
      
      {/* Medication Alerts - Always visible */}
      <MedicationAlerts />
    </div>
  );
}