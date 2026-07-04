import React, { useState, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, Pin, useAdvancedMarkerRef } from "@vis.gl/react-google-maps";
import { AttendanceRecord } from "../types";
import { MapPin, User, ShieldAlert, Clock, Compass } from "lucide-react";

interface FieldWorkerMapProps {
  attendances: AttendanceRecord[];
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

function WorkerMarker({ attendance }: { attendance: AttendanceRecord }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  const position = useMemo(() => ({
    lat: attendance.checkInLatitude,
    lng: attendance.checkInLongitude
  }), [attendance.checkInLatitude, attendance.checkInLongitude]);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={() => setOpen(true)}
        title={attendance.employeeName}
      >
        <Pin 
          background={attendance.checkOutTime ? "#64748b" : "#4f46e5"} 
          borderColor={attendance.checkOutTime ? "#475569" : "#4338ca"} 
          glyphColor="#fff" 
        />
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-2 max-w-xs text-slate-800 font-sans">
            <div className="flex items-start gap-2.5 pb-2 mb-2 border-b border-slate-200">
              {attendance.checkInPhoto ? (
                <img 
                  src={attendance.checkInPhoto} 
                  alt={attendance.employeeName} 
                  className="h-10 w-10 rounded-lg object-cover border border-slate-300 shadow-sm"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-sm text-slate-900">{attendance.employeeName}</h4>
                <p className="text-[10px] text-slate-500 font-mono">ID: {attendance.userId}</p>
                <p className="text-[10px] text-slate-500 font-medium">{attendance.officeName}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  <strong>Check-In:</strong> {attendance.checkInTime}
                </span>
              </div>
              {attendance.checkOutTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    <strong>Check-Out:</strong> {attendance.checkOutTime}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 font-mono text-[10px] text-slate-500">
                <Compass className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  GPS: {attendance.checkInLatitude.toFixed(5)}, {attendance.checkInLongitude.toFixed(5)} (±{attendance.gpsAccuracy}m)
                </span>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function FieldWorkerMap({ attendances }: FieldWorkerMapProps) {
  // Filter for records that have valid coordinates
  const validCoordinatesAttendances = useMemo(() => {
    return attendances.filter(
      (a) =>
        typeof a.checkInLatitude === "number" &&
        typeof a.checkInLongitude === "number" &&
        !isNaN(a.checkInLatitude) &&
        !isNaN(a.checkInLongitude) &&
        a.checkInLatitude !== 0 &&
        a.checkInLongitude !== 0
    );
  }, [attendances]);

  // Calculate center of map dynamically based on markers, otherwise center on India / Delhi
  const mapCenter = useMemo(() => {
    if (validCoordinatesAttendances.length > 0) {
      let totalLat = 0;
      let totalLng = 0;
      validCoordinatesAttendances.forEach((a) => {
        totalLat += a.checkInLatitude;
        totalLng += a.checkInLongitude;
      });
      return {
        lat: totalLat / validCoordinatesAttendances.length,
        lng: totalLng / validCoordinatesAttendances.length,
      };
    }
    // Default to New Delhi coordinates
    return { lat: 28.6139, lng: 77.2090 };
  }, [validCoordinatesAttendances]);

  const defaultZoom = useMemo(() => {
    return validCoordinatesAttendances.length > 0 ? 12 : 5;
  }, [validCoordinatesAttendances]);

  if (!hasValidKey) {
    return (
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto my-6">
        <div className="h-12 w-12 rounded-full bg-indigo-950/50 border border-indigo-900 flex items-center justify-center mx-auto mb-4">
          <MapPin className="h-6 w-6 text-indigo-400" />
        </div>
        <h3 className="font-display font-bold text-white text-base">Google Maps API Key Required</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          To view the live real-time distribution of field workers, you must register a Google Maps Platform API key in your environment settings.
        </p>

        <div className="mt-5 text-left bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs space-y-3 font-sans">
          <p className="font-semibold text-slate-200">Easy Setup Instructions:</p>
          <ol className="list-decimal pl-4 space-y-2 text-slate-300">
            <li>
              Get an API Key by visiting:{" "}
              <a
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Google Cloud Console
              </a>
            </li>
            <li>
              When the <strong className="text-white">"Enter your environment variable to continue"</strong> popup appears, paste your API key.
            </li>
            <li>
              Or manually: Open <strong className="text-white">Settings</strong> (⚙️ gear icon, top-right corner of AI Studio) →{" "}
              <strong className="text-white">Secrets</strong> → type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">GOOGLE_MAPS_PLATFORM_KEY</code> → paste key → press Enter.
            </li>
          </ol>
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-[11px] text-indigo-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>The application will automatically compile and enable live maps after key configuration.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 shadow-xs">
      <div className="mb-3 flex justify-between items-center">
        <div>
          <h4 className="font-display font-bold text-white text-sm">Real-time Technical Assistant Map Distribution</h4>
          <p className="text-[10px] text-slate-500">
            Visualizing {validCoordinatesAttendances.length} active GPS coordinate logs for the filtered date selection
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500 block"></span>
            <span className="text-slate-400 font-medium">Active Check-In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500 block"></span>
            <span className="text-slate-400 font-medium">Checked-Out</span>
          </div>
        </div>
      </div>

      <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-800 relative bg-slate-900">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={defaultZoom}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: "100%", height: "100%" }}
            gestureHandling="cooperative"
            disableDefaultUI={false}
          >
            {validCoordinatesAttendances.map((a) => (
              <WorkerMarker key={a.attendanceId} attendance={a} />
            ))}
          </Map>
        </APIProvider>

        {validCoordinatesAttendances.length === 0 && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <MapPin className="h-8 w-8 text-slate-500 mb-2 animate-bounce" />
            <h5 className="font-display font-semibold text-white text-xs">No GPS Data Available</h5>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
              No field workers have checked in with active GPS coordinates for this selection yet. Coordinate markers will appear automatically once logs are submitted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
