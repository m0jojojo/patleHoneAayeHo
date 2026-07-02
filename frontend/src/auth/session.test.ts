import * as SecureStore from 'expo-secure-store';
import { clearSessionToken, getSessionToken, saveSessionToken } from './session';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('session token storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves the token under a fixed key via SecureStore', async () => {
    await saveSessionToken('my-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('session_token', 'my-token');
  });

  it('reads the token back via SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('my-token');
    await expect(getSessionToken()).resolves.toBe('my-token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('session_token');
  });

  it('clears the token via SecureStore', async () => {
    await clearSessionToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('session_token');
  });
});
