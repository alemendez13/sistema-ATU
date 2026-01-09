/* providers/ResourceMonitorProvider.tsx */
"use client";
import { useEffect, useState } from "react";
import { monitor } from "../lib/monitor-core";
import EmergencyScreen from "../components/system/EmergencyScreen";

export default function ResourceMonitorProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const unsubscribe = monitor.subscribe((lockedState) => {
      setIsLocked(lockedState);
    });
    
    // 👇 CORRECCIÓN AQUÍ: Agregamos llaves { } para asegurar retorno void
    return () => { unsubscribe(); }; 
    
  }, []);

  if (isLocked) {
    return <EmergencyScreen />;
  }

  return <>{children}</>;
}