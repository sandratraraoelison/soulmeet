'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { CITIES_BY_COUNTRY, COUNTRIES } from '@/lib/geo';

function matchCountry(value: string): string | null {
  const query = value.trim().toLowerCase();
  if (!query) return null;
  return COUNTRIES.find((name) => name.toLowerCase() === query) ?? null;
}

export function CountryCityFields({ defaultCountry = '', defaultCity = '', required = true }: {
  defaultCountry?: string;
  defaultCity?: string;
  required?: boolean;
}) {
  const [countryInput, setCountryInput] = useState(defaultCountry);
  const [cityInput, setCityInput] = useState(defaultCity);
  const [countryOpen, setCountryOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const countryListId = useId();
  const countryRoot = useRef<HTMLDivElement>(null);
  const countryField = useRef<HTMLInputElement>(null);
  const country = matchCountry(countryInput);
  const cities = country ? (CITIES_BY_COUNTRY[country] ?? []) : [];
  const filteredCountries = useMemo(() => {
    const query = countryInput.trim().toLowerCase();
    if (!query) return COUNTRIES.slice(0, 10);
    return COUNTRIES.filter((name) => name.toLowerCase().includes(query))
      .sort((a, b) => Number(!a.toLowerCase().startsWith(query)) - Number(!b.toLowerCase().startsWith(query)))
      .slice(0, 10);
  }, [countryInput]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!countryRoot.current?.contains(event.target as Node)) setCountryOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  useEffect(() => {
    countryField.current?.setCustomValidity(countryInput && !country ? 'Choose a country from the suggestions.' : '');
  }, [country, countryInput]);

  const selectCountry = (name: string) => {
    if (name !== country) setCityInput('');
    setCountryInput(name);
    setCountryOpen(false);
    setActiveIndex(0);
  };

  return (
    <>
      <div className="field">
        <label htmlFor="country">Country of residence</label>
        <div className="geo-combobox" ref={countryRoot}>
          <Search className="geo-combobox-search" size={17} aria-hidden="true" />
          <input
            ref={countryField}
            id="country"
            name="country"
            role="combobox"
            aria-expanded={countryOpen}
            aria-controls={countryListId}
            aria-autocomplete="list"
            aria-activedescendant={countryOpen && filteredCountries[activeIndex] ? `${countryListId}-${activeIndex}` : undefined}
            value={countryInput}
            onFocus={() => setCountryOpen(true)}
            onChange={(event) => { setCountryInput(event.target.value); setCountryOpen(true); setActiveIndex(0); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCountryOpen(true);
                setActiveIndex((index) => Math.min(index + 1, filteredCountries.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && countryOpen && filteredCountries[activeIndex]) {
                event.preventDefault();
                selectCountry(filteredCountries[activeIndex]);
              } else if (event.key === 'Escape') setCountryOpen(false);
            }}
            autoComplete="off"
            placeholder="Search for a country"
            maxLength={100}
            required={required}
          />
          <button type="button" tabIndex={-1} aria-label="Show countries" onClick={() => { setCountryOpen((open) => !open); countryField.current?.focus(); }}>
            <ChevronDown size={17} />
          </button>
          {countryOpen && (
            <div className="geo-options" id={countryListId} role="listbox">
              {filteredCountries.length ? filteredCountries.map((name, index) => (
                <button type="button" role="option" aria-selected={name === country} className={index === activeIndex ? 'active' : ''} id={`${countryListId}-${index}`} key={name} onMouseEnter={() => setActiveIndex(index)} onClick={() => selectCountry(name)}>
                  <span>{name}</span>{name === country && <Check size={16} aria-hidden="true" />}
                </button>
              )) : <p>No country found</p>}
            </div>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor="city">City of residence</label>
        <input id="city" name="city" list="city-list" value={cityInput} onChange={(event) => setCityInput(event.target.value)} autoComplete="off" placeholder={country ? 'Start typing…' : 'Select a country first'} maxLength={100} required={required} />
        <datalist id="city-list">
          {cities.map((name) => <option key={name} value={name} />)}
        </datalist>
      </div>
    </>
  );
}
