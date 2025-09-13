import { useState } from "react";
import { Link } from "wouter";
import { LabOrder } from "@/components/lab-order";
import { PatientScanner } from "@/components/patient-scanner";
import { PatientForm } from "@/components/patient-form";
import { PatientChart } from "@/components/patient-chart";
import { AdminDashboard } from "@/components/admin-dashboard";
import { MedicationAlerts } from "@/components/medication-alerts";
import { TimeSimulationModal } from "@/components/time-simulation";
import { AlertMenuButton } from "@/components/alert-menu-button";
import { DoseCalculator } from "@/components/dose-calculator";
import { VitalsMonitor } from "@/components/vitals-monitor";
import { type Patient } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, User } from "lucide-react";
import logoImage from "@assets/IMG_1772_1756955496751.jpeg";

export default function Home() {
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'add'>('scan');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showTimeSimulation, setShowTimeSimulation] = useState(false);
  const [showDoseCalculator, setShowDoseCalculator] = useState(false);
  const [showVitalsMonitor, setShowVitalsMonitor] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pendingAction, setPendingAction] = useState<'admin' | 'time' | ''>('');
  const [showLabOrder, setShowLabOrder] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const { user, isLoading } = useAuth();

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

  const handlePatientFound = (patient: Patient) => {
    setCurrentPatient(patient);
  };

  const handleOrderComplete = () => {
    setShowLabOrder(false);
  };

  const handleOrderTests = () => {
    // Check if user is a student - if so, show access denied
    if (user?.role === 'student') {
      setShowAccessDeniedModal(true);
    } else {
      // Allow instructors and admins to order tests
      setShowLabOrder(true);
    }
  };

  const handlePatientAdded = () => {
    setActiveTab('scan');
  };

  const handleClearPatient = () => {
    setCurrentPatient(null);
  };

  const handlePatientUpdate = (updatedPatient: Patient) => {
    setCurrentPatient(updatedPatient);
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

  const handleMenuSelection = (selection: 'admin' | 'time') => {
    setShowMenuModal(false);
    setPendingAction(selection);
    
    // Skip PIN for admin users accessing admin dashboard, and allow all users to access time simulation
    if (selection === 'admin' && user?.role === 'admin') {
      setShowAdminDashboard(true);
      setPendingAction('');
    } else if (selection === 'time') {
      setShowTimeSimulation(true);
      setPendingAction('');
    } else {
      setShowPinModal(true);
      setPin("");
    }
  };

  if (currentPatient) {
    return <PatientChart key={currentPatient.id + currentPatient.age + currentPatient.doseWeight} patient={currentPatient} onClear={handleClearPatient} onPatientUpdate={handlePatientUpdate} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-background to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-medical-border shadow-sm" data-testid="header-main">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
                <img src={logoImage} alt="MedChart Pro Logo" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-medical-text-primary">MedChart Pro</h1>
                <p className="text-xs sm:text-sm text-medical-text-muted">Patient Management System</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-medical-text-primary">MedChart</h1>
              </div>
            </Link>
            <div className="flex items-center space-x-1 sm:space-x-4">
              <Link href="/dashboard">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base" data-testid="link-dashboard">
                  <i className="fas fa-tachometer-alt mr-1 sm:mr-2"></i><span className="hidden sm:inline">Dashboard</span>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-medical-text-primary mb-2">Patient Chart System</h2>
          <p className="text-sm sm:text-base text-medical-text-secondary max-w-2xl mx-auto px-4 sm:px-0">
            Securely manage patient records, verify medications, and track administration with our comprehensive healthcare platform.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6 hover:shadow-medical-lg transition-shadow duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-medical-primary rounded-lg mb-4 mx-auto">
              <i className="fas fa-clipboard-list text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-medical-text-primary text-center mb-2">Order Testing</h3>
            <p className="text-medical-text-muted text-center text-sm mb-4">Order Lab Tests and Image Studies</p>
            <button 
              onClick={handleOrderTests}
              className="w-full bg-medical-primary hover:bg-teal-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              data-testid="button-order-testing"
            >
              Order Tests
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6 hover:shadow-medical-lg transition-shadow duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-medical-secondary rounded-lg mb-4 mx-auto">
              <i className="fas fa-user-plus text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-medical-text-primary text-center mb-2">New Patient</h3>
            <p className="text-medical-text-muted text-center text-sm mb-4">Register a new patient in the system</p>
            <button 
              onClick={() => setActiveTab('add')}
              className="w-full bg-medical-secondary hover:bg-cyan-900 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              data-testid="button-add-patient"
            >
              Add Patient
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-medical border border-medical-border p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-4 mx-auto">
              <i className="fas fa-tachometer-alt text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-medical-text-primary text-center mb-2">Patient Dashboard</h3>
            <p className="text-medical-text-muted text-center text-sm mb-4">View all patients with filtering options</p>
            <Link href="/dashboard">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200" data-testid="button-view-dashboard">
                View Dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-xl shadow-medical border border-medical-border">
          {/* Tab Navigation */}
          <div className="border-b border-medical-border">
            <nav className="flex justify-center" aria-label="Tabs">
              <button 
                onClick={() => setActiveTab('scan')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'scan' 
                    ? 'border-medical-primary text-medical-primary' 
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:border-gray-300'
                }`}
                data-testid="tab-scan"
              >
                <i className="fas fa-qrcode mr-2"></i>Scan Patient
              </button>
              <button 
                onClick={() => setActiveTab('add')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'add' 
                    ? 'border-medical-primary text-medical-primary' 
                    : 'border-transparent text-medical-text-muted hover:text-medical-text-primary hover:border-gray-300'
                }`}
                data-testid="tab-add"
              >
                <i className="fas fa-user-plus mr-2"></i>Register Patient
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'scan' ? (
              <PatientScanner onPatientFound={handlePatientFound} />
            ) : (
              <PatientForm onPatientAdded={handlePatientAdded} />
            )}
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-medical-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lock text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-medical-text-primary mb-2">
                {pendingAction === 'time' ? 'Time Simulation Access' : 'Admin Dashboard Access'}
              </h3>
              <p className="text-medical-text-secondary mb-6">
                {pendingAction === 'time' ? 'Enter PIN to access time simulation' : 'Enter PIN to access admin dashboard'}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
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
              // Student view or default when role is undefined - show ID, dose calculator, and logout
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

      {/* Lab Order Modal */}
      {showLabOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-medical-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-medical-text-primary">
                <i className="fas fa-vial mr-2"></i>Order Laboratory Tests
              </h2>
              <button
                onClick={() => setShowLabOrder(false)}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                data-testid="button-close-lab-order"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6">
              <LabOrder onOrderComplete={handleOrderComplete} />
            </div>
          </div>
        </div>
      )}
      
      {/* Access Denied Modal */}
      {showAccessDeniedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border p-6 max-w-md mx-4 w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h3>
              <p className="text-gray-600 mb-6">
                Students do not have permission to order tests. Please contact your instructor for assistance.
              </p>
              <button
                onClick={() => setShowAccessDeniedModal(false)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                data-testid="button-access-denied-ok"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Alerts - Always visible */}
      <MedicationAlerts />
    </div>
  );
}
