import { query, withTransaction } from '../config/database';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors';
import { SendContactRequestInput } from '../validation/contact.schema';

export interface ContactItem {
  contactId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  statusMessage: string | null;
  lastSeen: Date | null;
  connectedAt: Date;
}

export interface ContactRequestItem {
  requestId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  createdAt: Date;
}

export class ContactService {
  /**
   * Retrieves all accepted contacts for the user.
   */
  static async getContacts(userId: string): Promise<ContactItem[]> {
    const { rows } = await query<{
      contact_id: string;
      user_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      status_message: string | null;
      last_seen: Date | null;
      connected_at: Date;
    }>(
      `SELECT c.id AS contact_id,
              u.id AS user_id,
              u.username,
              p.display_name,
              p.avatar_url,
              p.bio,
              p.status_message,
              p.last_seen,
              c.updated_at AS connected_at
       FROM contacts c
       JOIN users u ON (u.id = CASE WHEN c.requester_id = $1 THEN c.addressee_id ELSE c.requester_id END)
       JOIN profiles p ON p.user_id = u.id
       WHERE (c.requester_id = $1 OR c.addressee_id = $1)
         AND c.status = 'accepted'
         AND u.is_active = TRUE
       ORDER BY p.display_name ASC`,
      [userId],
    );

    return rows.map((r) => ({
      contactId: r.contact_id,
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      statusMessage: r.status_message,
      lastSeen: r.last_seen,
      connectedAt: r.connected_at,
    }));
  }

  /**
   * Retrieves pending incoming and outgoing contact requests.
   */
  static async getPendingRequests(userId: string): Promise<{
    incoming: ContactRequestItem[];
    outgoing: ContactRequestItem[];
  }> {
    // Incoming requests (people who want to connect with me)
    const { rows: incomingRows } = await query<{
      request_id: string;
      user_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      status_message: string | null;
      created_at: Date;
    }>(
      `SELECT c.id AS request_id,
              u.id AS user_id,
              u.username,
              p.display_name,
              p.avatar_url,
              p.status_message,
              c.created_at
       FROM contacts c
       JOIN users u ON u.id = c.requester_id
       JOIN profiles p ON p.user_id = u.id
       WHERE c.addressee_id = $1 
         AND c.status = 'pending'
         AND u.is_active = TRUE
       ORDER BY c.created_at DESC`,
      [userId],
    );

    // Outgoing requests (requests I sent that are waiting for approval)
    const { rows: outgoingRows } = await query<{
      request_id: string;
      user_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      status_message: string | null;
      created_at: Date;
    }>(
      `SELECT c.id AS request_id,
              u.id AS user_id,
              u.username,
              p.display_name,
              p.avatar_url,
              p.status_message,
              c.created_at
       FROM contacts c
       JOIN users u ON u.id = c.addressee_id
       JOIN profiles p ON p.user_id = u.id
       WHERE c.requester_id = $1 
         AND c.status = 'pending'
         AND u.is_active = TRUE
       ORDER BY c.created_at DESC`,
      [userId],
    );

    return {
      incoming: incomingRows.map((r) => ({
        requestId: r.request_id,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        statusMessage: r.status_message,
        createdAt: r.created_at,
      })),
      outgoing: outgoingRows.map((r) => ({
        requestId: r.request_id,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        statusMessage: r.status_message,
        createdAt: r.created_at,
      })),
    };
  }

