import { FromEnum } from "./from-enum";

export type SendInvitationHttpResponseBody = {
  sent: boolean
}

export enum InvitationStatusEnum {
  SENT = "sent",
  EXPIRED = "expired",
  ACCEPTED = "accepted"
}

export type InvitationStatus = FromEnum<typeof InvitationStatusEnum>
