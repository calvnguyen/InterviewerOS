'use strict';

/**
 * Compute next_action and stale for an application record.
 * Neither field is stored in the database — they are derived on every read.
 *
 * next_action logic:
 *   applied + < 5 days since created_at  -> "Awaiting response"
 *   applied + >= 5 days since created_at -> "Follow up"
 *   phone_screen                          -> "Prepare for call"
 *   interview                             -> "Prepare for interview"
 *   offer                                 -> "Respond to offer"
 *   rejected                              -> null
 *
 * stale logic:
 *   true  if stage is NOT "offer" or "rejected" AND updated_at is 7+ days ago
 *   false otherwise
 */
function computeFields(application) {
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const createdAt = new Date(application.created_at).getTime();
  const updatedAt = new Date(application.updated_at).getTime();

  const daysSinceCreated = (now - createdAt) / MS_PER_DAY;
  const daysSinceUpdated = (now - updatedAt) / MS_PER_DAY;

  let next_action = null;

  switch (application.stage) {
    case 'applied':
      next_action = daysSinceCreated < 5 ? 'Awaiting response' : 'Follow up';
      break;
    case 'phone_screen':
      next_action = 'Prepare for call';
      break;
    case 'interview':
      next_action = 'Prepare for interview';
      break;
    case 'offer':
      next_action = 'Respond to offer';
      break;
    case 'rejected':
      next_action = null;
      break;
    default:
      next_action = null;
  }

  const terminalStages = ['offer', 'rejected'];
  const stale =
    !terminalStages.includes(application.stage) && daysSinceUpdated >= 7;

  return {
    ...application,
    next_action,
    stale,
  };
}

module.exports = { computeFields };
