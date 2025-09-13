export class TimeSimulationService {
  private timeOffset: number = 0; // milliseconds to add to current time
  private isSimulating: boolean = false;

  /**
   * Determine if current date is in Daylight Saving Time (DST) for US Eastern timezone
   */
  private isDST(date: Date): boolean {
    const year = date.getUTCFullYear();
    
    // DST starts on second Sunday in March
    const marchSecondSunday = this.getNthSundayOfMonth(year, 2, 2); // March is month 2 (0-indexed)
    
    // DST ends on first Sunday in November  
    const novemberFirstSunday = this.getNthSundayOfMonth(year, 10, 0); // November is month 10
    
    const currentDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    
    return currentDate >= marchSecondSunday && currentDate < novemberFirstSunday;
  }

  /**
   * Get the Nth Sunday of a given month
   */
  private getNthSundayOfMonth(year: number, month: number, n: number): Date {
    const firstDay = new Date(year, month, 1);
    const firstSunday = 1 + (7 - firstDay.getDay()) % 7;
    return new Date(year, month, firstSunday + (n * 7));
  }

  /**
   * Get the current simulated time in US Eastern timezone
   */
  getCurrentTime(): Date {
    const utcTime = new Date();
    const simulatedUTC = new Date(utcTime.getTime() + this.timeOffset);
    
    // Apply US Eastern timezone offset
    const isDSTActive = this.isDST(simulatedUTC);
    const timezoneOffset = isDSTActive ? -4 * 60 * 60 * 1000 : -5 * 60 * 60 * 1000; // DST: -4hrs, Standard: -5hrs
    
    return new Date(simulatedUTC.getTime() + timezoneOffset);
  }

  /**
   * Jump forward in time by specified amount
   */
  jumpForward(hours: number = 0, minutes: number = 0): Date {
    const additionalOffset = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    this.timeOffset += additionalOffset;
    this.isSimulating = true;
    
    const newTime = this.getCurrentTime();
    const isDSTActive = this.isDST(new Date(new Date().getTime() + this.timeOffset));
    const tzLabel = isDSTActive ? 'EDT' : 'EST';
    console.log(`⏰ TIME JUMP: Advanced ${hours}h ${minutes}m forward to ${newTime.toLocaleString()} ${tzLabel}`);
    
    return newTime;
  }

  /**
   * Reset to real time
   */
  resetTime(): Date {
    this.timeOffset = 0;
    this.isSimulating = false;
    
    const localTime = this.getCurrentTime();
    const isDSTActive = this.isDST(new Date());
    const tzLabel = isDSTActive ? 'EDT' : 'EST';
    console.log(`🔄 TIME RESET: Back to local time ${localTime.toLocaleString()} ${tzLabel}`);
    
    return localTime;
  }

  /**
   * Get current time status
   */
  getTimeStatus(): {
    currentTime: string;
    isSimulating: boolean;
    offsetHours: number;
    offsetMinutes: number;
  } {
    const offsetHours = Math.floor(this.timeOffset / (1000 * 60 * 60));
    const offsetMinutes = Math.floor((this.timeOffset % (1000 * 60 * 60)) / (1000 * 60));
    
    // Return currentTime as ISO string but already in EST
    const estTime = this.getCurrentTime();
    
    return {
      currentTime: estTime.toISOString().replace('Z', '-05:00'), // Properly mark as EST
      isSimulating: this.isSimulating,
      offsetHours,
      offsetMinutes
    };
  }

  /**
   * Check if we're currently simulating time
   */
  isTimeSimulated(): boolean {
    return this.isSimulating;
  }

  /**
   * Get the time offset in milliseconds
   */
  getTimeOffset(): number {
    return this.timeOffset;
  }
}

// Create singleton instance
export const timeSimulation = new TimeSimulationService();