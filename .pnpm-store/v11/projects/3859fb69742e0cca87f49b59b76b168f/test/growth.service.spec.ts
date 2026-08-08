import { ConflictException } from '@nestjs/common';
import { GrowthGoalStatus } from '@prisma/client';
import { GrowthService } from '../src/modules/growth/growth.service';

describe('GrowthService', () => {
  it('creates a user-scoped goal and activity event', async () => {
    const goal = { id: 'goal-id', title: 'Build confidence' };
    const tx = {
      growthGoal: { create: jest.fn().mockResolvedValue(goal) },
      growthEvent: { create: jest.fn() },
    };
    const prisma = {
      growthGoal: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    await new GrowthService(prisma as never).createGoal('user-a', {
      title: goal.title,
      targetSteps: 5,
    });
    expect(tx.growthGoal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-a', targetSteps: 5 }),
    });
    expect(tx.growthEvent.create).toHaveBeenCalled();
  });

  it('limits users to three active goals', async () => {
    const prisma = { growthGoal: { count: jest.fn().mockResolvedValue(3) } };
    await expect(
      new GrowthService(prisma as never).createGoal('user-a', {
        title: 'Another goal',
        targetSteps: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes a goal with optimistic concurrency', async () => {
    const goal = {
      id: 'goal-id',
      userId: 'user-a',
      title: 'Goal',
      targetSteps: 3,
      completedSteps: 2,
      version: 1,
    };
    const updated = {
      ...goal,
      completedSteps: 3,
      status: GrowthGoalStatus.COMPLETED,
      version: 2,
    };
    const tx = {
      growthGoal: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      growthEvent: { create: jest.fn() },
    };
    const prisma = {
      growthGoal: { findFirst: jest.fn().mockResolvedValue(goal) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    await expect(
      new GrowthService(prisma as never).updateProgress(
        'user-a',
        goal.id,
        3,
        1,
      ),
    ).resolves.toMatchObject(updated);
    expect(tx.growthGoal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: goal.id, userId: 'user-a', version: 1 },
      }),
    );
  });

  it('does not rewrite an exercise already completed', async () => {
    const exercise = {
      id: 'exercise-id',
      userId: 'user-a',
      completedAt: new Date(),
    };
    const prisma = {
      growthExercise: { findFirst: jest.fn().mockResolvedValue(exercise) },
    };
    await expect(
      new GrowthService(prisma as never).completeExercise(
        'user-a',
        exercise.id,
      ),
    ).resolves.toBe(exercise);
  });
});
