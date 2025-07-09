import React from 'react';
import { Player, Card } from '../types';
import { CardView } from './CardView';

interface PlayerHandProps {
  player: Player;
  onCardClick: (card: Card) => void;
  isMe: boolean;
  isCurrentPlayer: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, onCardClick, isMe, isCurrentPlayer }) => {
  const highlightClass = isCurrentPlayer ? 'text-yellow-400 animate-pulse' : 'text-gray-300';
  const playerName = isMe ? 'You' : player.name;

  return (
    <div className="flex flex-col items-center">
      <h2 className={`text-xl font-bold mb-2 text-center transition-colors ${highlightClass}`}>
        {playerName} {isCurrentPlayer && !isMe && '(Opponent\'s Turn)'}
      </h2>
      <div className="flex justify-center items-end flex-wrap gap-2 min-h-[170px] bg-black/20 p-4 rounded-xl w-full max-w-4xl">
        {player.hand.length > 0 ? player.hand.map((card, index) => (
          <div key={card.id} className="transition-all relative hover:z-20" style={{ marginLeft: index > 0 ? '-50px' : '0' }}>
            <CardView
              card={card}
              isFaceDown={!isMe}
              onClick={isMe && isCurrentPlayer ? () => onCardClick(card) : undefined}
            />
          </div>
        )) : <p className="text-gray-400 self-center">No cards left!</p>}
      </div>
    </div>
  );
};