  /**
   * Sends a contact request.
   */
  static async sendRequest(
    requesterId: string,
    input: SendContactRequestInput,
  ): Promise<{ status: 'pending' | 'accepted'; message: string; contactId?: string }> {
    // 1. Resolve target user
    let targetUserId = input.targetUserId;
    if (!targetUserId && input.username) {
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM users WHERE username = $1 AND is_active = TRUE LIMIT 1`,
        [input.username.toLowerCase()],
      );
      if (rows.length === 0) {
        throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      }
      targetUserId = rows[0].id;
    }

    if (!targetUserId) {
      throw new BadRequestError('Target user is required', 'TARGET_REQUIRED');
    }

    // 2. Prevent sending request to oneself
    if (requesterId === targetUserId) {
      throw new BadRequestError('You cannot add yourself as a contact', 'CANNOT_ADD_SELF');
    }

    // 3. Check blocks
    const { rows: blocks } = await query<{ id: string }>(
      `SELECT id FROM blocks 
       WHERE (blocker_id = $1 AND blocked_id = $2) 
          OR (blocker_id = $2 AND blocked_id = $1)
       LIMIT 1`,
      [requesterId, targetUserId],
    );

    if (blocks.length > 0) {
      throw new ForbiddenError('Unable to send contact request to this user', 'BLOCKED');
    }

    // 4. Check target user's add_me_policy
    const { rows: profiles } = await query<{ add_me_policy: string }>(
      `SELECT add_me_policy FROM profiles WHERE user_id = $1`,
      [targetUserId],
    );

    if (profiles.length > 0 && profiles[0].add_me_policy === 'nobody') {
      throw new ForbiddenError('This user does not accept contact requests', 'POLICY_RESTRICTION');
    }

    // 5. Check existing relationship
    const { rows: existing } = await query<{
      id: string;
      requester_id: string;
      addressee_id: string;
      status: string;
    }>(
      `SELECT id, requester_id, addressee_id, status FROM contacts 
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)
       LIMIT 1`,
      [requesterId, targetUserId],
    );

    if (existing.length > 0) {
      const current = existing[0];
      if (current.status === 'accepted') {
        throw new ConflictError('User is already in your contacts', 'ALREADY_CONTACT');
      }

      if (current.status === 'pending') {
        if (current.requester_id === requesterId) {
          throw new ConflictError('Contact request has already been sent', 'REQUEST_ALREADY_SENT');
        } else {
          // The other user already sent a pending request -> auto-accept and connect!
          await query(
            `UPDATE contacts SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
            [current.id],
          );
          return {
            status: 'accepted',
            message: 'Mutual request detected! Contact successfully added.',
            contactId: current.id,
          };
        }
      }

      // If rejected earlier, reopen as pending from the current requester
      await query(
        `UPDATE contacts 
         SET requester_id = $1, addressee_id = $2, status = 'pending', updated_at = NOW()
         WHERE id = $3`,
        [requesterId, targetUserId, current.id],
      );

      return { status: 'pending', message: 'Contact request sent successfully' };
    }

    // 6. Insert new pending request and create in-app notification
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO contacts (requester_id, addressee_id, status)
         VALUES ($1, $2, 'pending')`,
        [requesterId, targetUserId],
      );

      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'contact_request', 'New Contact Request', 'You have received a new contact request.', $2)`,
        [targetUserId, JSON.stringify({ requesterId })],
      );
    });

    return { status: 'pending', message: 'Contact request sent successfully' };
  }

  /**
   * Responds to an incoming contact request (accept or reject).
   */
  static async respondToRequest(
    userId: string,
    requestId: string,
    action: 'accept' | 'reject',
  ): Promise<{ message: string }> {
    const { rows: requests } = await query<{
      id: string;
      requester_id: string;
      addressee_id: string;
      status: string;
    }>(
      `SELECT id, requester_id, addressee_id, status 
       FROM contacts 
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [requestId, userId],
    );

    if (requests.length === 0) {
      throw new NotFoundError('Pending contact request not found', 'REQUEST_NOT_FOUND');
    }

    const req = requests[0];
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE contacts SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, requestId],
      );

      if (action === 'accept') {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, 'contact_accepted', 'Contact Request Accepted', 'Your contact request has been accepted.', $2)`,
          [req.requester_id, JSON.stringify({ contactId: requestId, userId })],
        );
      }
    });

    return {
      message: action === 'accept' ? 'Contact request accepted' : 'Contact request rejected',
    };
  }

  /**
   * Removes a contact relationship.
   */
  static async removeContact(userId: string, targetUserId: string): Promise<void> {
    const result = await query(
      `DELETE FROM contacts 
       WHERE ((requester_id = $1 AND addressee_id = $2) 
          OR (requester_id = $2 AND addressee_id = $1))
         AND status = 'accepted'`,
      [userId, targetUserId],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundError('Contact relationship not found', 'CONTACT_NOT_FOUND');
    }
  }
}
