/**
 * Get Current User Use Case
 * Gets the currently authenticated user
 */
import { IUserRepository } from '../../repositories';
import { User } from '../../entities';
import { logger } from '../../../core/utils';

export class GetCurrentUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<User | null> {
    try {
      logger.debug('Getting current user');
      const user = await this.userRepository.getOrCreate();
      if (user) {
        logger.info(`Got user ${user.id}`);
      } else {
        logger.warn('No authenticated user found');
      }
      return user;
    } catch (error) {
      logger.error('Error in GetCurrentUserUseCase', error as Error);
      throw error;
    }
  }
}
