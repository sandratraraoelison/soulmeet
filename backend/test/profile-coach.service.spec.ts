import {
  CoachGender,
  CoachPersonality,
  Gender,
  SexualOrientation,
} from '@prisma/client';
import { CoachesService } from '../src/modules/coaches/coaches.service';
import { ProfilesService } from '../src/modules/profiles/profiles.service';

describe('Profile and coach ownership', () => {
  const profileDto = {
    firstName: 'Jane',
    birthDate: '1995-06-15',
    gender: Gender.FEMALE,
    sexualOrientation: SexualOrientation.HETEROSEXUAL,
    country: 'France',
    city: 'Paris',
  };
  const coachDto = {
    name: 'Alex',
    gender: CoachGender.NON_GENDERED,
    traits: [CoachPersonality.EMPATHETIC, CoachPersonality.FRIENDLY],
  };
  let prisma: any;
  beforeEach(() => {
    prisma = {
      profile: {
        findUnique: jest.fn(),
        create: jest.fn(({ data }) => data),
        update: jest.fn(({ data }) => data),
      },
      coach: {
        findUnique: jest.fn(),
        create: jest.fn(({ data }) => data),
        update: jest.fn(({ data }) => data),
      },
    };
  });
  it('creates and updates only the current user profile', async () => {
    const service = new ProfilesService(prisma);
    prisma.profile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: 'user-a' });
    await service.createOrUpdate('user-a', profileDto);
    await service.createOrUpdate('user-a', { city: 'Lyon' });
    expect(prisma.profile.create.mock.calls[0][0].data.userId).toBe('user-a');
    expect(prisma.profile.update.mock.calls[0][0].where).toEqual({
      userId: 'user-a',
    });
  });
  it('creates one coach scoped to the current user', async () => {
    prisma.coach.findUnique.mockResolvedValue(null);
    await new CoachesService(prisma).create('user-a', coachDto);
    expect(prisma.coach.create.mock.calls[0][0].data.userId).toBe('user-a');
  });
  it('rejects profiles younger than 19', async () => {
    const birthDate = new Date();
    birthDate.setUTCFullYear(birthDate.getUTCFullYear() - 18);
    await expect(
      new ProfilesService(prisma).createOrUpdate('user-a', {
        ...profileDto,
        birthDate: birthDate.toISOString(),
      }),
    ).rejects.toThrow('You must be at least 19 years old');
  });
  it('cannot update another user because ownership is derived from JWT user id', async () => {
    prisma.coach.findUnique.mockResolvedValue({ userId: 'user-a' });
    await new CoachesService(prisma).update('user-a', { name: 'Mine' });
    expect(prisma.coach.update.mock.calls[0][0].where).toEqual({
      userId: 'user-a',
    });
  });
});
