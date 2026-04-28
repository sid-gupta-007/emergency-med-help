import React, { useState, useEffect, useRef } from 'react';
import { Mic, Activity, AlertTriangle, Check, X } from 'lucide-react';
import { UserPreferences } from '../types';
import { speakAudio } from '../utils/speech';

export const VoiceInput = ({ 
  onSubmit, 
  onCancel,
  onOpenSettings,
  preferences
}: { 
  onSubmit: (text: string) => void, 
  onCancel: () => void,
  onOpenSettings: () => void,
  preferences: UserPreferences
}) => {
  const [step, setStep] = useState<'listening' | 'confirming'>('listening');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [pendingText, setPendingText] = useState('');
  const [errorStatus, setErrorStatus] = useState<'denied'|'aborted'|'no-speech'|null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActiveRef = useRef(true);
  const allowRestartRef = useRef(true);

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      allowRestartRef.current = false;
    };
  }, []);

  const startVoice = (isConfirmStep: boolean) => {
    isActiveRef.current = true;
    allowRestartRef.current = true;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
       onCancel();
       return;
    }

    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = preferences.language === 'hinglish' ? 'hi-IN' : 'en-IN';
    
    let finalTranscript = '';

    rec.onstart = () => {
      setIsRecording(true);
      setErrorStatus(null);
    };
    
    rec.onerror = (event: any) => {
      if (['not-allowed', 'audio-capture', 'aborted', 'service-not-allowed', 'network'].includes(event.error)) {
         if (event.error === 'not-allowed') setErrorStatus('denied');
         else if (event.error === 'aborted') setErrorStatus('aborted');
         else setErrorStatus('no-speech');
         allowRestartRef.current = false;
      } else if (event.error === 'no-speech') {
         setErrorStatus('no-speech');
      }
      setIsRecording(false);
    };

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      const currentFullText = (finalTranscript + interim).trim().toLowerCase();
      setTranscript(currentFullText);

      if (!isConfirmStep) {
          // STEP 1: INITIAL KEYWORD MATCHING
          const isSettings = currentFullText.match(/(settings|setting|change mode|mode change)/i);
          if (isSettings) {
             isActiveRef.current = false;
             allowRestartRef.current = false;
             if (recognitionRef.current) recognitionRef.current.stop();
             onOpenSettings();
             return;
          }

          const isAmbulanceOrHelp = currentFullText.match(/(ambulance|help|emergency|bachao|accident|chot|heart|attack|saans|stroke|behosh|takkar|khoon|bleed|cut|trauma|dash)/i);
          const isHospital = currentFullText.match(/(hospital|doctor|clinic)/i);
          const isCancel = currentFullText.match(/(cancel|back|peeche|stop|ruk)/i);

          if (isCancel) {
              isActiveRef.current = false;
              allowRestartRef.current = false;
              if (recognitionRef.current) recognitionRef.current.stop();
              speakAudio("Cancelled.", preferences, true);
              onCancel();
              return;
          }

          if (isAmbulanceOrHelp || isHospital) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
               allowRestartRef.current = false;
               rec.stop();
               setPendingText(currentFullText);
               setStep('confirming');
            }, 1000); 
          } else if (currentFullText.length > 2) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
               allowRestartRef.current = false;
               rec.stop();
               if (currentFullText.length > 3) {
                   setPendingText(currentFullText);
                   setStep('confirming');
               } else {
                   setErrorStatus('no-speech');
                   speakAudio("Samajh nahi aaya, please fir se boliye.", preferences, true, () => {
                       allowRestartRef.current = true;
                       if (isActiveRef.current) {
                           try { recognitionRef.current?.start(); } catch(e) {}
                       }
                   });
               }
            }, 2000); 
          }
      } else {
          // STEP 2: CONFIRMATION MATCHING
          const isYes = currentFullText.match(/(yes|yeah|yep|haan|han|ha|ji)/i);
          const isNo = currentFullText.match(/(no|nope|nah|nahi|naa|na)/i);
          const isCancel = currentFullText.match(/(cancel|back|peeche|stop|ruk)/i);

          if (isCancel || isNo) {
              isActiveRef.current = false;
              allowRestartRef.current = false;
              if (recognitionRef.current) recognitionRef.current.stop();
              speakAudio(preferences.language === 'hinglish' ? "Cancel ho gaya." : "Cancelled dispatch.", preferences, true);
              onCancel();
              return;
          }

          if (isYes) {
              isActiveRef.current = false;
              allowRestartRef.current = false;
              if (recognitionRef.current) recognitionRef.current.stop();
              onSubmit(pendingText); // Final submission
          }
      }
    };
    
    rec.onend = () => {
      setIsRecording(false);
      // Auto restart if still active and no critical error
      if (isActiveRef.current && allowRestartRef.current) {
         setTimeout(() => {
            if (isActiveRef.current && allowRestartRef.current) {
                try {
                    recognitionRef.current?.start();
                } catch(e) {}
            }
         }, 800);
      }
    };
    
    recognitionRef.current = rec;
    
    try {
      rec.start();
    } catch(e) {
      console.warn("Rec already started", e);
    }
  };

  // Launch Mic logic whenever step changes
  useEffect(() => {
    let isMounted = true;
    if (step === 'confirming') {
       speakAudio(preferences.language === 'hinglish' ? "Confirm emergency dispatch? Haan ya na boliye." : "Confirm emergency dispatch? Please say yes or no.", preferences, true, () => {
           if (isMounted) startVoice(true);
       });
    } else {
       startVoice(false);
    }
    
    return () => {
      isMounted = false;
      isActiveRef.current = false; // clean up old instances
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [step, preferences]);

  const requestMicAgain = () => {
    if (!isRecording) {
      setErrorStatus(null);
      allowRestartRef.current = true;
      startVoice(step === 'confirming');
    }
  };

  if (step === 'confirming') {
      return (
        <div className="flex flex-col items-center w-full gap-8 px-4 py-8" role="alert" aria-live="assertive">
           <div className="text-center bg-gray-50 p-6 rounded-3xl w-full border-2 border-gray-200 shadow-sm flex flex-col items-center gap-4">
              <div className="p-4 bg-red-100 rounded-full shadow-inner text-red-600 animate-pulse"><AlertTriangle className="w-16 h-16" /></div>
              <h2 className="text-3xl font-black leading-tight text-gray-900">
                  {preferences.language === 'hinglish' ? "Confirm emergency dispatch?" : "Confirm emergency dispatch?"}
              </h2>
           </div>

           <div className="flex gap-4 w-full h-72 lg:h-80 mt-2">
              <button 
                onClick={() => { isActiveRef.current=false; allowRestartRef.current=false; if(recognitionRef.current) recognitionRef.current.stop(); onSubmit(pendingText); }}
                className="flex-1 bg-green-500 border-b-8 border-green-700 rounded-3xl flex flex-col items-center justify-center gap-6 hover:bg-green-400 active:border-b-0 active:translate-y-2 transition-all shadow-xl"
                aria-label="Yes / Haan"
              >
                <div className="bg-white p-5 rounded-full text-green-600 shadow-sm">
                  <Check className="w-20 h-20" />
                </div>
                <span className="text-4xl font-black text-white px-2 text-center leading-none">
                  {preferences.language === 'hinglish' ? "हाँ\nYES" : "YES"}
                </span>
              </button>

              <button 
                onClick={() => { isActiveRef.current=false; allowRestartRef.current=false; if(recognitionRef.current) recognitionRef.current.stop(); speakAudio("Cancelled.", preferences); onCancel(); }}
                className="flex-1 bg-[#b71c1c] border-b-8 border-red-900 rounded-3xl flex flex-col items-center justify-center gap-6 hover:bg-red-600 active:border-b-0 active:translate-y-2 transition-all shadow-xl"
                aria-label="No / Nahi"
              >
                <div className="bg-white p-5 rounded-full text-red-700 shadow-sm">
                  <X className="w-20 h-20" />
                </div>
                <span className="text-4xl font-black text-white px-2 text-center leading-none">
                  {preferences.language === 'hinglish' ? "नहीं\nNO" : "NO"}
                </span>
              </button>
           </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col items-center w-full gap-8 px-4 py-8" role="alert" aria-live="assertive">
      <div className="relative flex justify-center items-center h-48 w-48 mb-4">
        {isRecording && <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-70 scale-125"></div>}
        <button 
          onClick={requestMicAgain}
          disabled={isRecording && !errorStatus}
          className={`z-10 w-40 h-40 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${isRecording ? 'bg-[#b71c1c] scale-110' : errorStatus ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-800'}`}
          aria-label="Toggle Microphone"
        >
          {errorStatus ? <AlertTriangle className="w-16 h-16" /> : isRecording ? <Activity className="w-20 h-20 animate-pulse" /> : <Mic className="w-16 h-16" />}
        </button>
      </div>

      <div className="w-full bg-white p-6 rounded-3xl shadow-lg border-2 border-red-100 flex items-center justify-center min-h-[120px]">
        {errorStatus === 'denied' ? (
           <div className="text-center">
             <p className="text-red-600 font-bold text-xl">Mic access denied</p>
             <p className="text-gray-500 text-sm mt-1">Please allow microphone in settings.</p>
           </div>
        ) : errorStatus === 'no-speech' ? (
           <p className="text-orange-600 font-bold text-xl text-center">Awaz nahi aayi.<br/>Mic dabaye ya cancel karein.</p>
        ) : transcript ? (
           <p className="text-3xl text-center font-black text-gray-900 leading-tight">{transcript}</p>
        ) : (
           <div className="flex flex-col items-center gap-2">
             <p className="text-2xl text-center font-bold text-gray-800">बोलना शुरू करें...</p>
             <p className="text-lg text-center font-medium text-gray-400">Speak "Ambulance" or "Help"</p>
           </div>
        )}
      </div>
    </div>
  );
};
