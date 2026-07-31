export interface Standing {

  participant_id: string;

  player_name: string;

  club: string | null;

  played: number;

  won: number;

  drawn: number;

  lost: number;

  goals_for: number;

  goals_against: number;

  goal_diff: number;

  points: number;

}



export interface GroupPlayer {

  id: string;

  player_name: string;

  club?: string | null;

}



export interface Group {

  name: string;

  players: GroupPlayer[];

}
