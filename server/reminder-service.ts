import { type Prescription, type Administration } from "@shared/schema";
import { storage } from "./storage";
import { timeSimulation } from "./time-simulation";

export interface MedicationReminder {
  patientId: string;
  patientName: string;
  medicationName: string;
  prescriptionId: string;
  nextDoseTime: Date;
  oneHourWarning: Date;
  route: string;
  dosage: string;
  isOverdue: boolean;
}

export interface MedicationAlert {
  id: string;
  patientName: string;
  medicationName: string;
  dose: string;
  route: string;
  type: 'warning' | 'due' | 'overdue';
  dueTime: string;
  timeUntilDue?: string;
}

export class MedicationReminderService {
  private reminders: Map<string, MedicationReminder[]> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startReminderScheduler();
  }

  /**
   * Calculate next dose time based on last administration and periodicity
   */
  private calculateNextDoseTime(lastAdministeredAt: Date | string, periodicity: string): Date {
    const lastDose = new Date(lastAdministeredAt);
    const periodicityLower = periodicity.toLowerCase();
    
    let hoursToAdd = 6; // Default to 6 hours
    
    if (periodicityLower.includes('every')) {
      const hourMatch = periodicityLower.match(/every\s+(\d+)\s+hours?/);
      if (hourMatch) {
        hoursToAdd = parseInt(hourMatch[1]);
      }
    } else if (periodicityLower.includes('once daily')) {
      hoursToAdd = 24;
    } else if (periodicityLower.includes('twice daily')) {
      hoursToAdd = 12;
    } else if (periodicityLower.includes('three times daily')) {
      hoursToAdd = 8;
    } else if (periodicityLower.includes('four times daily')) {
      hoursToAdd = 6;
    }

    return new Date(lastDose.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  /**
   * Get all active reminders for a patient
   */
  async getPatientReminders(patientId: string): Promise<MedicationReminder[]> {
    const prescriptions = await storage.getPrescriptionsByPatient(patientId);
    const administrations = await storage.getAdministrationsByPatient(patientId);
    const patient = await storage.getPatient(patientId);
    const medicines = await storage.getAllMedicines();
    
    if (!patient) return [];

    const reminders: MedicationReminder[] = [];
    const now = timeSimulation.getCurrentTime();

    for (const prescription of prescriptions) {
      // Skip "as needed" medications
      if (prescription.periodicity.toLowerCase().includes('as needed')) {
        continue;
      }

      // Find the most recent successful administration for this medication (only 'administered', not 'collected')
      const recentAdministration = administrations
        .filter(admin => admin.medicineId === prescription.medicineId && admin.status === 'administered')
        .sort((a, b) => new Date(b.administeredAt!).getTime() - new Date(a.administeredAt!).getTime())[0];

      if (recentAdministration && recentAdministration.administeredAt) {
        const nextDoseTime = this.calculateNextDoseTime(recentAdministration.administeredAt, prescription.periodicity);
        const oneHourWarning = new Date(nextDoseTime.getTime() - 60 * 60 * 1000); // 1 hour before
        const medicine = medicines.find(m => m.id === prescription.medicineId);
        
        const reminder: MedicationReminder = {
          patientId: patient.id,
          patientName: patient.name,
          medicationName: medicine?.name || 'Unknown Medication',
          prescriptionId: prescription.id,
          nextDoseTime,
          oneHourWarning,
          route: prescription.route || 'Oral',
          dosage: prescription.dosage,
          isOverdue: nextDoseTime < now
        };

        reminders.push(reminder);
      }
    }

    return reminders;
  }

  /**
   * Get all upcoming reminders (within next 2 hours)
   */
  async getAllUpcomingReminders(): Promise<MedicationReminder[]> {
    const allPatients = await storage.getAllPatients();
    const allReminders: MedicationReminder[] = [];
    
    for (const patient of allPatients) {
      const patientReminders = await this.getPatientReminders(patient.id);
      allReminders.push(...patientReminders);
    }

    const now = timeSimulation.getCurrentTime();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Filter for reminders that need attention (overdue, due now, or 1-hour warning)
    return allReminders.filter(reminder => {
      return reminder.isOverdue || 
             reminder.nextDoseTime <= twoHoursFromNow ||
             (reminder.oneHourWarning <= now && reminder.nextDoseTime > now);
    });
  }

  /**
   * Get reminders that need immediate alerts
   */
  async getAlertsToSend(): Promise<{
    overdueAlerts: MedicationReminder[];
    dueNowAlerts: MedicationReminder[];
    oneHourWarnings: MedicationReminder[];
  }> {
    const allReminders = await this.getAllUpcomingReminders();
    const now = timeSimulation.getCurrentTime();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return {
      overdueAlerts: allReminders.filter(r => r.isOverdue),
      dueNowAlerts: allReminders.filter(r => 
        !r.isOverdue && r.nextDoseTime <= fiveMinutesFromNow
      ),
      oneHourWarnings: allReminders.filter(r => 
        !r.isOverdue && 
        r.oneHourWarning <= now && 
        r.nextDoseTime > fiveMinutesFromNow
      )
    };
  }

  /**
   * Start the background reminder scheduler
   */
  private startReminderScheduler() {
    // Check every 5 minutes for reminders
    this.checkInterval = setInterval(async () => {
      try {
        await this.processReminders();
      } catch (error) {
        console.error('Error processing reminders:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Process and log reminders (in a real app, this would send notifications)
   */
  private async processReminders() {
    const alerts = await this.getAlertsToSend();
    
    if (alerts.overdueAlerts.length > 0) {
      console.log(`🚨 OVERDUE MEDICATIONS (${alerts.overdueAlerts.length}):`);
      alerts.overdueAlerts.forEach(alert => {
        console.log(`  • ${alert.patientName} - ${alert.medicationName} (${alert.dosage}, ${alert.route})`);
        console.log(`    Due: ${alert.nextDoseTime.toLocaleString()}`);
      });
    }

    if (alerts.dueNowAlerts.length > 0) {
      console.log(`⏰ DUE NOW (${alerts.dueNowAlerts.length}):`);
      alerts.dueNowAlerts.forEach(alert => {
        console.log(`  • ${alert.patientName} - ${alert.medicationName} (${alert.dosage}, ${alert.route})`);
        console.log(`    Due: ${alert.nextDoseTime.toLocaleString()}`);
      });
    }

    if (alerts.oneHourWarnings.length > 0) {
      console.log(`🔔 1-HOUR WARNING (${alerts.oneHourWarnings.length}):`);
      alerts.oneHourWarnings.forEach(alert => {
        console.log(`  • ${alert.patientName} - ${alert.medicationName} (${alert.dosage}, ${alert.route})`);
        console.log(`    Due: ${alert.nextDoseTime.toLocaleString()}`);
      });
    }
  }

  /**
   * Get all active alerts (warnings, due, overdue) for popup notifications
   */
  async getAllActiveAlerts(): Promise<MedicationAlert[]> {
    const alerts = await this.getAlertsToSend();
    const allAlerts: MedicationAlert[] = [];

    // Convert overdue alerts
    alerts.overdueAlerts.forEach(reminder => {
      allAlerts.push({
        id: `${reminder.patientId}-${reminder.prescriptionId}`,
        patientName: reminder.patientName,
        medicationName: reminder.medicationName,
        dose: reminder.dosage,
        route: reminder.route,
        type: 'overdue',
        dueTime: reminder.nextDoseTime.toISOString()
      });
    });

    // Convert due now alerts
    alerts.dueNowAlerts.forEach(reminder => {
      allAlerts.push({
        id: `${reminder.patientId}-${reminder.prescriptionId}`,
        patientName: reminder.patientName,
        medicationName: reminder.medicationName,
        dose: reminder.dosage,
        route: reminder.route,
        type: 'due',
        dueTime: reminder.nextDoseTime.toISOString()
      });
    });

    // Convert 1-hour warnings
    alerts.oneHourWarnings.forEach(reminder => {
      allAlerts.push({
        id: `${reminder.patientId}-${reminder.prescriptionId}`,
        patientName: reminder.patientName,
        medicationName: reminder.medicationName,
        dose: reminder.dosage,
        route: reminder.route,
        type: 'warning',
        dueTime: reminder.nextDoseTime.toISOString(),
        timeUntilDue: '1 hour'
      });
    });

    return allAlerts;
  }

  /**
   * Stop the reminder scheduler
   */
  public stopScheduler() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Create a singleton instance
export const reminderService = new MedicationReminderService();