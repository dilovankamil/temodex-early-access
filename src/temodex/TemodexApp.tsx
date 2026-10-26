import { useMemo, useState } from 'react';
import { ProductionGlobe } from './ProductionGlobe';
import { calculateProduction, countries, defaultInputs, indicationIds, patientInputs, sourceScenario, type PatientInputs, type ProductionInputs, type ProductionYear } from './production';
import type { IndicationId } from '../model/types';
import './temodex.css';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const number = (value: number, digits = 1) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const compactMoney = (value: number) => value >= 1e6 ? `$${number(value / 1e6, 1)}m` : value >= 1000 ? `$${number(value / 1000, 1)}k` : money(value);
const labels: Record<IndicationId, string> = { gbm: 'Glioblastoma', brainMetastasis: 'Brain metastases', opbt: 'Other primary brain tumors' };

function Field({ label, value, onChange, suffix, min = 0, max = 1e9, step = 'any', hint }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; min?: number; max?: number; step?: number | 'any'; hint?: string }) {
  return <label className="field"><span>{label}</span><div className="number-field"><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => {
    if (event.target.value === '') return;
    const next = Number(event.target.value);
    if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
  }} />{suffix && <span aria-hidden="true">{suffix}</span>}</div>{hint && <small>{hint}</small>}</label>;
}

