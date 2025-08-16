// DE-04 Battle entity definitions
export interface BattleParticipant {
  id: string; // character id reference
  initiative: number | null;
  hp?: number; // placeholder for future combat attributes
}

export interface BattleState {
  id: string;
  round: number;
  participants: BattleParticipant[];
  active?: string; // id of active participant
  status: 'pending' | 'active' | 'ended';
}
