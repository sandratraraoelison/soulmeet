import * as SecureStore from 'expo-secure-store';
import { tokenStorage } from '../token-storage.service';
describe('tokenStorage', () => {
  it('stores both tokens securely and clears them', async () => {
    await tokenStorage.save({
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    await tokenStorage.clear();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
