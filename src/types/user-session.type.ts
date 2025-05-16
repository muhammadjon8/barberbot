import { ServiceType } from "./service-type";

export type UserSession = Record<
  number,
  {
    serviceType?: ServiceType;
    serviceDate?: string;
    serviceTime?: string;
    awaitingDate?: boolean;
    awaitingTime?: boolean;
    awaitingFeedbackFor?: string;
    awaitingRatingFor?: string;
    ratingMessageId?: number;
  }
>;
