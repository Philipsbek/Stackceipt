-- Stackceipt — add a general "ANNOUNCEMENT" notification type.
-- Broadcast, informational notifications emitted on important edits
-- (subscription/department created, updated, archived) so the whole team
-- sees org activity. Idempotent: safe to run more than once.

alter type notification_type add value if not exists 'ANNOUNCEMENT';
