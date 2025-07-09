export enum Color {
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  WILD = 'WILD',
}

export enum Value {
  ZERO = '0',
  ONE = '1',
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  SKIP = 'SKIP',
  REVERSE = 'REVERSE',
  DRAW_TWO = 'DRAW_TWO',
  WILD = 'WILD',
  WILD_DRAW_FOUR = 'WILD_DRAW_FOUR',
}

export interface Card {
  id: number;
  color: Color;
  value: Value;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
}

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  isGameOver: boolean;
  winner: Player | null;
  currentColor: Color;
  gameMessage: string;
  unoCalled: string[];
}

export enum GameMode {
  LOBBY,
  HOSTING,
  JOINING,
  PLAYING,
  ERROR,
}

// P2P Communication Actions
export type P2PAction =
  | { type: 'START_GAME'; initialState: GameState, playerIndex: number }
  | { type: 'PLAY_CARD'; card: Card }
  | { type: 'DRAW_CARD' }
  | { type: 'CHOOSE_COLOR'; color: Color }
  | { type: 'GAME_STATE_UPDATE'; gameState: GameState }
  | { type: 'CALL_UNO' }
  | { type: 'PLAYER_INFO'; name: string };