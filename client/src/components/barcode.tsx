import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  type?: "patient" | "medication";
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export function Barcode({ 
  value, 
  type = "patient", 
  width = 2, 
  height = 100, 
  displayValue = true,
  className = ""
}: BarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: 14,
          font: "monospace",
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          fontOptions: "",
          background: "#ffffff",
          lineColor: "#000000",
          margin: 10
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [value, width, height, displayValue]);

  const typeLabel = type === "patient" ? "Patient ID" : "Medication ID";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {typeLabel}
      </span>
      <canvas 
        ref={canvasRef}
        className="border border-gray-200 dark:border-gray-700 rounded"
        data-testid={`barcode-${type}-${value}`}
      />
    </div>
  );
}

export function PrintableBarcode({ 
  value, 
  type, 
  label,
  className = ""
}: {
  value: string;
  type: "patient" | "medication";
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 p-4 bg-white text-black ${className}`}>
      <h3 className="text-lg font-bold text-center">{label}</h3>
      <Barcode 
        value={value} 
        type={type} 
        width={3} 
        height={120} 
        displayValue={true}
      />
      <div className="text-center">
        <p className="text-sm font-medium">{type === "patient" ? "Patient ID" : "Medication ID"}</p>
        <p className="text-lg font-mono font-bold">{value}</p>
      </div>
    </div>
  );
}