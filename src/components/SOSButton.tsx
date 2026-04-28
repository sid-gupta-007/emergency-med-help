import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export const SOSButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95, y: 5, boxShadow: '0 0px 0px rgba(0,0,0,0.5)' }}
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // Haptic SOS pattern
        onClick();
      }}
      className="relative flex flex-col items-center justify-center w-64 h-64 rounded-full bg-[#B71C1C] text-white shadow-[0_12px_0_#7F0000,0_20px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_10px_0_#7F0000,0_15px_20px_rgba(0,0,0,0.4)] hover:mt-[2px] hover:mb-[-2px] transition-all outline-none focus:ring-8 focus:ring-red-400 focus:ring-opacity-50"
      aria-label="EMERGENCY. Double tap to request immediate help."
    >
      <div className="absolute inset-0 rounded-full border-4 border-red-400 opacity-20"></div>
      <AlertCircle className="w-24 h-24 mb-2 drop-shadow-md" />
      <span className="text-5xl font-black tracking-wider drop-shadow-md">SOS</span>
      <span className="mt-4 text-sm font-bold uppercase tracking-widest opacity-90 drop-shadow-sm bg-black/20 px-4 py-1 rounded-full">Tap for Help</span>
    </motion.button>
  );
};
