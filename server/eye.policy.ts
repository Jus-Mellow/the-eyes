export type ConnectionStatus = "pending" | "accepted" | "declined" | "disconnected";

export function normalizePartnerCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function canViewPartnerLocation(status: ConnectionStatus | undefined, partnerSharingEnabled: boolean) {
  return status === "accepted" && partnerSharingEnabled;
}

export function canWriteLocation(status: ConnectionStatus | undefined, sharingEnabled: boolean) {
  return status === "accepted" && sharingEnabled;
}
