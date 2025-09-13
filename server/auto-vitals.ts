import { storage } from './storage';
import { gte, lt } from 'drizzle-orm';

// Server-side automated vitals logging service
class AutoVitalsService {
  private lastProcessedSlot: string | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    // Check every 10 seconds for 15-minute intervals
    this.intervalId = setInterval(async () => {
      await this.checkAndLogVitals();
    }, 10000);
    
    console.log('🔄 AutoVitalsService started - checking every 10 seconds for 15-minute intervals');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ AutoVitalsService stopped');
    }
  }

  private async checkAndLogVitals() {
    try {
      const now = new Date();
      const currentMinute = now.getMinutes();
      
      // Check if we're at a logging interval (00, 15, 30, 45 minutes)
      const isLoggingTime = currentMinute % 15 === 0;
      
      if (!isLoggingTime) {
        return;
      }

      // Create slot identifier (YYYY-MM-DDTHH:MM floored to 15-minute intervals)
      const slotTime = new Date(now);
      slotTime.setMinutes(Math.floor(currentMinute / 15) * 15, 0, 0);
      const currentSlot = slotTime.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      
      // Skip if we already processed this slot
      if (this.lastProcessedSlot === currentSlot) {
        return;
      }

      console.log(`🕐 Server automated vitals logging triggered for slot: ${currentSlot}`);
      
      // Get all patients
      const patients = await storage.getAllPatients();
      let loggedCount = 0;

      for (const patient of patients) {
        // Check if vitals already logged for this patient in this slot (idempotency)
        const existingVitals = await storage.getVitalsByPatientAndTimeRange(
          patient.id,
          slotTime,
          new Date(slotTime.getTime() + 15 * 60 * 1000) // 15 minutes later
        );

        const hasSystemAutoEntry = existingVitals.some(v => v.takenBy === 'system-auto');
        
        if (hasSystemAutoEntry) {
          console.log(`⏭️ Skipping patient ${patient.id} - already has system-auto vitals for slot ${currentSlot}`);
          continue;
        }

        // Generate realistic vitals for this patient
        // For infants (under 1 year), only generate HR and Temperature
        const vitalData = {
          patientId: patient.id,
          pulse: patient.age < 1 ? 
            (125 + Math.floor(Math.random() * 16)) : // 125-140 bpm for infants
            (65 + Math.floor(Math.random() * 15)), // 65-80 bpm for adults
          temperature: (97.0 + Math.random() * 2.5).toFixed(1), // 97.0-99.5°F
          respirationRate: patient.age < 1 ? 0 : (15 + Math.floor(Math.random() * 5)), // 0 for infants, 15-19 for adults
          bloodPressureSystolic: patient.age < 1 ? 0 : (110 + Math.floor(Math.random() * 20)), // 0 for infants, 110-130 for adults
          bloodPressureDiastolic: patient.age < 1 ? 0 : (70 + Math.floor(Math.random() * 10)), // 0 for infants, 70-80 for adults
          oxygenSaturation: patient.age < 1 ? null : (97 + Math.floor(Math.random() * 3)), // null for infants, 97-99% for adults
          notes: `Automated background vitals monitoring - recorded at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          takenBy: 'system-auto'
        };

        try {
          await storage.createVitals(vitalData);
          loggedCount++;
          console.log(`✅ Server logged vitals for patient ${patient.id} at slot ${currentSlot}`);
        } catch (error) {
          console.error(`❌ Failed to log vitals for patient ${patient.id}:`, error);
        }
      }

      // Mark this slot as processed
      this.lastProcessedSlot = currentSlot;
      console.log(`🎯 Server automated vitals logging completed for slot ${currentSlot} - logged for ${loggedCount} patients`);

    } catch (error) {
      console.error('❌ Error in AutoVitalsService.checkAndLogVitals:', error);
    }
  }
}

// Export singleton instance
export const autoVitalsService = new AutoVitalsService();