function RevenueChart({ years, selected, onSelect }: { years: ProductionYear[]; selected: number; onSelect: (index: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 1040;
  const height = 270;
  const margin = { left: 76, right: 24, top: 24, bottom: 40 };
  const innerHeight = height - margin.top - margin.bottom;
  const ceiling = Math.max(1, ...years.map((row) => row.payment)) * 1.15;
  const step = (width - margin.left - margin.right) / years.length;
  const barWidth = Math.min(48, step * 0.58);
  const y = (value: number) => margin.top + innerHeight * (1 - value / ceiling);
  const active = years[hover ?? selected];
  return <>
    <div className="chart-readout"><span>{active.year}</span><strong>{money(active.payment)}</strong><small>{number(active.products)} products</small></div>
    <svg className="payment-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Yearly manufacturer payment. Select a year to inspect its country subtotals.">
      {Array.from({ length: 5 }, (_, i) => ceiling * i / 4).map((tick) => <g key={tick}><line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="chart-grid" /><text x={margin.left - 14} y={y(tick) + 4} textAnchor="end" className="axis-label">{compactMoney(tick)}</text></g>)}
      {years.map((row, i) => {
        const x = margin.left + step * (i + 0.5);
        const overheadHeight = innerHeight * row.overhead / ceiling;
        const costHeight = innerHeight * row.costReimbursement / ceiling;
        return <g key={row.year} className={`chart-year ${selected === i ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`${row.year}: ${money(row.payment)}, ${number(row.products)} products. Show breakdown.`} aria-pressed={selected === i} onClick={() => onSelect(i)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i); } }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
          <title>{row.year}: {money(row.payment)} total; {money(row.costReimbursement)} COGS; {money(row.overhead)} overhead</title>
          <rect x={x - step * 0.44} y={margin.top - 8} width={step * 0.88} height={innerHeight + 42} rx={8} className="year-hit-area" />
          <rect x={x - barWidth / 2} y={y(row.costReimbursement)} width={barWidth} height={costHeight} className="cost-bar" />
          <rect x={x - barWidth / 2} y={y(row.payment)} width={barWidth} height={overheadHeight} className="overhead-bar" />
          {(years.length <= 15 || i % 2 === 0 || i === years.length - 1) && <text x={x} y={height - 12} textAnchor="middle" className="axis-label year-label">{row.year}</text>}
        </g>;
      })}
    </svg>
  </>;
}

function downloadCsv(inputs: ProductionInputs, years: ProductionYear[]) {
  const lines: (string | number)[][] = [
    ['Temodex Early Access Program — development scenario'],
    ['Currency', 'USD'], ['COGS per product', inputs.cogs], ['Overhead markup %', inputs.overheadPct],
    ['Starting eligible-patient share %', inputs.coveragePct], ['Annual scale-up %', inputs.annualScalePct],
    ['Products per patient', inputs.unitsPerPatient], ['Indications', inputs.indications.map((id) => labels[id]).join('; ')],
    ['Year', 'Country', 'Population', 'Incident patients', 'Eligible patients', 'Production share %', 'Supplied patients', 'Products', 'COGS reimbursement USD', 'Overhead USD', 'Total payment USD'],
  ];
  years.forEach((year) => {
    year.countries.forEach((row) => lines.push([year.year, sourceScenario.countries[row.countryId].name, row.population, row.incidentPatients, row.eligiblePatients, year.coveragePct, row.suppliedPatients, row.products, row.costReimbursement, row.overhead, row.payment]));
    lines.push([year.year, 'TOTAL', year.population, year.incidentPatients, year.eligiblePatients, year.coveragePct, year.suppliedPatients, year.products, year.costReimbursement, year.overhead, year.payment]);
  });
  lines.push([], ['Planning estimates inherited from SI-053; editable and unvalidated for Temodex. Expected volumes are not rounded to whole products. Overhead is not net profit.']);
  const csv = lines.map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'temodex-production-scenario.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TemodexApp() {
  const [inputs, setInputs] = useState(defaultInputs);
  const [focused, setFocused] = useState('MEX');
  const [focusVersion, setFocusVersion] = useState(0);
  const [yearIndex, setYearIndex] = useState(0);
  const [search, setSearch] = useState('');
  const years = useMemo(() => calculateProduction(inputs), [inputs]);
  const selectedYear = Math.min(yearIndex, years.length - 1);
  const year = years[selectedYear];
  const focusCountry = sourceScenario.countries[focused];
  const focusRow = year.countries.find((row) => row.countryId === focused);
  const patient = inputs.patientOverrides[focused] ?? patientInputs(focusCountry);
  const mapCountries = useMemo(() => countries.map((country) => ({ ...country, enabled: inputs.countryIds.includes(country.id) })), [inputs.countryIds]);
  const available = countries.filter((country) => !inputs.countryIds.includes(country.id) && country.name.toLowerCase().includes(search.toLowerCase()));
  const update = <K extends keyof ProductionInputs>(key: K, value: ProductionInputs[K]) => setInputs((current) => ({ ...current, [key]: value }));
  const updatePatient = (patch: Partial<PatientInputs>) => setInputs((current) => ({ ...current, patientOverrides: { ...current.patientOverrides, [focused]: { ...(current.patientOverrides[focused] ?? patientInputs(focusCountry)), ...patch } } }));
  const selectCountry = (id: string) => {
    setInputs((current) => current.countryIds.includes(id) ? current : ({ ...current, countryIds: [...current.countryIds, id] }));
    setFocused(id);
    setFocusVersion((current) => current + 1);
    setSearch('');
  };
  const removeCountry = (id: string) => {
    const remaining = inputs.countryIds.filter((countryId) => countryId !== id);
    update('countryIds', remaining);
    if (focused === id) { setFocused(remaining[0] ?? 'MEX'); setFocusVersion((current) => current + 1); }
  };
  const reset = () => { setInputs(defaultInputs()); setFocused('MEX'); setFocusVersion((current) => current + 1); setYearIndex(0); setSearch(''); };

  return <div className="temodex-app">
    <header className="app-header"><div className="brand"><span className="brand-symbol" aria-hidden="true">t<span>+</span></span><div><h1>Temodex<span>Early Access Program</span></h1></div></div><div className="header-actions"><span className="dev-badge"><i />Development model</span><button type="button" className="text-button" onClick={() => downloadCsv(inputs, years)}>Export CSV <span aria-hidden="true">↗</span></button></div></header>
    <div className="model-layout">
      <aside className="controls" aria-label="Model assumptions">
        <div className="control-heading"><h2>Production assumptions</h2><button type="button" className="text-button muted" onClick={reset}>Reset</button></div>
        <section className="control-section">
          <Field label="Cost of goods / product" value={inputs.cogs} onChange={(value) => update('cogs', value)} suffix="USD" max={1e6} />
          <Field label="Overhead on COGS" value={inputs.overheadPct} onChange={(value) => update('overheadPct', value)} suffix="%" max={1000} />
          <div className="unit-payment"><span>Payment / product</span><strong>{money(inputs.cogs * (1 + inputs.overheadPct / 100))}</strong></div>
        </section>
        <section className="control-section">
          <Field label="Share of eligible patients" value={inputs.coveragePct} onChange={(value) => update('coveragePct', value)} suffix="%" max={100} step={0.1} />
          <div className="quick-values">{[0.1, 1, 5].map((value) => <button type="button" key={value} className={inputs.coveragePct === value ? 'active' : ''} aria-pressed={inputs.coveragePct === value} onClick={() => update('coveragePct', value)}>{value}%</button>)}</div>
          <Field label="Annual scale-up" value={inputs.annualScalePct} onChange={(value) => update('annualScalePct', value)} suffix="%" max={1000} hint="Growth in patient share; capped at 100%." />
          <div className="field-pair"><Field label="First supply year" value={inputs.startYear} onChange={(value) => update('startYear', Math.round(value))} min={2026} max={2100} step={1} /><label className="field"><span>Forecast</span><select value={inputs.years} onChange={(event) => update('years', +event.target.value)}>{[3, 5, 10, 15, 20].map((value) => <option value={value} key={value}>{value} years</option>)}</select></label></div>
        </section>
        <section className="control-section countries-control">
          <div className="section-heading"><h2>Countries</h2><span>{inputs.countryIds.length}</span></div>
          <div className="selected-countries">{inputs.countryIds.map((id) => <div className={`country-chip ${focused === id ? 'focused' : ''}`} key={id}><button type="button" className="country-focus" onClick={() => selectCountry(id)} aria-pressed={focused === id}><i />{sourceScenario.countries[id].name}</button><button type="button" className="remove-country" onClick={() => removeCountry(id)} aria-label={`Remove ${sourceScenario.countries[id].name}`}>×</button></div>)}</div>
          <label className="field"><span className="sr-only">Find a country</span><input type="search" placeholder="Find a country…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="field"><span className="sr-only">Add country</span><select value="" onChange={(event) => { if (event.target.value) selectCountry(event.target.value); }}><option value="" disabled>+ Add country</option>{available.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
          {search && !available.length && <small className="muted">No matching countries.</small>}
        </section>
        <section className="control-section indications-control"><h2>Indications</h2>{indicationIds.map((id) => <label className="checkbox-row" key={id}><input type="checkbox" checked={inputs.indications.includes(id)} onChange={(event) => update('indications', event.target.checked ? [...inputs.indications, id] : inputs.indications.filter((value) => value !== id))} /><span>{labels[id]}{id === 'opbt' && <small>Proxy</small>}</span></label>)}</section>
        <details className="advanced-controls"><summary>Patient & product assumptions</summary><div className="advanced-body"><p>{focusCountry.name} <span>· {patient.baseYear} population baseline</span></p><Field label={`${focusCountry.name} population`} value={patient.population} onChange={(value) => updatePatient({ population: value })} max={3e9} step={1000} /><Field label="Population growth / year" value={patient.growthPct} onChange={(value) => updatePatient({ growthPct: value })} min={-10} max={20} suffix="%" /><Field label="Accessible population" value={patient.accessPct} onChange={(value) => updatePatient({ accessPct: value })} max={100} suffix="%" />{inputs.indications.map((id) => <div className="patient-indication" key={id}><h3>{labels[id]}</h3><Field label={`${labels[id]} incidence / 100,000`} value={patient.incidence[id]} onChange={(value) => updatePatient({ incidence: { ...patient.incidence, [id]: value } })} max={100000} /><Field label={`${labels[id]} surgery eligibility`} value={patient.surgeryPct[id]} onChange={(value) => updatePatient({ surgeryPct: { ...patient.surgeryPct, [id]: value } })} max={100} suffix="%" /></div>)}<Field label="Products / supplied patient" value={inputs.unitsPerPatient} onChange={(value) => update('unitsPerPatient', value)} min={1} max={1000} step={1} /><small>Population, incidence, access and surgery assumptions are inherited from the SI-053 model and remain editable planning estimates for Temodex.</small></div></details>
      </aside>
      <main className="dashboard">
        <div className="dashboard-heading"><div><span className="eyebrow">MANUFACTURING OUTLOOK</span><h2>From patients to production.</h2></div><label className="year-picker"><span>Viewing</span><select aria-label="View forecast year" value={selectedYear} onChange={(event) => setYearIndex(+event.target.value)}>{years.map((row, i) => <option value={i} key={row.year}>{row.year}</option>)}</select></label></div>
        <div className="metrics" aria-live="polite"><div className="metric primary"><span>Yearly site payment <small>USD</small></span><strong data-testid="total-payment">{money(year.payment)}</strong><small>COGS + overhead · {year.year}</small></div><div className="metric"><span>Products supplied</span><strong data-testid="total-products">{number(year.products)}</strong><small>{number(year.coveragePct, 3)}% of {number(year.eligiblePatients, 0)} eligible patients</small></div><div className="metric"><span>Overhead amount <small>USD</small></span><strong>{money(year.overhead)}</strong><small>{number(inputs.overheadPct)}% markup on COGS</small></div></div>
        <section className="map-panel panel"><div className="panel-heading"><h2>Program footprint</h2><span className="map-legend"><i />Selected countries</span></div><div className="map-layout"><ProductionGlobe countries={mapCountries} onSelectCountry={selectCountry} focusCountryId={focused} focusVersion={focusVersion} /><div className="country-insight"><div className="eyebrow">{focusRow ? 'SELECTED COUNTRY' : 'NO COUNTRIES SELECTED'}</div><h3>{focusRow ? focusCountry.name : 'Build your program'}</h3>{focusRow ? <><span className="country-year">{year.year} · {inputs.indications.length} indication{inputs.indications.length === 1 ? '' : 's'}</span><dl><div><dt>Eligible patients</dt><dd>{number(focusRow.eligiblePatients, 0)}</dd></div><div><dt>Products supplied</dt><dd>{number(focusRow.products)}</dd></div><div><dt>Site payment</dt><dd>{money(focusRow.payment)}</dd></div></dl><span className="country-note">Population {number(focusRow.population / 1e6, 1)}m · {inputs.patientOverrides[focused] ? 'edited' : 'inherited'} assumptions</span><button type="button" className="outline-button" onClick={() => setFocusVersion((value) => value + 1)}>Recenter on {focusCountry.name} <span aria-hidden="true">↗</span></button></> : <p>Add a country from the list or select one on the globe.</p>}</div></div></section>
        <section className="chart-panel panel"><div className="panel-heading"><div><h2>Yearly site payment</h2><span className="panel-subtitle">{inputs.startYear}–{inputs.startYear + inputs.years - 1} · all selected countries · USD</span></div><div className="chart-legend"><span><i className="cost-dot" />COGS</span><span><i className="overhead-dot" />Overhead</span></div></div>{year.payment === 0 && <p className="empty-hint">Select countries and indications, then set COGS and a patient share to model production.</p>}<RevenueChart years={years} selected={selectedYear} onSelect={setYearIndex} /></section>
        <section className="breakdown-panel panel"><div className="panel-heading"><h2>Country breakdown <span className="inline-year">{year.year}</span></h2><span className="panel-subtitle">USD · expected annual volumes</span></div><div className="table-scroll"><table><thead><tr><th>Country</th><th>Eligible patients</th><th>Products</th><th>COGS</th><th>Overhead</th><th>Site payment</th></tr></thead><tbody>{year.countries.map((row) => <tr key={row.countryId} className={row.countryId === focused ? 'focused-row' : ''}><th scope="row"><button type="button" onClick={() => selectCountry(row.countryId)}>{sourceScenario.countries[row.countryId].name}</button></th><td>{number(row.eligiblePatients, 0)}</td><td>{number(row.products)}</td><td>{money(row.costReimbursement)}</td><td>{money(row.overhead)}</td><td>{money(row.payment)}</td></tr>)}</tbody><tfoot><tr><th scope="row">Total</th><td>{number(year.eligiblePatients, 0)}</td><td>{number(year.products)}</td><td>{money(year.costReimbursement)}</td><td>{money(year.overhead)}</td><td>{money(year.payment)}</td></tr></tfoot></table></div></section>
        <footer className="model-note"><p>Products = eligible patients × production share × products per patient. Payment = products × COGS × (1 + overhead%).</p><p>Development assumptions · expected volumes may be fractional · overhead is not net profit · early-access availability is a planning assumption.</p></footer>
      </main>
    </div>
  </div>;
}
