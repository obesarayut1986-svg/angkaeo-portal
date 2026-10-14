import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Building,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Info,
  Maximize2,
  Minimize2,
  Crosshair,
  Compass,
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

// Create custom SVG Leaflet div icons
const createPinIcon = (color: string = '#2563eb', label: string = 'จุดแจ้งซ่อม') => {
  return L.divIcon({
    className: 'custom-osm-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto;">
        <div style="background-color: ${color}; color: white; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37,99,235,0.6); border: 3px solid white; animation: bouncePin 1s ease-in-out;">
          <div style="transform: rotate(45deg); font-weight: bold; font-size: 16px;">📍</div>
        </div>
        <div style="background: #1e3a8a; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; white-space: nowrap; margin-top: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.4);">
          ${label}
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
};

const createHqIcon = () => {
  return L.divIcon({
    className: 'custom-osm-hq-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: #d97706; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(217,119,6,0.6); border: 3px solid white;">
          <span style="font-size: 17px;">🏛️</span>
        </div>
        <div style="background: #1e3a8a; color: white; padding: 2px 6px; border-radius: 5px; font-size: 10px; font-weight: bold; white-space: nowrap; margin-top: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid #60a5fa;">
          อบต.อ่างแก้ว
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
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
        <div style="background: rgba(255,255,255,0.95); color: #0f172a; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; white-space: nowrap; margin-top: 2px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
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
  height = '360px',
}) => {
  const activeVillages = propVillages || getVillages();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || { lat: ANG_KAEO_HQ.lat, lng: ANG_KAEO_HQ.lng }
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinSuccessNotice, setPinSuccessNotice] = useState<string | null>(null);

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

  // Helper to apply new coordinates
  const applyCoordinates = (lat: number, lng: number, customLabel?: string) => {
    const cleanLat = parseFloat(lat.toFixed(6));
    const cleanLng = parseFloat(lng.toFixed(6));
    setCurrentCoords({ lat: cleanLat, lng: cleanLng });

    const nearest = getNearestVillage(cleanLat, cleanLng);
    const text = customLabel || `พิกัด GPS (${cleanLat}, ${cleanLng}) ใกล้ ${nearest.name} ต.อ่างแก้ว`;

    if (onLocationSelect) {
      onLocationSelect({
        lat: cleanLat,
        lng: cleanLng,
        villageNo: nearest.no,
        addressText: text,
      });
    }

    setPinSuccessNotice(`ปักหมุดแล้ว: ${nearest.name} (${cleanLat}, ${cleanLng})`);
    setTimeout(() => setPinSuccessNotice(null), 4000);
  };

  const applyCoordsRef = useRef(applyCoordinates);
  applyCoordsRef.current = applyCoordinates;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const startLat = initialCoords?.lat || ANG_KAEO_HQ.lat;
      const startLng = initialCoords?.lng || ANG_KAEO_HQ.lng;

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: true,
        // Disable Leaflet synthetic tap which swallows touch clicks on mobile Android/iOS
        tap: false,
      } as any);

      // OpenStreetMap Standard Tiles
      const osmTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | อบต.อ่างแก้ว',
      });
      osmTileLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Handle Map Click for Pin Mode
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (modeRef.current === 'pin') {
          applyCoordsRef.current(e.latlng.lat, e.latlng.lng);
        }
      });

      // Direct mobile touch fallback (in-app browsers like Messenger/Line often don't trigger click)
      const container = mapContainerRef.current;
      let touchStartTime = 0;
      let touchStartX = 0;
      let touchStartY = 0;

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          touchStartTime = Date.now();
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (e.changedTouches.length === 1 && Date.now() - touchStartTime < 700) {
          const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
          const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
          if (dx < 24 && dy < 24 && mapInstanceRef.current && modeRef.current === 'pin') {
            const rect = container?.getBoundingClientRect();
            if (rect) {
              const x = e.changedTouches[0].clientX - rect.left;
              const y = e.changedTouches[0].clientY - rect.top;
              const latlng = mapInstanceRef.current.containerPointToLatLng([x, y]);
              if (latlng) {
                applyCoordsRef.current(latlng.lat, latlng.lng);
              }
            }
          }
        }
      };

      container?.addEventListener('touchstart', onTouchStart, { passive: true });
      container?.addEventListener('touchend', onTouchEnd, { passive: true });

      // Invalidate size on load to guarantee pixel-accurate clicks
      const initTimer = setTimeout(() => {
        if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {
            // Container unmounted or detached
          }
        }
      }, 250);

      return () => {
        clearTimeout(initTimer);
        container?.removeEventListener('touchstart', onTouchStart);
        container?.removeEventListener('touchend', onTouchEnd);
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {
            // Safe teardown
          }
          mapInstanceRef.current = null;
        }
      };
    }
  }, []);

  // Invalidate size on fullscreen toggle or window resize
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // Safe handling
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Sync coords changes with initialCoords
  useEffect(() => {
    if (initialCoords && (initialCoords.lat !== currentCoords.lat || initialCoords.lng !== currentCoords.lng)) {
      setCurrentCoords(initialCoords);
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
        try {
          mapInstanceRef.current.setView([initialCoords.lat, initialCoords.lng], mapInstanceRef.current.getZoom());
        } catch {
          // Safe handling
        }
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
        <span style="font-size: 11px; color: #64748b; font-family: monospace;">GPS: ${ANG_KAEO_HQ.lat.toFixed(6)}, ${ANG_KAEO_HQ.lng.toFixed(6)}</span>
      </div>
    `);
    layer.addLayer(hqMarker);

    // 2. Display Villages Landmarks (ม.1 - ม.6)
    activeVillages.forEach((v) => {
      if (v.lat && v.lng) {
        const vilMarker = L.marker([v.lat, v.lng], {
          icon: createVillageIcon(v.no, v.name),
        });

        vilMarker.on('click', () => {
          if (mode === 'pin') {
            applyCoordinates(v.lat!, v.lng!, `ม.${v.no} ${v.name} ตำบลอ่างแก้ว`);
            map.flyTo([v.lat!, v.lng!], 16);
          }
        });

        layer.addLayer(vilMarker);
      }
    });

    // 3. Render according to Mode
    if (mode === 'pin') {
      const nearest = getNearestVillage(currentCoords.lat, currentCoords.lng);
      const pin = L.marker([currentCoords.lat, currentCoords.lng], {
        icon: createPinIcon('#2563eb', `จุดซ่อม: ${nearest.name}`),
        draggable: true,
        zIndexOffset: 3000,
      });

      pin.on('dragend', () => {
        const pos = pin.getLatLng();
        applyCoordinates(pos.lat, pos.lng);
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
    applyCoordinates(ANG_KAEO_HQ.lat, ANG_KAEO_HQ.lng, 'ที่ทำการ อบต.อ่างแก้ว (GPS: 14.654922, 100.393166)');
    if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
      try {
        mapInstanceRef.current.flyTo([ANG_KAEO_HQ.lat, ANG_KAEO_HQ.lng], 16);
      } catch {
        // Safe handling
      }
    }
  };

  // Pin at Current Map Center
  const handlePinAtCenter = () => {
    if (!mapInstanceRef.current || !(mapInstanceRef.current as any)._mapPane) return;
    try {
      const center = mapInstanceRef.current.getCenter();
      applyCoordinates(center.lat, center.lng);
    } catch {
      // Safe handling
    }
  };

  // Jump to specific village
  const handleSelectVillage = (v: Village) => {
    if (!v.lat || !v.lng) return;
    applyCoordinates(v.lat, v.lng, `ม.${v.no} ${v.name} ต.อ่างแก้ว`);
    if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
      try {
        mapInstanceRef.current.flyTo([v.lat, v.lng], 16);
      } catch {
        // Safe handling
      }
    }
  };

  // Get current device GPS location
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setGpsNotice('เบราว์เซอร์ไม่รองรับ GPS แนะนำแตะบนแผนที่ หรือเลือกหมู่บ้านด้านล่างเพื่อปักหมุด');
      setTimeout(() => setGpsNotice(null), 6000);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setGpsNotice(null);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        applyCoordinates(lat, lng, `พิกัด GPS จริง (${lat}, ${lng}) ต.อ่างแก้ว`);

        if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
          try {
            mapInstanceRef.current.flyTo([lat, lng], 17);
          } catch {
            // Safe handling
          }
        }
      },
      (err) => {
        setGpsLoading(false);
        console.warn('Geolocation error:', err);
        setGpsNotice('ไม่สามารถดึงพิกัดจาก GPS ได้ (ปิดการระบุตำแหน่ง หรืออยู่ในแอป Messenger) กรุณาแตะบนแผนที่ หรือเลื่อนแล้วกดปุ่ม "ปักหมุดตรงนี้"');
        setTimeout(() => setGpsNotice(null), 8000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const nearestVillage = getNearestVillage(currentCoords.lat, currentCoords.lng);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100 flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-none h-screen w-screen'
          : ''
      }`}
    >
      {/* Top Map Info Header */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs z-10 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 bg-blue-600 rounded-md shrink-0">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-100 truncate">
            {mode === 'pin' ? 'แตะบนแผนที่เพื่อปักหมุดจุดชำรุด' : 'แผนที่จุดแจ้งซ่อม อบต.อ่างแก้ว'}
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-blue-300 border border-slate-700 font-mono shrink-0">
            {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {mode === 'pin' && (
            <>
              <button
                type="button"
                disabled={gpsLoading}
                onClick={handleUseCurrentLocation}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-lg transition shadow-xs cursor-pointer text-[11px]"
                title="ดึงพิกัด GPS อัตโนมัติจากอุปกรณ์ของคุณ"
              >
                <Navigation className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">{gpsLoading ? 'ค้นหา...' : 'GPS ของฉัน'}</span>
              </button>

              <button
                type="button"
                onClick={handlePinAtCenter}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg transition shadow-xs cursor-pointer text-[11px]"
                title="ปักหมุดตรงจุดกึ่งกลางของแผนที่ที่กำลังมองอยู่"
              >
                <Crosshair className="w-3 h-3" />
                <span>ปักหมุดตรงนี้</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleResetToHq}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition border border-slate-700 cursor-pointer text-[11px]"
            title="ขยับกลับไปยังที่ทำการ อบต.อ่างแก้ว"
          >
            <Building className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">อบต.</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700 cursor-pointer"
            title={isFullscreen ? 'ย่อหน้าต่างกลับ' : 'ขยายแผนที่เต็มจอ (สะดวกบนมือถือ)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Non-blocking GPS Warning / Helper Banner */}
      {gpsNotice && (
        <div className="bg-amber-500 text-slate-950 px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 z-20 border-b border-amber-600 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span>{gpsNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsNotice(null)}
            className="px-2 py-0.5 bg-slate-950/20 hover:bg-slate-950/30 rounded text-[10px] font-bold shrink-0"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Floating Success Notification Toast */}
      {pinSuccessNotice && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{pinSuccessNotice}</span>
        </div>
      )}

      {/* Real Leaflet OpenStreetMap Container */}
      <div className="relative w-full z-0">
        <div
          ref={mapContainerRef}
          style={{ height: isFullscreen ? 'calc(100vh - 120px)' : height }}
          className="w-full focus:outline-none cursor-crosshair touch-manipulation"
        />

        {/* Floating Center Reticle Crosshair (Helper for Pinning on Mobile) */}
        {mode === 'pin' && (
          <>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-blue-600 flex items-center justify-center opacity-85 bg-blue-500/10 shadow-xs">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
              </div>
            </div>

            {/* Floating Mobile Center Pin Button directly over bottom of map */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={handlePinAtCenter}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-full shadow-xl border-2 border-white transition cursor-pointer text-xs"
              >
                <Crosshair className="w-4 h-4" />
                <span>📍 ปักหมุดตรงจุดกึ่งกลางนี้</span>
              </button>
            </div>
          </>
        )}
      </div>

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

      {/* Quick Village Selector Bar (Especially helpful on Mobile phones) */}
      {mode === 'pin' && (
        <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] z-10">
          <span className="text-slate-500 font-semibold shrink-0 flex items-center gap-1">
            <Compass className="w-3 h-3 text-blue-600" />
            <span>ไปที่หมู่:</span>
          </span>
          {activeVillages.map((v) => (
            <button
              key={v.id || v.no}
              type="button"
              onClick={() => handleSelectVillage(v)}
              className={`px-2 py-0.5 rounded-md font-medium shrink-0 transition cursor-pointer border ${
                nearestVillage.no === v.no
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              ม.{v.no} {v.name.replace(/หมู่ที่\s*\d+\s*/, '')}
            </button>
          ))}
        </div>
      )}

      {/* Bottom status bar */}
      <div className="bg-white px-3.5 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2 z-10">
        <div className="flex items-center gap-2">
          {mode === 'pin' ? (
            <div className="text-blue-900 font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse inline-block" />
              <span>
                ปักหมุดแล้วที่: <strong className="text-blue-700">{nearestVillage.name}</strong> ({currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)})
              </span>
            </div>
          ) : (
            <span className="text-slate-700 font-semibold">
              แสดงจุดเกิดเหตุทั้งหมด {repairs.length} งาน ในเขตตำบลอ่างแก้ว
            </span>
          )}
        </div>

        {isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-xs shadow-xs cursor-pointer"
          >
            ✓ เสร็จสิ้น บันทึกจุดนี้
          </button>
        )}

        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
          <span className="hidden sm:inline text-slate-400">💡 แตะที่จุดใดก็ได้บนแผนที่เพื่อเปลี่ยนตำแหน่งทันที</span>
        </div>
      </div>
    </div>
  );
};
