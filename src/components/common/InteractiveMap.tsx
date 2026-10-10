import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Layers,
  Building,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { RepairItem, Village } from '../../types';
import { getVillages } from '../../db/storage';

interface InteractiveMapProps {
  mode: 'pin' | 'view' | 'heatmap';
  initialCoords?: { lat: number; lng: number };
  onLocationSelect?: (coords: { lat: number; lng: number; addressText?: string; villageNo?: number }) => void;
  repairs?: RepairItem[];
  villages?: Village[];
  selectedRepairId?: string;
  onSelectRepair?: (repair: RepairItem) => void;
  height?: string;
}

// องค์การบริหารส่วนตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง
export const ANG_KAEO_HQ = {
  lat: 14.654921598327167,
  lng: 100.39316582600223,
  name: 'ที่ทำการองค์การบริหารส่วนตำบลอ่างแก้ว',
};

// Create custom SVG Leaflet div icons to guarantee perfect rendering in Vite without 404 image issues
const createPinIcon = (color: string = '#2563eb', label?: string) => {
  return L.divIcon({
    className: 'custom-osm-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: ${color}; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid white;">
          <div style="transform: rotate(45deg); font-weight: bold; font-size: 13px;">📍</div>
        </div>
        ${label ? `<div style="background: rgba(15,23,42,0.85); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; margin-top: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${label}</div>` : ''}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
};

const createHqIcon = () => {
  return L.divIcon({
    className: 'custom-osm-hq-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: #d97706; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(217,119,6,0.6); border: 3px solid white;">
          <span style="font-size: 18px;">🏛️</span>
        </div>
        <div style="background: #1e3a8a; color: white; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; white-space: nowrap; margin-top: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid #60a5fa;">
          อบต.อ่างแก้ว (HQ)
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
};

const createRepairIcon = (urgency: string, status: string, category: string) => {
  let bg = '#2563eb';
  let emoji = '🔧';

  if (status === 'completed') {
    bg = '#059669';
    emoji = '✅';
  } else if (urgency === 'ด่วนที่สุด') {
    bg = '#dc2626';
    emoji = '🚨';
  } else if (urgency === 'ด่วน') {
    bg = '#ea580c';
    emoji = '⚠️';
  }

  if (category.includes('ไฟฟ้า')) emoji = '💡';
  else if (category.includes('ประปา')) emoji = '💧';
  else if (category.includes('ถนน')) emoji = '🚧';

  return L.divIcon({
    className: 'custom-osm-repair-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: ${bg}; color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid white;">
          <div style="transform: rotate(45deg); font-size: 13px;">${emoji}</div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const createVillageIcon = (no: number, name: string) => {
  return L.divIcon({
    className: 'custom-osm-village-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
        <div style="background-color: #0284c7; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1.5px solid white; font-weight: bold; font-size: 11px;">
          ${no}
        </div>
        <div style="background: rgba(255,255,255,0.9); color: #0f172a; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; white-space: nowrap; margin-top: 2px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ม.${no}
        </div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  mode = 'pin',
  initialCoords,
  onLocationSelect,
  repairs = [],
  villages: propVillages,
  selectedRepairId,
  onSelectRepair,
  height = '380px',
}) => {
  const activeVillages = propVillages || getVillages();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || { lat: ANG_KAEO_HQ.lat, lng: ANG_KAEO_HQ.lng }
  );
  const [mapLayer, setMapLayer] = useState<'osm_standard' | 'osm_hot'>('osm_standard');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Find nearest village
  const getNearestVillage = (lat: number, lng: number) => {
    if (!activeVillages || activeVillages.length === 0) {
      return { no: 1, name: 'หมู่ที่ 1 บ้านอ่างแก้ว' };
    }
    let nearest = activeVillages[0];
    let minDistance = 999999;
    for (const v of activeVillages) {
      const d = Math.hypot((v.lat ?? ANG_KAEO_HQ.lat) - lat, (v.lng ?? ANG_KAEO_HQ.lng) - lng);
      if (d < minDistance) {
        minDistance = d;
        nearest = v;
      }
    }
    return nearest;
  };

  // Initialize Leaflet Map with OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const startLat = initialCoords?.lat || ANG_KAEO_HQ.lat;
      const startLng = initialCoords?.lng || ANG_KAEO_HQ.lng;

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 14,
        zoomControl: false, // We'll render modern custom zoom controls
        attributionControl: true,
      });

      // OpenStreetMap standard tile layer
      const osmTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | อบต.อ่างแก้ว',
      });
      osmTileLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Handle map click in 'pin' mode
      if (mode === 'pin') {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          const cleanLat = parseFloat(lat.toFixed(6));
          const cleanLng = parseFloat(lng.toFixed(6));
          setCurrentCoords({ lat: cleanLat, lng: cleanLng });

          const nearest = getNearestVillage(cleanLat, cleanLng);
          if (onLocationSelect) {
            onLocationSelect({
              lat: cleanLat,
              lng: cleanLng,
              villageNo: nearest.no,
              addressText: `พิกัด OpenStreetMap (${cleanLat}, ${cleanLng}) ใกล้ ${nearest.name} ต.อ่างแก้ว`,
            });
          }
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync coords changes with initialCoords
  useEffect(() => {
    if (initialCoords && (initialCoords.lat !== currentCoords.lat || initialCoords.lng !== currentCoords.lng)) {
      setCurrentCoords(initialCoords);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([initialCoords.lat, initialCoords.lng], mapInstanceRef.current.getZoom());
      }
    }
  }, [initialCoords]);

  // Update Markers when mode, coords, or repairs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 1. Always display องค์การบริหารส่วนตำบลอ่างแก้ว (HQ) Landmark
    const hqMarker = L.marker([ANG_KAEO_HQ.lat, ANG_KAEO_HQ.lng], {
      icon: createHqIcon(),
      zIndexOffset: 1000,
    }).bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 2px;">
        <strong style="color: #1e3a8a; font-size: 13px;">🏛️ ที่ทำการ อบต.อ่างแก้ว</strong><br/>
        ตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง<br/>
        <span style="font-size: 11px; color: #64748b; font-family: monospace;">พิกัด GPS: ${ANG_KAEO_HQ.lat.toFixed(6)}, ${ANG_KAEO_HQ.lng.toFixed(6)}</span>
      </div>
    `);
    layer.addLayer(hqMarker);

    // 2. Display Villages Landmarks (ม.1 - ม.6)
    activeVillages.forEach((v) => {
      if (v.lat && v.lng) {
        const vilMarker = L.marker([v.lat, v.lng], {
          icon: createVillageIcon(v.no, v.name),
        }).bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #0369a1;">${v.name}</strong><br/>
            ${v.description || 'เขตรับผิดชอบ อบต.อ่างแก้ว'}<br/>
            <span style="font-size: 10px; color: #64748b;">(ม.${v.no} ต.อ่างแก้ว อ.โพธิ์ทอง)</span>
          </div>
        `);
        layer.addLayer(vilMarker);
      }
    });

    // 3. Render according to Mode
    if (mode === 'pin') {
      const pin = L.marker([currentCoords.lat, currentCoords.lng], {
        icon: createPinIcon('#2563eb', 'จุดแจ้งเหตุ'),
        draggable: true,
        zIndexOffset: 2000,
      });

      pin.on('dragend', () => {
        const pos = pin.getLatLng();
        const cleanLat = parseFloat(pos.lat.toFixed(6));
        const cleanLng = parseFloat(pos.lng.toFixed(6));
        setCurrentCoords({ lat: cleanLat, lng: cleanLng });

        const nearest = getNearestVillage(cleanLat, cleanLng);
        if (onLocationSelect) {
          onLocationSelect({
            lat: cleanLat,
            lng: cleanLng,
            villageNo: nearest.no,
            addressText: `พิกัด GPS (${cleanLat}, ${cleanLng}) ใกล้ ${nearest.name} ต.อ่างแก้ว`,
          });
        }
      });

      layer.addLayer(pin);
      pinMarkerRef.current = pin;
    } else if (mode === 'view' || mode === 'heatmap') {
      // Plot all repair incidents
      repairs.forEach((r) => {
        const coords = r.coordinates || ANG_KAEO_HQ;
        const marker = L.marker([coords.lat, coords.lng], {
          icon: createRepairIcon(r.urgency, r.status, r.category),
          zIndexOffset: r.id === selectedRepairId ? 3000 : 500,
        });

        const statusColor = r.status === 'completed' ? '#059669' : r.status === 'in_progress' ? '#d97706' : '#2563eb';
        const statusText = r.status === 'completed' ? 'ซ่อมเสร็จแล้ว' : r.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';

        const popupHtml = `
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #1e3a8a; font-size: 13px;">${r.ticketId}</strong>
              <span style="background: ${statusColor}20; color: ${statusColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">
                ${statusText}
              </span>
            </div>
            <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">${r.category}</div>
            <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">${r.locationAddress || `หมู่ที่ ${r.villageNo}`}</div>
            <div style="color: #64748b; font-size: 11px;">ความเร่งด่วน: <strong style="color: #e11d48;">${r.urgency}</strong></div>
            <div style="color: #64748b; font-size: 10px; margin-top: 4px;">ผู้แจ้ง: ${r.reporterName} (${r.reporterPhone})</div>
          </div>
        `;

        marker.bindPopup(popupHtml);

        if (onSelectRepair) {
          marker.on('click', () => onSelectRepair(r));
        }

        layer.addLayer(marker);

        if (r.id === selectedRepairId) {
          marker.openPopup();
        }
      });
    }
  }, [mode, currentCoords, repairs, selectedRepairId, activeVillages]);

  // Jump to องค์การบริหารส่วนตำบลอ่างแก้ว HQ
  const handleResetToHq = () => {
    setCurrentCoords({ lat: ANG_KAEO_HQ.lat, lng: ANG_KAEO_HQ.lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([ANG_KAEO_HQ.lat, ANG_KAEO_HQ.lng], 16);
    }
    const nearest = getNearestVillage(ANG_KAEO_HQ.lat, ANG_KAEO_HQ.lng);
    if (onLocationSelect) {
      onLocationSelect({
        lat: ANG_KAEO_HQ.lat,
        lng: ANG_KAEO_HQ.lng,
        villageNo: 1,
        addressText: 'ที่ทำการองค์การบริหารส่วนตำบลอ่างแก้ว หมู่ที่ 1 ตำบลอ่างแก้ว อำเภอโพธิ์ทอง',
      });
    }
  };

  // Get current device GPS location
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setCurrentCoords({ lat, lng });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }

        const nearest = getNearestVillage(lat, lng);
        if (onLocationSelect) {
          onLocationSelect({
            lat,
            lng,
            villageNo: nearest.no,
            addressText: `พิกัด GPS จริง (${lat}, ${lng}) ใกล้ ${nearest.name} ตำบลอ่างแก้ว`,
          });
        }
      },
      () => {
        setGpsLoading(false);
        handleResetToHq();
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-xs bg-slate-100 flex flex-col">
      {/* Top Map Info Header */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs z-10 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-600 rounded-md">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-100">
            แผนที่แจ้งซ่อม OpenStreetMap • อบต.อ่างแก้ว
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-blue-300 border border-slate-700 font-mono">
            GPS: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleResetToHq}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition shadow-xs cursor-pointer text-[11px]"
            title="ขยับกลับไปยังที่ทำการ อบต.อ่างแก้ว (GPS: 14.654922, 100.393166)"
          >
            <Building className="w-3 h-3" />
            <span>ไปที่ทำการ อบต.</span>
          </button>

          {mode === 'pin' && (
            <button
              type="button"
              disabled={gpsLoading}
              onClick={handleUseCurrentLocation}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-xs cursor-pointer text-[11px]"
              title="ดึงพิกัด GPS อัตโนมัติจากอุปกรณ์ของคุณ"
            >
              <Navigation className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'กำลังค้นหา...' : 'GPS ปัจจุบัน'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real Leaflet OpenStreetMap Container */}
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="w-full z-0 relative focus:outline-none"
      />

      {/* Floating Map Controls (Zoom In/Out) */}
      <div className="absolute right-3 top-14 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
          title="ซูมเข้า"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
          title="ซูมออก"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom helper text for Mode */}
      <div className="bg-white/95 px-3.5 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          {mode === 'pin' ? (
            <>
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                คลิกบนแผนที่ OpenStreetMap หรือลากหมุดเพื่อระบุตำแหน่งชำรุด
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-700 font-semibold">
                แสดงจุดเกิดเหตุทั้งหมด {repairs.length} งาน ในเขตตำบลอ่างแก้ว
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> ด่วนที่สุด
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> ด่วน
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> ซ่อมแล้ว
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span> อบต.อ่างแก้ว
          </span>
        </div>
      </div>
    </div>
  );
};
