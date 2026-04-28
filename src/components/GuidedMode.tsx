import React, { useState, useEffect, useRef } from 'react';
import { Check, X, AlertTriangle, Navigation, Activity, Droplets } from 'lucide-react';
import { UserPreferences } from '../types';
import { speakAudio } from '../utils/speech';

export const GuidedMode = ({ 
  onSubmit, 
  onCancel,
  preferences 
}: { 
  onSubmit: (t: string) => void,
  onCancel: () => void,
  preferences: UserPreferences
}) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(true);
  const allowRestartRef = useRef(true);

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      allowRestartRef.current = false;
    };
  }, []);

  const questions = [
    { id: 'ambulance', text: "Do you need an ambulance?", hindi: "Kya aapko ambulance chahiye? Haan ya na boliye.", icon: <Navigation className="w-16 h-16" /> },
    { id: 'hospital', text: "Do you need a hospital?", hindi: "Kya aapko hospital jaana hai? Haan ya na boliye.", icon: <Activity className="w-16 h-16" /> },
    { id: 'blood', text: "Do you need blood?", hindi: "Kya khoon ki zaroorat hai? Haan ya na boliye.", icon: <Droplets className="w-16 h-16" /> }
  ];

  const handleSpeechResult = (currentFullText: string) => {
    const isYes = currentFullText.match(/(yes|yeah|yep|haan|han|ha|ji|zaroori)/i);
    const isNo = currentFullText.match(/(no|nope|nah|nahi|naa|na)/i);
    const isCancel = currentFullText.match(/(cancel|back|peeche|stop)/i);

    if (isCancel) {
        isActiveRef.current = false;
        allowRestartRef.current = false;
        if (recognitionRef.current) recognitionRef.current.stop();
        speakAudio("Cancelled.", preferences);
        onCancel();
        return;
    }

    if (isYes) {
      allowRestartRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      handleAnswer(true);
    } else if (isNo) {
      allowRestartRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      handleAnswer(false);
    }
  };

  const initSpeech = () => {
    isActiveRef.current = true;
    allowRestartRef.current = true;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = preferences.language === 'hinglish' ? 'hi-IN' : 'en-IN';
    
    rec.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      handleSpeechResult((finalTranscript + interim).trim());
    };

    rec.onerror = (e: any) => {
        if (['not-allowed', 'audio-capture', 'aborted', 'service-not-allowed', 'network'].includes(e.error)) {
            allowRestartRef.current = false;
        }
    };

    rec.onend = () => {
       if (isActiveRef.current && allowRestartRef.current) {
          setTimeout(() => {
              if (isActiveRef.current && allowRestartRef.current) {
                 try { recognitionRef.current?.start(); } catch(e){}
              }
          }, 800);
       }
    };

    recognitionRef.current = rec;
    try {
        rec.start();
    } catch(e) {}
  };

  useEffect(() => {
    let isMounted = true;
    if (step < questions.length) {
        const currentQ = questions[step];
        const textToSpeak = preferences.language === 'hinglish' ? currentQ.hindi : currentQ.text;
        speakAudio(textToSpeak, preferences, true, () => {
            if (isMounted) initSpeech();
        });
    } else if (step === 99) {
        speakAudio(preferences.language === 'hinglish' ? "Koi madad nahi chuni gayi. Cancel kar rahe hain." : "No emergency action selected.", preferences, true);
    } else if (step === questions.length + 1) {
        speakAudio(preferences.language === 'hinglish' ? "Confirm emergency dispatch? Haan ya na boliye." : "Confirm emergency dispatch? Please say yes or no.", preferences, true, () => {
            if (isMounted) initSpeech();
        });
    }
    
    return () => {
        isMounted = false;
        isActiveRef.current = false;
        if (recognitionRef.current) recognitionRef.current.stop();
    }
  }, [step, preferences]);

  const handleAnswer = (ans: boolean) => {
    if (step < questions.length) {
        const currentId = questions[step].id;
        const newAnswers = {...answers, [currentId]: ans};
        setAnswers(newAnswers);
        
        if (step + 1 === questions.length) {
            const hasAnyYes = Object.values(newAnswers).some(val => val === true);
            if (!hasAnyYes) {
                setStep(99); 
            } else {
                setStep(questions.length + 1);
            }
        } else {
            setStep(step + 1);
        }
    } else if (step === questions.length + 1) {
        // Confirmation answering
        if (ans === true) {
            // Proceed to submit
            const descParts = [];
            if (answers.ambulance) descParts.push("ambulance");
            if (answers.hospital) descParts.push("hospital");
            if (answers.blood) descParts.push("blood");
            onSubmit(descParts.join(" "));
        } else {
            // Cancel
            setStep(99);
            speakAudio(preferences.language === 'hinglish' ? "Cancel ho gaya." : "Dispatch cancelled.", preferences, true);
        }
    }
  };

  if (step === 99) {
      return (
          <div className="flex flex-col items-center justify-center w-full min-h-[50vh] gap-8 px-4" aria-live="assertive">
             <AlertTriangle className="w-24 h-24 text-orange-500" />
             <h2 className="text-3xl font-black text-center text-gray-800">
                {preferences.language === 'hinglish' ? "Koi action nahi liya gaya" : "No emergency action selected"}
             </h2>
             <button 
                onClick={onCancel}
                className="mt-6 px-10 py-5 bg-gray-200 hover:bg-gray-300 text-gray-900 font-black rounded-full text-2xl"
             >
                Peeche / Go Back
             </button>
          </div>
      )
  }

  const isConfirmation = step === questions.length + 1;
  const qText = isConfirmation 
      ? (preferences.language === 'hinglish' ? "Confirm Ambulance/Help?" : "Confirm emergency dispatch?")
      : (preferences.language === 'hinglish' ? questions[step].hindi : questions[step].text);

  return (
    <div className="flex flex-col items-center w-full gap-8 px-4 py-8" role="alert" aria-live="assertive">
      <div className="text-center bg-gray-50 p-6 rounded-3xl w-full border-2 border-gray-200 shadow-sm flex flex-col items-center gap-4">
        {!isConfirmation && <div className="p-4 bg-white rounded-full shadow-inner text-[#b71c1c]">{questions[step].icon}</div>}
        {isConfirmation && <div className="p-4 bg-red-100 rounded-full shadow-inner text-red-600 animate-pulse"><AlertTriangle className="w-16 h-16" /></div>}
        <h2 className="text-3xl font-black leading-tight text-gray-900">
          {qText}
        </h2>
      </div>

      <div className="flex gap-4 w-full h-72 lg:h-80 mt-2">
        <button 
          onClick={() => { isActiveRef.current=false; allowRestartRef.current=false; if(recognitionRef.current) recognitionRef.current.stop(); handleAnswer(true); }}
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
          onClick={() => { isActiveRef.current=false; allowRestartRef.current=false; if(recognitionRef.current) recognitionRef.current.stop(); handleAnswer(false); }}
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

      <div className="text-center text-gray-400 font-bold uppercase tracking-widest mt-4">
          Or speak "Yes" / "No"
      </div>
    </div>
  );
};

