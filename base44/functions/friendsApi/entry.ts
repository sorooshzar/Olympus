import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // 1. SEND REQUEST — lookup recipient by friend code, create pending Friendship (service role)
    if (action === 'sendRequest') {
      const { recipientCode } = body;
      if (!recipientCode) return Response.json({ error: 'Missing recipientCode' }, { status: 400 });
      const normalized = String(recipientCode).replace(/-/g, '').trim();
      if (normalized.length < 12) return Response.json({ error: 'Invalid friend code' }, { status: 400 });

      const allUsers = await base44.asServiceRole.entities.User.list();
      const recipient = allUsers.find(u =>
        u.friend_code && u.friend_code.replace(/-/g, '') === normalized && u.email !== user.email
      );
      if (!recipient) return Response.json({ error: 'No user found with that code.' }, { status: 404 });

      const allFriendships = await base44.asServiceRole.entities.Friendship.list();
      const exists = allFriendships.some(f =>
        ((f.requester_email === user.email && f.recipient_email === recipient.email) ||
         (f.requester_email === recipient.email && f.recipient_email === user.email)) &&
        f.status !== 'rejected'
      );
      if (exists) return Response.json({ error: 'You already have a connection with this user.' }, { status: 409 });

      await base44.asServiceRole.entities.Friendship.create({
        requester_email: user.email,
        recipient_email: recipient.email,
        requester_username: user.username || null,
        recipient_username: recipient.username || null,
        status: 'pending',
      });
      return Response.json({ ok: true, recipientUsername: recipient.username || null });
    }

    // 2. GET PENDING REQUESTS — for the current user as recipient (service role)
    if (action === 'getPending') {
      const allFriendships = await base44.asServiceRole.entities.Friendship.list();
      const pending = allFriendships.filter(f => f.recipient_email === user.email && f.status === 'pending');
      return Response.json({ requests: pending });
    }

    // 3. ACCEPT REQUEST — update status to accepted (service role, ownership-checked)
    if (action === 'accept') {
      const { recordId } = body;
      if (!recordId) return Response.json({ error: 'Missing recordId' }, { status: 400 });
      const all = await base44.asServiceRole.entities.Friendship.list();
      const record = all.find(f => f.id === recordId);
      if (!record) return Response.json({ error: 'Request not found' }, { status: 404 });
      if (record.recipient_email !== user.email) return Response.json({ error: 'Not authorized' }, { status: 403 });
      await base44.asServiceRole.entities.Friendship.update(recordId, {
        status: 'accepted',
        recipient_username: user.username || record.recipient_username || null,
      });
      return Response.json({ ok: true });
    }

    // 4. REJECT REQUEST — delete the record (service role, ownership-checked)
    if (action === 'reject') {
      const { recordId } = body;
      if (!recordId) return Response.json({ error: 'Missing recordId' }, { status: 400 });
      const all = await base44.asServiceRole.entities.Friendship.list();
      const record = all.find(f => f.id === recordId);
      if (!record) return Response.json({ error: 'Request not found' }, { status: 404 });
      if (record.recipient_email !== user.email) return Response.json({ error: 'Not authorized' }, { status: 403 });
      await base44.asServiceRole.entities.Friendship.delete(recordId);
      return Response.json({ ok: true });
    }

    // 5. GET FRIENDS LIST — accepted friendships + each friend's SBD cache + strength score (service role)
    if (action === 'getFriends') {
      const [allFriendships, allMuscleRanks, allSbdCaches, allUsers] = await Promise.all([
        base44.asServiceRole.entities.Friendship.list(),
        base44.asServiceRole.entities.UserMuscleRank.list(),
        base44.asServiceRole.entities.UserSBDCache.list(),
        base44.asServiceRole.entities.User.list(),
      ]);

      const computeScore = (email) => {
        const ranks = allMuscleRanks.filter(r => r.created_by === email);
        const strengthScore = ranks.reduce((sum, r) => sum + (r.impressiveness_score || 0), 0);
        const sbdCache = allSbdCaches.find(r => r.created_by === email) || null;
        return { strengthScore, sbdCache };
      };

      const accepted = allFriendships.filter(f =>
        f.status === 'accepted' &&
        (f.requester_email === user.email || f.recipient_email === user.email)
      );

      const friends = accepted.map(f => {
        const isRequester = f.requester_email === user.email;
        const friendEmail = isRequester ? f.recipient_email : f.requester_email;
        const friendUsername = isRequester ? f.recipient_username : f.requester_username;
        const friendUser = allUsers.find(u => u.email === friendEmail);
        const data = computeScore(friendEmail);
        return {
          id: friendEmail,
          email: friendEmail,
          username: friendUsername || friendUser?.username || null,
          strengthScore: data.strengthScore,
          sbdCache: data.sbdCache,
        };
      }).sort((a, b) => (b.strengthScore || 0) - (a.strengthScore || 0));

      const selfData = computeScore(user.email);
      return Response.json({
        friends,
        self: { strengthScore: selfData.strengthScore, sbdCache: selfData.sbdCache },
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}