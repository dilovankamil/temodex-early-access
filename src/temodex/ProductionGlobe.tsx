import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import * as d3 from 'd3';
import type { CountryAssumption, CountryId } from '../model/types';

interface ProductionGlobeProps {
  countries: CountryAssumption[];
  onSelectCountry: (countryId: CountryId) => void;
  focusCountryId: string;
  focusVersion: number;
}

type WorldFeature = { type: 'Feature'; id?: string | number; properties?: { name?: string }; geometry: unknown };
type WorldData = { type: 'FeatureCollection'; features: WorldFeature[] };

const WIDTH = 760;
const HEIGHT = 760;
const defaultCountryColor = '#aebbc2';
// Available markets should read as a neutral, quiet option: clearly distinct
// from the non-configured countries, without competing with active revenue.
const availableMarketColor = '#aebbc2';
const worldDataUrl = `${import.meta.env.BASE_URL}world.geojson`;

export function ProductionGlobe({ countries, onSelectCountry, focusCountryId, focusVersion }: ProductionGlobeProps) {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [rotation, setRotation] = useState<[number, number]>([102, -24]);
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  const animationRef = useRef(0);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ x: number; y: number; rotation: [number, number]; pointerId: number; captured: boolean } | null>(null);
  const draggedRef = useRef(false);
  const tapRef = useRef<{ feature: WorldFeature; x: number; y: number; pointerId: number } | null>(null);
  const suppressClickRef = useRef(0);

  useEffect(() => {
    let active = true;
    fetch(worldDataUrl)
      .then((response) => { if (!response.ok) throw new Error(`World map request failed (${response.status})`); return response.json() as Promise<WorldData>; })
      .then((data) => { if (active) setWorld(data); })
      .catch((error) => { console.error('Could not load bundled world geometry', error); if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!world) return;
    const country = countries.find((item) => item.id === focusCountryId);
    const feature = world.features.find((item) => String(item.id) === focusCountryId || item.properties?.name === country?.geoName);
    if (!feature) return;
    const [longitude, latitude] = d3.geoCentroid(feature as unknown as d3.GeoPermissibleObjects);
    const from = rotationRef.current;
    const target: [number, number] = [-longitude, -latitude];
    const longitudeDelta = ((target[0] - from[0] + 540) % 360) - 180;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRotation(target);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / 650);
      const eased = d3.easeCubicInOut(t);
      setRotation([from[0] + longitudeDelta * eased, from[1] + (target[1] - from[1]) * eased]);
      if (t < 1) animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
    // Selection changes drive centering; edits to country assumptions do not reset a dragged view.
  }, [world, focusCountryId, focusVersion]);

  const projection = useMemo(() => d3.geoOrthographic().translate([WIDTH / 2, HEIGHT / 2]).scale(342 * zoom).rotate(rotation).clipAngle(90).precision(0.35), [rotation, zoom]);
  const path = useMemo(() => d3.geoPath(projection), [projection]);
  const spherePath = path({ type: 'Sphere' } as d3.GeoPermissibleObjects) ?? '';
  const graticulePath = path(d3.geoGraticule10()) ?? '';
  const countryByFeature = (feature: WorldFeature) => {
    const id = String(feature.id ?? '');
    const name = feature.properties?.name ?? '';
    return countries.find((country) => country.id === id || country.geoName === name);
  };

  const fillForFeature = (feature: WorldFeature) => {
    const country = countryByFeature(feature);
    if (!country || country.accessRoute !== 'commercial') return defaultCountryColor;
    if (!country.enabled) return availableMarketColor;
    return country.id === focusCountryId ? '#087d70' : '#39bca7';
  };

  const selectFeature = (feature: WorldFeature) => {
    const country = countryByFeature(feature);
    if (country?.accessRoute === 'commercial') {
      onSelectCountry(country.id);
      return;
    }

  };

  const pointerDown = (event: PointerEvent<SVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    cancelAnimationFrame(animationRef.current);
    if (tapRef.current?.pointerId !== event.pointerId) tapRef.current = null;
    draggedRef.current = false;
    dragRef.current = { x: event.clientX, y: event.clientY, rotation, pointerId: event.pointerId, captured: false };
  };

  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 8) {
      draggedRef.current = true;
      tapRef.current = null;
      if (!drag.captured) {
        try { event.currentTarget.setPointerCapture(event.pointerId); drag.captured = true; } catch { /* no-op */ }
      }
    }
    if (!draggedRef.current) return;
    setRotation([drag.rotation[0] + dx * 0.28, Math.max(-70, Math.min(70, drag.rotation[1] - dy * 0.22))]);
  };

  const pointerUp = (event: PointerEvent<SVGElement>) => {
    const drag = dragRef.current;
    if (drag?.captured) {
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* no-op */ }
    }
    dragRef.current = null;
  };

  const handleFeaturePointerDown = (event: PointerEvent<SVGPathElement>, feature: WorldFeature) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    tapRef.current = { feature, x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  };

  const handleFeaturePointerUp = (event: PointerEvent<SVGPathElement>, feature: WorldFeature) => {
    const tap = tapRef.current;
    tapRef.current = null;
    if (!tap || tap.pointerId !== event.pointerId || tap.feature !== feature || draggedRef.current) return;
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) return;
    suppressClickRef.current = performance.now() + 450;
    selectFeature(feature);
  };

  const handleFeaturePointerCancel = (event: PointerEvent<SVGPathElement>) => {
    if (tapRef.current?.pointerId === event.pointerId) tapRef.current = null;
  };

  const handleFeatureClick = (event: React.MouseEvent<SVGPathElement>, feature: WorldFeature) => {
    event.stopPropagation();
    if (suppressClickRef.current > performance.now()) {
      suppressClickRef.current = 0;
      return;
    }
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    selectFeature(feature);
  };

  const handleFeatureKeyDown = (event: React.KeyboardEvent<SVGPathElement>, feature: WorldFeature) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectFeature(feature);
  };

  if (loadError) return <div className="country-globe globe-safe-fallback"><div className="globe-fallback" role="status"><strong>World map data unavailable</strong><span>Use the country list to continue. Reload to retry the map.</span></div></div>;
  if (!world) return <div className="country-globe globe-safe-fallback"><div className="globe-fallback globe-loading" role="status"><div className="globe-loading-orb" aria-hidden="true" /><strong>Loading map…</strong></div></div>;

  return (
    <div className="production-globe" aria-label="Interactive Temodex country globe">
      <svg
        className="svg-country-globe"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label="Drag to rotate the world. Select a country to add it to the program."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        <defs>
          <radialGradient id="si053-ocean" cx="38%" cy="30%" r="72%"><stop offset="0%" stopColor="#173f57" /><stop offset="56%" stopColor="#0a273a" /><stop offset="100%" stopColor="#04121f" /></radialGradient>
          <filter id="si053-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="11" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path className="globe-atmosphere" d={spherePath} />
        <path className="globe-ocean" d={spherePath} />
        <path className="globe-graticule" d={graticulePath} />
        <g className="globe-countries">
          {world.features.map((feature, index) => {
            const featurePath = path(feature as unknown as d3.GeoPermissibleObjects);
            if (!featurePath) return null;
            const country = countryByFeature(feature);
            const selectable = country?.accessRoute === 'commercial';
            const title = selectable
              ? `${country.name} — ${country.enabled ? 'included; click to focus' : 'click to add'}`
              : country?.name ?? feature.properties?.name ?? 'Country';
            return (
              <path
                key={String(feature.id ?? feature.properties?.name ?? index)}
                d={featurePath}
                className={`globe-country ${selectable ? 'configured selectable' : ''} ${selectable && !country?.enabled ? 'market-available' : ''} ${country?.enabled ? 'market-enabled' : ''}`}
                fill={fillForFeature(feature)}
                role={selectable ? 'button' : undefined}
                tabIndex={selectable ? 0 : undefined}
                aria-label={selectable ? title : undefined}
                onPointerDown={selectable ? (event) => handleFeaturePointerDown(event, feature) : undefined}
                onPointerUp={selectable ? (event) => handleFeaturePointerUp(event, feature) : undefined}
                onPointerCancel={selectable ? handleFeaturePointerCancel : undefined}
                onClick={selectable ? (event) => handleFeatureClick(event, feature) : undefined}
                onKeyDown={selectable ? (event) => handleFeatureKeyDown(event, feature) : undefined}
              ><title>{title}</title></path>
            );
          })}
        </g>
        <path className="globe-rim" d={spherePath} />
      </svg>
      <div className="globe-tools"><span>Drag to rotate · click to add</span><div><button type="button" aria-label="Zoom out" disabled={zoom <= 0.85} onClick={() => setZoom(Math.max(0.85, zoom - 0.2))}>−</button><button type="button" aria-label="Zoom in" disabled={zoom >= 1.85} onClick={() => setZoom(Math.min(1.85, zoom + 0.2))}>+</button></div></div>
    </div>
  );
}
