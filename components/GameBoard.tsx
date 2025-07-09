import React from 'react';
import { Card, Color } from '../types';
import { CardView } from './CardView';

interface GameBoardProps {
  topCard: Card | null;
  onDrawClick: () => void;
  gameMessage: string;
  currentColor: Color;
  canDraw: boolean;
}

const colorMap: { [key in Color]?: string } = {
    [Color.RED]: 'border-red-500',
    [Color.GREEN]: 'border-green-500',
    [Color.BLUE]: 'border-blue-500',
    [Color.YELLOW]: 'border-yellow-400',
    [Color.WILD]: 'border-white',
}

export const GameBoard: React.FC<GameBoardProps> = ({ topCard, onDrawClick, gameMessage, currentColor, canDraw }) => {
  const borderColorClass = colorMap[currentColor] || 'border-transparent';
  return (
    <div className="flex flex-col items-center justify-center gap-4 my-4 md:my-8">
        <p className={`text-center text-lg h-8 font-semibold transition-opacity duration-300 ${gameMessage ? 'opacity-100' : 'opacity-0'}`}>
            {gameMessage}
        </p>
        <div className="flex items-center gap-4 md:gap-8">
            <CardView card={null} isFaceDown={true} onClick={canDraw ? onDrawClick : undefined} className={canDraw ? "cursor-pointer" : "cursor-not-allowed"}/>
            <div className={`p-1 rounded-lg border-4 ${borderColorClass} transition-colors duration-300 bg-black/30`}>
                <CardView card={topCard} />
            </div>
        </div>
    </div>
  );
};