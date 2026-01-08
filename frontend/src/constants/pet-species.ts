export const PET_SPECIES = [
  { value: 'Pies', label: 'Pies' },
  { value: 'Kot', label: 'Kot' },
  { value: 'Królik', label: 'Królik' },
  { value: 'Świnka morska', label: 'Świnka morska' },
  { value: 'Chomik', label: 'Chomik' },
  { value: 'Papuga', label: 'Papuga' },
  { value: 'Ptak (inny)', label: 'Ptak (inny)' },
  { value: 'Gad', label: 'Gad (jaszczurka/wąż)' },
  { value: 'Fretka', label: 'Fretka' },
  { value: 'other', label: 'Inne...' },
] as const;

export function isPredefinedSpecies(species: string): boolean {
  return PET_SPECIES.some(s => s.value === species);
}

export function getSpeciesLabel(species: string): string {
  const found = PET_SPECIES.find(s => s.value === species);
  return found ? found.label : species;
}
