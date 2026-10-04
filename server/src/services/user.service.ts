import path from 'path';
import { query } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { StorageService } from './storage.service';
import { CacheService } from './cache.service';
import { UpdateProfileInput } from '../validation/user.schema';

export interface FullProfile {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  statusMessage: string | null;
  lastSeen: Date | null;
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  avatarVisibility: 'everyone' | 'contacts' | 'nobody';
  addMePolicy: 'everyone' | 'contacts' | 'nobody';
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  statusMessage: string | null;
  lastSeen: Date | null;
  isContact: boolean;
  canAdd: boolean;
}

export class UserService {
  /**
   * Retrieves the full personal profile of the authenticated user.
   */
  static async getMyProfile(userId: string): Promise<FullProfile> {
    return CacheService.getOrSet('profile:' + userId, async () => {
      const { rows } = await query<{
      user_id: string;
      username: string;
      email: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      status_message: string | null;
      last_seen: Date | null;
      last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
      avatar_visibility: 'everyone' | 'contacts' | 'nobody';
      add_me_policy: 'everyone' | 'contacts' | 'nobody';
      role: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT p.user_id, u.username, u.email, p.display_name, p.avatar_url, p.bio,
              p.status_message, p.last_seen, p.last_seen_visibility, p.avatar_visibility,
              p.add_me_policy, u.role, p.created_at, p.updated_at
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Profile not found', 'PROFILE_NOT_FOUND');
    }

    const r = rows[0];
    return {
      userId: r.user_id,
      username: r.username,
      email: r.email,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      statusMessage: r.status_message,
      lastSeen: r.last_seen,
      lastSeenVisibility: r.last_seen_visibility,
      avatarVisibility: r.avatar_visibility,
      addMePolicy: r.add_me_policy,
      role: r.role,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
    }, 300);
  }

  /**
   * Updates personal profile attributes.
   */
  static async updateProfile(userId: string, input: UpdateProfileInput): Promise<FullProfile> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.displayName !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(input.displayName);
    }
    if (input.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(input.bio);
    }
    if (input.statusMessage !== undefined) {
      fields.push(`status_message = $${idx++}`);
      values.push(input.statusMessage);
    }
    if (input.lastSeenVisibility !== undefined) {
      fields.push(`last_seen_visibility = $${idx++}`);
      values.push(input.lastSeenVisibility);
    }
    if (input.avatarVisibility !== undefined) {
      fields.push(`avatar_visibility = $${idx++}`);
      values.push(input.avatarVisibility);
    }
    if (input.addMePolicy !== undefined) {
      fields.push(`add_me_policy = $${idx++}`);
      values.push(input.addMePolicy);
    }

    if (fields.length > 0) {
      values.push(userId);
      await query(
        `UPDATE profiles 
         SET ${fields.join(', ')} 
         WHERE user_id = $${idx}`,
        values,
      );
    }

    await CacheService.del();
    await CacheService.del('profile:' + userId);
    return this.getMyProfile(userId);
  }

  /**
   * Uploads an avatar image, replaces the old file, and updates the database.
   */
  static async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<string> {
    const ext = path.extname(originalName) || '.png';
    const { publicUrl } = await StorageService.saveAvatar(fileBuffer, ext);

    // Fetch previous avatar to delete it cleanly
    const { rows } = await query<{ avatar_url: string | null }>(
      `SELECT avatar_url FROM profiles WHERE user_id = $1`,
      [userId],
    );

    const oldAvatar = rows[0]?.avatar_url;

    await query(`UPDATE profiles SET avatar_url = $1 WHERE user_id = $2`, [publicUrl, userId]);

    if (oldAvatar) {
      void StorageService.deleteFile(oldAvatar);
    }

    return publicUrl;
  }

  /**
   * Removes current avatar.
   */
  static async removeAvatar(userId: string): Promise<void> {
    const { rows } = await query<{ avatar_url: string | null }>(
      `SELECT avatar_url FROM profiles WHERE user_id = $1`,
      [userId],
    );

    const oldAvatar = rows[0]?.avatar_url;
    if (!oldAvatar) {
      throw new BadRequestError('No avatar to remove', 'NO_AVATAR');
    }

    await query(`UPDATE profiles SET avatar_url = NULL WHERE user_id = $1`, [userId]);

    void StorageService.deleteFile(oldAvatar);
  }

  /**
   * Retrieves another user's public profile respecting privacy visibility settings.
   */
  static async getPublicProfile(targetUserId: string, requesterId: string): Promise<PublicProfile> {
    const { rows: profiles } = await query<{
      user_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      status_message: string | null;
      last_seen: Date | null;
      last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
      avatar_visibility: 'everyone' | 'contacts' | 'nobody';
      add_me_policy: 'everyone' | 'contacts' | 'nobody';
    }>(
      `SELECT p.user_id, u.username, p.display_name, p.avatar_url, p.bio,
              p.status_message, p.last_seen, p.last_seen_visibility,
              p.avatar_visibility, p.add_me_policy
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1 AND u.is_active = TRUE`,
      [targetUserId],
    );

    if (profiles.length === 0) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const target = profiles[0];

    // Determine whether requester is an accepted contact
    let isContact = false;
    if (requesterId !== targetUserId) {
      const { rows: contactRows } = await query<{ status: string }>(
        `SELECT status FROM contacts 
         WHERE ((requester_id = $1 AND addressee_id = $2) 
            OR (requester_id = $2 AND addressee_id = $1))
           AND status = 'accepted'
         LIMIT 1`,
        [requesterId, targetUserId],
      );
      isContact = contactRows.length > 0;
    } else {
      isContact = true;
    }

    // Apply avatar privacy filter
    let visibleAvatar: string | null = target.avatar_url;
    if (target.avatar_visibility === 'nobody' && requesterId !== targetUserId) {
      visibleAvatar = null;
    } else if (target.avatar_visibility === 'contacts' && !isContact) {
      visibleAvatar = null;
    }

    // Apply last seen privacy filter
    let visibleLastSeen: Date | null = target.last_seen;
    if (target.last_seen_visibility === 'nobody' && requesterId !== targetUserId) {
      visibleLastSeen = null;
    } else if (target.last_seen_visibility === 'contacts' && !isContact) {
      visibleLastSeen = null;
    }

    // Can add policy
    let canAdd = true;
    if (target.add_me_policy === 'nobody' && requesterId !== targetUserId) {
      canAdd = false;
    }

    return {
      userId: target.user_id,
      username: target.username,
      displayName: target.display_name,
      avatarUrl: visibleAvatar,
      bio: target.bio,
      statusMessage: target.status_message,
      lastSeen: visibleLastSeen,
      isContact,
      canAdd,
    };
  }

  /**
   * Search users by username or display name with search rankings.
   */
  static async searchUsers(
    queryStr: string,
    requesterId: string,
    limit = 20,
  ): Promise<PublicProfile[]> {
    const formattedQuery = `%${queryStr.trim().toLowerCase()}%`;

    const { rows } = await query<{
      id: string;
    }>(
      `SELECT u.id
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.id != $1 
         AND u.is_active = TRUE
         AND (u.username ILIKE $2 OR p.display_name ILIKE $2)
       ORDER BY 
         CASE WHEN u.username ILIKE $2 THEN 0 ELSE 1 END,
         p.display_name ASC
       LIMIT $3`,
      [requesterId, formattedQuery, limit],
    );

    const profiles = await Promise.all(
      rows.map((row) => this.getPublicProfile(row.id, requesterId)),
    );

    return profiles;
  }
}
