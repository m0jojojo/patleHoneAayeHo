// Confirms @expo/vector-icons imports and renders without throwing before any component in this
// app builds on top of it. Full on-device font rendering is confirmed later at the real-device
// verification step (once icons are actually wired into the Dashboard), rather than requiring a
// separate standalone-APK rebuild just for this package.
import { Ionicons } from '@expo/vector-icons';
import { render } from '@testing-library/react-native';

describe('@expo/vector-icons', () => {
  it('renders an Ionicons glyph without throwing', () => {
    const { toJSON } = render(<Ionicons name="flame" size={20} color="#F2542D" />);
    expect(toJSON()).toBeTruthy();
  });
});
