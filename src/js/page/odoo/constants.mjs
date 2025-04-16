// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export const LP_SUBSCRIPTIONS = [
  "bus.bus/im_status_updated",
  "simple_notification",
  "bundle_changed",
  "res.users.settings.volumes",
  "res.users/connection",
  "mail.activity/updated",
  "mail.record/insert",
  "mail.message/delete",
  "mail.message/inbox",
  "mail.message/mark_as_read",
  "mail.message/delete",
  "discuss.channel.rtc.session/peer_notification",
  "discuss.channel.rtc.session/sfu_hot_swap",
  "discuss.channel.rtc.session/ended",
  "discuss.channel.rtc.session/update_and_broadcast",
  "discuss.channel/leave",
  "discuss.channel/delete",
  "discuss.channel/new_message",
  "discuss.channel/transient_message",
  "discuss.channel/unpin",
  "discuss.channel.member/fetched",
  "discuss.channel/joined",
  "discuss.Thread/fold_state",
];
