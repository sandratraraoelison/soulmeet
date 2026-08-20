import { act, fireEvent, render } from '@testing-library/react-native';
import { LocationAutocompleteInput } from '../LocationAutocompleteInput';
import { cityOptionsForCountry } from '@/constants/location-options';

describe('LocationAutocompleteInput', () => {
  it('filters and selects a location suggestion', async () => {
    const onChangeText = jest.fn();
    const view = await render(
      <LocationAutocompleteInput
        label="City of residence"
        value="Par"
        suggestions={['London', 'Paris', 'Marseille']}
        onChangeText={onChangeText}
      />,
    );

    await act(async () => {
      fireEvent.press(view.getByLabelText('Choose City of residence'));
    });
    fireEvent.press(await view.findByLabelText('Select Paris'));

    expect(onChangeText).toHaveBeenCalledWith('Paris');
    expect(view.queryByText('London')).toBeNull();
  });
});

describe('cityOptionsForCountry', () => {
  it('returns only cities belonging to the selected country', () => {
    expect(cityOptionsForCountry('France')).toContain('Paris');
    expect(cityOptionsForCountry('France')).not.toContain('London');
    expect(cityOptionsForCountry('United Kingdom')).toContain('London');
    expect(cityOptionsForCountry('Korea')).toContain('Seoul');
  });

  it('matches country names without depending on case or accents', () => {
    expect(cityOptionsForCountry('  france  ')).toContain('Paris');
  });
});
