import { PublicProtectionCandidateSchema, type ProtectionCandidate, type PublicProtectionCandidate } from "./entities";

export function publicCandidate(candidate: ProtectionCandidate): PublicProtectionCandidate {
  const { protocolRaw, ...publicFields } = candidate;
  void protocolRaw;
  return PublicProtectionCandidateSchema.parse(publicFields);
}
