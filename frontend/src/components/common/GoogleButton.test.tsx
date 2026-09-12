import { fireEvent, render, screen } from '@testing-library/react-native';
import { GoogleButton } from './GoogleButton.native';

const mockSignIn = jest.fn();
const mockMutate = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useSocialAuth: () => ({ mutateAsync: mockMutate }),
}));
jest.mock('@/api/client', () => ({ getErrorMessage: () => 'Server error' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: () => mockSignIn(),
  },
  isSuccessResponse: (result: { type: string }) => result.type === 'success',
}));
jest.mock('./Button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
    'web.apps.googleusercontent.com';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID =
    'ios.apps.googleusercontent.com';
});

async function pressGoogle() {
  await render(<GoogleButton />);
  await fireEvent.press(screen.getByText('Continue with Google'));
}

it('sends the Google identity token to the existing session flow', async () => {
  mockSignIn.mockResolvedValue({
    type: 'success',
    data: { idToken: 'identity-token' },
  });
  await pressGoogle();
  expect(mockMutate).toHaveBeenCalledWith('identity-token');
});

it('does not authenticate when the user cancels', async () => {
  mockSignIn.mockResolvedValue({ type: 'cancelled', data: null });
  await pressGoogle();
  expect(mockMutate).not.toHaveBeenCalled();
});

it('shows a missing token error without opening a session', async () => {
  mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: null } });
  await pressGoogle();
  expect(
    screen.getByText('Google did not return an identity token.'),
  ).toBeTruthy();
  expect(mockMutate).not.toHaveBeenCalled();
});

it('explains missing configuration when the button is pressed', async () => {
  delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  await pressGoogle();
  expect(
    screen.getByText('Google sign-in is not configured in this app build.'),
  ).toBeTruthy();
  expect(mockSignIn).not.toHaveBeenCalled();
});
