import React, { useState } from 'react';
import { UserPreferences } from '../types';
import { X, Check, Settings as SettingsIcon } from 'lucide-react';

export const SettingsPanel = ({ 
    prefs, 
    onSave, 
    onClose,
    isFlowActive
}: { 
    prefs: UserPreferences, 
    onSave: (newPrefs: UserPreferences, resetFlow: boolean) => void,
    onClose: () => void,
    isFlowActive: boolean
}) => {
   const [localPrefs, setLocalPrefs] = useState<UserPreferences>(prefs);

   const OptionBtn = ({ selected, onClick, title, desc }: any) => (
    <button 
      onClick={onClick}
      className={`text-left p-4 rounded-3xl border-4 transition-all flex flex-col gap-1 w-full flex-1 ${selected ? 'border-[#b71c1c] bg-red-50 relative' : 'border-gray-200 bg-white hover:border-red-200'}`}
    >
      <div className="text-xl font-black text-gray-900">{title}</div>
      <div className="text-sm text-gray-600 font-medium leading-tight">{desc}</div>
      {selected && <div className="absolute top-4 right-4 bg-[#b71c1c] text-white p-1 rounded-full"><Check className="w-4 h-4"/></div>}
    </button>
  );

  const handleSave = () => {
      onSave(localPrefs, isFlowActive);
  };

  return (
    <div className="fixed inset-0 bg-white z-[300] overflow-y-auto px-4 py-8 flex flex-col w-full h-full max-w-xl mx-auto border-x shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-[#b71c1c]" /> Settings
            </h2>
            <button onClick={onClose} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95">
                <X className="w-8 h-8 text-gray-800" />
            </button>
        </div>

        {isFlowActive && (
            <div className="bg-orange-100 border-4 border-orange-300 text-orange-900 p-4 rounded-3xl font-bold mb-6 flex flex-col">
                <span className="text-xl mb-1 uppercase tracking-widest text-orange-600">Warning</span>
                Saving settings now will reset your active emergency request and return you to the home screen.
            </div>
        )}

        <div className="flex flex-col gap-8 flex-grow pb-12">
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-widest">Interaction Mode</h3>
                <div className="flex flex-col gap-3">
                   <OptionBtn 
                     selected={localPrefs.mode === 'voice'} 
                     onClick={() => setLocalPrefs({...localPrefs, mode: 'voice', voiceFeedback: true})}
                     title="Voice Mode" desc="Listen & Speak, Hands-free focus" 
                   />
                   <OptionBtn 
                     selected={localPrefs.mode === 'touch'} 
                     onClick={() => setLocalPrefs({...localPrefs, mode: 'touch', voiceFeedback: false})}
                     title="Touch Mode" desc="Visual Buttons, silent mode default" 
                   />
                   <OptionBtn 
                     selected={localPrefs.mode === 'accessible'} 
                     onClick={() => setLocalPrefs({...localPrefs, mode: 'accessible', voiceFeedback: true})}
                     title="Accessibility Mode" desc="Voice Guidance + Full UI Support" 
                   />
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-widest">Language</h3>
                <div className="flex gap-3">
                   <OptionBtn 
                     selected={localPrefs.language === 'hinglish'} 
                     onClick={() => setLocalPrefs({...localPrefs, language: 'hinglish'})}
                     title="Hinglish" desc="Hindi + English words" 
                   />
                   <OptionBtn 
                     selected={localPrefs.language === 'english'} 
                     onClick={() => setLocalPrefs({...localPrefs, language: 'english'})}
                     title="English" desc="Pure English" 
                   />
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-widest">Voice Feedback</h3>
                <div className="flex gap-3">
                   <OptionBtn 
                     selected={localPrefs.voiceFeedback === true} 
                     onClick={() => setLocalPrefs({...localPrefs, voiceFeedback: true})}
                     title="ON" desc="App will speak" 
                   />
                   <OptionBtn 
                     selected={localPrefs.voiceFeedback === false} 
                     onClick={() => setLocalPrefs({...localPrefs, voiceFeedback: false})}
                     title="OFF" desc="Silent mode" 
                   />
                </div>
            </div>
        </div>

        <div className="mt-auto pt-4 border-t-2 border-gray-100">
            <button 
                onClick={handleSave}
                className="w-full bg-[#b71c1c] hover:bg-red-800 text-white font-black text-2xl py-6 rounded-3xl shadow-xl active:scale-95 transition-transform"
            >
                SAVE SETTINGS
            </button>
        </div>
    </div>
  )
}
