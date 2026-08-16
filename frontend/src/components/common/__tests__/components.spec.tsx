import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../Button';
import { ErrorMessage } from '../ErrorMessage';
import { Input } from '../Input';
describe('design system', () => {
  it('renders and presses a button', async () => {
    const onPress = jest.fn();
    const view = await render(<Button label="Continue" onPress={onPress} />);
    fireEvent.press(view.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('disables a loading button', async () => {
    const view = await render(<Button label="Continue" loading />);
    expect(view.getByRole('button').props.accessibilityState.disabled).toBe(
      true,
    );
  });
  it('accepts input and displays errors', async () => {
    const onChangeText = jest.fn();
    const view = await render(
      <Input label="Email" error="Required" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(view.getByDisplayValue(''), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
    expect(view.getByText('Required')).toBeTruthy();
  });
  it('renders an accessible error', async () => {
    expect(
      (await render(<ErrorMessage message="Offline" />)).getByRole('alert'),
    ).toBeTruthy();
  });
});
