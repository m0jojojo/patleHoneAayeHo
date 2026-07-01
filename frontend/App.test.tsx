import { render } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  it('renders the placeholder screen without crashing', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('placeholder-screen')).toBeTruthy();
  });
});
