import React, { useState } from 'react';
import { UserPreferences } from '../types';
import { Check } from 'lucide-react';

export const SetupFlow = ({ onComplete }: { onComplete: (prefs: UserPreferences) => void }) => {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>({
    mode: null,
    language: 'hinglish',
    voiceFeedback: false,
    setupComplete: true
  });

  const nextStep = () => {
    if (step < 2) setStep(step + 1);
    else onComplete(prefs);
  }

  const OptionBtn = ({ selected, onClick, title, desc }: any) => (
    <button 
      onClick={onClick}
      className={`w-full text-left p-6 rounded-3xl border-4 transition-all flex flex-col gap-2 ${selected ? 'border-[#b71c1c] bg-red-50 relative' : 'border-gray-200 bg-white hover:border-red-200'}`}
    >
      <div className="text-2xl font-black text-gray-900">{title}</div>
      <div className="text-lg text-gray-600 font-medium">{desc}</div>
      {selected && <div className="absolute top-6 right-6 bg-[#b71c1c] text-white p-1 rounded-full"><Check className="w-6 h-6"/></div>}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-white z-[200] overflow-y-auto px-6 py-12 flex flex-col max-w-xl mx-auto">
      <div className="flex-1">
          {step === 0 && (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="text-4xl font-black text-gray-900 leading-tight">Madaad kaise chahiye?</h1>
                <p className="text-xl text-gray-500 font-bold mt-2">How do you prefer to use this app?</p>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                  <OptionBtn 
                    selected={prefs.mode === 'voice'} 
                    onClick={() => { setPrefs({...prefs, mode: 'voice', voiceFeedback: true}); nextStep(); }}
                    title="बोल कर (Voice)" 
                    desc="Audio instructions, simple icons."
                  />
                  <OptionBtn 
                    selected={prefs.mode === 'touch'} 
                    onClick={() => { setPrefs({...prefs, mode: 'touch', voiceFeedback: false}); nextStep(); }}
                    title="दबा कर (Touch)" 
                    desc="Buttons, clean UI layout."
                  />
                  <OptionBtn 
                    selected={prefs.mode === 'accessible'} 
                    onClick={() => { setPrefs({...prefs, mode: 'accessible', voiceFeedback: true}); nextStep(); }}
                    title="सुविधा (Accessibility)" 
                    desc="Voice guidance + Large UI."
                  />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="text-4xl font-black text-gray-900 leading-tight">Language?</h1>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                  <OptionBtn 
                    selected={prefs.language === 'hinglish'} 
                    onClick={() => { setPrefs({...prefs, language: 'hinglish'}); nextStep(); }}
                    title="Hinglish" 
                    desc="Hindi mixed with English words."
                  />
                  <OptionBtn 
                    selected={prefs.language === 'english'} 
                    onClick={() => { setPrefs({...prefs, language: 'english'}); nextStep(); }}
                    title="English" 
                    desc="Pure English."
                  />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="text-4xl font-black text-gray-900 leading-tight">Awaz chalu rakhna hai?</h1>
                <p className="text-xl text-gray-500 font-bold mt-2">Voice feedback</p>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                  <OptionBtn 
                    selected={prefs.voiceFeedback === true} 
                    onClick={() => { setPrefs({...prefs, voiceFeedback: true}); nextStep(); }}
                    title="हाँ (ON)" 
                    desc="App boli hui jankari dega."
                  />
                  <OptionBtn 
                    selected={prefs.voiceFeedback === false} 
                    onClick={() => { setPrefs({...prefs, voiceFeedback: false}); nextStep(); }}
                    title="नहीं (OFF)" 
                    desc="Silent mode."
                  />
              </div>
            </div>
          )}
      </div>
      
      {/* Progress Indicator */}
      <div className="flex justify-center gap-2 mt-8">
         <div className={`w-3 h-3 rounded-full ${step >= 0 ? 'bg-[#b71c1c]' : 'bg-gray-200'}`} />
         <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-[#b71c1c]' : 'bg-gray-200'}`} />
         <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-[#b71c1c]' : 'bg-gray-200'}`} />
      </div>
    </div>
  )
}
