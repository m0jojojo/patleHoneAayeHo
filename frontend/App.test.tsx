import { render } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  it('renders the phone entry screen once the session check completes', async () => {
    const { findByTestId } = render(<App />);
    expect(await findByTestId('phone-entry-screen')).toBeTruthy();
  });
});
