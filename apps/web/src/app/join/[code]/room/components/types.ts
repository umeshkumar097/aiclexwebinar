export interface ChatMsg {
  id: string;
  user: string;
  message: string;
  time: Date;
  isMe?: boolean;
  isHost?: boolean;
  isPinned?: boolean;
}

export interface QnAQuestion {
  id: string;
  user: string;
  question: string;
  time: Date;
  upvotes: number;
  hasUpvoted?: boolean;
  answered?: boolean;
  answer?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  myVote?: string;
  closed?: boolean;
  totalVotes: number;
}

export interface CTAData {
  id: string;
  type: 'buy_now' | 'book_demo' | 'coupon' | 'offer' | 'bonus';
  title: string;
  description?: string;
  cta_label: string;
  url?: string;
  coupon?: string;
  countdown_seconds?: number;
  price?: string;
  original_price?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: 'pdf' | 'ppt' | 'worksheet' | 'link' | 'video' | 'bonus';
  url: string;
  icon: string;
}

export type HostEvent =
  | { type: 'announcement'; text: string }
  | { type: 'pin_message'; messageId: string }
  | { type: 'reaction'; emoji: string }
  | { type: 'poll_start'; poll: Poll }
  | { type: 'poll_end'; pollId: string }
  | { type: 'cta_show'; cta: CTAData }
  | { type: 'cta_hide' }
  | { type: 'resource_add'; resource: Resource }
  | { type: 'message'; user: string; message: string; isHost?: boolean }
  | { type: 'qna_question'; user: string; question: string; id: string }
  | { type: 'poll_vote'; pollId: string; optionId: string; user: string }
  | { type: 'host_mute'; targetSid: string; muted: boolean }
  | { type: 'raise_hand'; user: string; raised: boolean }
  | { type: 'spotlight'; targetSid: string | null }
  | { type: 'session_end' };
