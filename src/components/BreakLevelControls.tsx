import React from 'react';
import PlusIcon from '../assets/dashboard_b_add.png'; // 추가 필요
import MinusIcon from '../assets/dashboard_b_substraction.png'; // 추가 필요

interface BreakLevelControlsProps {
  breakLevel: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

export const BreakLevelControls: React.FC<BreakLevelControlsProps> = ({
  breakLevel,
  onIncrease,
  onDecrease
}) => {
  return (
    <div className="flex justify-between w-full max-w-[320px] mt-4 px-4">
      <button 
        onClick={onDecrease}
        disabled={breakLevel <= 1}
        className={`${breakLevel <= 1 ? 'opacity-30' : 'opacity-100'} w-12 h-12 flex items-center justify-center`}
      >
        <img src={MinusIcon} alt="Decrease break level" className="w-8 h-8" />
      </button>
      
      <button 
        onClick={onIncrease}
        disabled={breakLevel >= 3}
        className={`${breakLevel >= 3 ? 'opacity-30' : 'opacity-100'} w-12 h-12 flex items-center justify-center`}
      >
        <img src={PlusIcon} alt="Increase break level" className="w-8 h-8" />
      </button>
    </div>
  );
}; 