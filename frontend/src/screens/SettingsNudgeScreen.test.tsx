import { fireEvent, render } from '@testing-library/react-native';
import SettingsNudgeScreen from './SettingsNudgeScreen';

describe('SettingsNudgeScreen', () => {
  it('calls onSetPreferences when "Set preferences" is pressed', () => {
    const onSetPreferences = jest.fn();
    const { getByTestId } = render(
      <SettingsNudgeScreen onSetPreferences={onSetPreferences} onSkip={jest.fn()} />,
    );

    fireEvent.press(getByTestId('set-preferences-button'));
    expect(onSetPreferences).toHaveBeenCalled();
  });

  it('calls onSkip when "Skip for now" is pressed', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(<SettingsNudgeScreen onSetPreferences={jest.fn()} onSkip={onSkip} />);

    fireEvent.press(getByTestId('skip-nudge-button'));
    expect(onSkip).toHaveBeenCalled();
  });
});
