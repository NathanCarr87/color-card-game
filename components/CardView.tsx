import React from 'react';
import { Card, Color, Value } from '../types';

interface CardViewProps {
  card: Card | null;
  isFaceDown?: boolean;
  onClick?: () => void;
  className?: string;
}

const getCardColorStyles = (color: Color): string => {
  switch (color) {
    case Color.RED: return 'bg-red-600';
    case Color.YELLOW: return 'bg-yellow-500';
    case Color.GREEN: return 'bg-green-600';
    case Color.BLUE: return 'bg-blue-600';
    case Color.WILD: return 'bg-gray-800';
    default: return 'bg-gray-200';
  }
};

const getSpecialCardIcon = (value: Value) => {
    switch(value) {
        case Value.SKIP: return '🚫';
        case Value.REVERSE: return '🔄';
        case Value.DRAW_TWO: return '+2';
        case Value.WILD: return '🎨';
        case Value.WILD_DRAW_FOUR: return 'W+4';
        default: return value;
    }
}

export const CardView: React.FC<CardViewProps> = ({ card, isFaceDown = false, onClick, className = '' }) => {
  if (isFaceDown) {
    return (
      <div
        onClick={onClick}
        className={`w-24 h-36 md:w-28 md:h-40 rounded-lg shadow-lg flex items-center justify-center cursor-pointer bg-gray-800 border-2 border-gray-400 transform transition-transform hover:scale-105 ${className}`}
      >
        <div className="w-20 h-28 md:w-24 md:h-36 bg-red-600 rounded-md flex items-center justify-center transform -rotate-12">
            <span className="text-white text-4xl font-bold italic -skew-x-12">UNO</span>
        </div>
      </div>
    );
  }

  if (!card) {
    return <div className={`w-24 h-36 md:w-28 md:h-40 rounded-lg border-2 border-dashed border-gray-500 ${className}`} />;
  }
  
  const colorClass = getCardColorStyles(card.color);
  const content = getSpecialCardIcon(card.value);
  const isNumeric = !isNaN(Number(card.value));

  return (
    <div
      onClick={onClick}
      className={`w-24 h-36 md:w-28 md:h-40 rounded-lg shadow-2xl p-2 flex flex-col justify-between text-white font-bold relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${colorClass} ${className} ${onClick ? 'hover:-translate-y-2' : ''} transition-transform isolate`}
    >
      <div className="absolute -left-1/2 -top-1/2 w-[200%] h-[200%] bg-white/20 transform -rotate-45" ></div>
      <div className="relative text-2xl z-10">{content}</div>
      <div className="relative text-5xl self-center z-10">{isNumeric ? '' : content}</div>
      <div className="relative text-2xl self-end transform rotate-180 z-10">{content}</div>
    </div>
  );
};