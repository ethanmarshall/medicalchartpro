import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface NextDoseCountdownProps {
  lastAdministeredAt: string | Date;
  periodicity: string;
}

interface TimeStatus {
  currentTime: string;
  isSimulating: boolean;
  offsetHours: number;
  offsetMinutes: number;
}

export function NextDoseCountdown({ lastAdministeredAt, periodicity }: NextDoseCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isOverdue, setIsOverdue] = useState(false);
  
  // Use simulated time if available
  const { data: timeStatus } = useQuery<TimeStatus>({
    queryKey: ['/api/time-simulation/status'],
    refetchInterval: 10000,
    staleTime: 5000
  });

  useEffect(() => {
    const calculateNextDose = () => {
      const lastDose = new Date(lastAdministeredAt);
      
      if (isNaN(lastDose.getTime())) {
        setTimeLeft("Invalid date");
        return;
      }
      
      let nextDoseTime: Date;

      // Parse periodicity to determine next dose time
      const periodicityLower = periodicity.toLowerCase();
      
      // Parse "qXh" patterns (e.g., "q6h", "q12h") 
      const qHourMatch = periodicityLower.match(/q\s*(\d+)\s*(h|hr|hrs)\b/);
      
      if (qHourMatch) {
        const hours = parseInt(qHourMatch[1]);
        nextDoseTime = new Date(lastDose.getTime() + hours * 60 * 60 * 1000);
      } else if (periodicityLower.includes('every')) {
        // Handle all "every X hours/hrs/h" patterns  
        const hourMatch = periodicityLower.match(/every\s+(\d+)\s*(hours?|hrs?|h)\b/);
        // Handle range hours like "every 2-4 hours/hrs/h" - use minimum for safety
        const rangeMatch = periodicityLower.match(/every\s+(\d+)-(\d+)\s*(hours?|hrs?|h)\b/);
        
        if (hourMatch) {
          const hours = parseInt(hourMatch[1]);
          nextDoseTime = new Date(lastDose.getTime() + hours * 60 * 60 * 1000);
        } else if (rangeMatch) {
          const minHours = parseInt(rangeMatch[1]); // Use minimum for safety
          nextDoseTime = new Date(lastDose.getTime() + minHours * 60 * 60 * 1000);
        } else {
          // Default to 6 hours if we can't parse
          nextDoseTime = new Date(lastDose.getTime() + 6 * 60 * 60 * 1000);
        }
      } else if (periodicityLower.includes('daily') || periodicityLower.includes('once daily')) {
        nextDoseTime = new Date(lastDose.getTime() + 24 * 60 * 60 * 1000);
      } else if (periodicityLower.includes('twice daily')) {
        nextDoseTime = new Date(lastDose.getTime() + 12 * 60 * 60 * 1000);
      } else if (periodicityLower.includes('three times daily')) {
        nextDoseTime = new Date(lastDose.getTime() + 8 * 60 * 60 * 1000);
      } else if (periodicityLower.includes('four times daily')) {
        nextDoseTime = new Date(lastDose.getTime() + 6 * 60 * 60 * 1000);
      } else if (periodicityLower.includes('as needed') || periodicityLower.includes('as Needed')) {
        // For PRN medications, show "As Needed" instead of countdown
        setTimeLeft("As Needed");
        setIsOverdue(false);
        return;
      } else if (periodicityLower === 'once' || periodicityLower.includes('one time') || periodicityLower.includes('single dose')) {
        // For "Once" frequency medications, show "Complete" when administered
        setTimeLeft("Complete");
        setIsOverdue(false);
        return;
      } else {
        // Default to 6 hours
        nextDoseTime = new Date(lastDose.getTime() + 6 * 60 * 60 * 1000);
      }

      // Get current time - use simulation time when active, otherwise local time
      const now = timeStatus?.isSimulating && timeStatus?.currentTime 
        ? new Date(timeStatus.currentTime) 
        : new Date();
      
      const timeDiff = nextDoseTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setIsOverdue(true);
        const overdueDiff = Math.abs(timeDiff);
        const overdueHours = Math.floor(overdueDiff / (1000 * 60 * 60));
        const overdueMinutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (overdueHours > 0) {
          setTimeLeft(`${overdueHours}h ${overdueMinutes}m overdue`);
        } else {
          setTimeLeft(`${overdueMinutes}m overdue`);
        }
      } else {
        setIsOverdue(false);
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      }
    };

    calculateNextDose();
    const interval = setInterval(calculateNextDose, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastAdministeredAt, periodicity, timeStatus?.currentTime, timeStatus?.isSimulating]);

  if (periodicity.toLowerCase().includes('as needed')) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <i className="fas fa-clock mr-1"></i>
        As Needed
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
        isOverdue 
          ? 'bg-red-50 text-red-700 border-red-200' 
          : 'bg-green-50 text-green-700 border-green-200'
      }`}
      data-testid="next-dose-countdown"
    >
      <i className={`fas ${isOverdue ? 'fa-exclamation-triangle' : 'fa-clock'} mr-1`}></i>
      {timeLeft}
    </span>
  );
}