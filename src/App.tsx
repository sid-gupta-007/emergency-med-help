import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Phone, MapPin, Activity, Droplets, Navigation, Volume2, ArrowLeft, VolumeX, Settings as SettingsIcon } from "lucide-react";
import { AllocationResult, Hospital, Ambulance, BloodBank, UserPreferences } from "./types";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { SOSButton } from "./components/SOSButton";
import { VoiceInput } from "./components/VoiceInput";
import { GuidedMode } from "./components/GuidedMode";
import { SetupFlow } from "./components/SetupFlow";
import { SettingsPanel } from "./components/SettingsPanel";
import { speakAudio } from "./utils/speech";
import { offlineAllocate } from "./utils/allocationLogic";

L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });

export default function App() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [step, setStep] = useState<"home" | "voice" | "guided" | "allocating" | "result">("home");
  const [emergencyDescription, setEmergencyDescription] = useState("");
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const [explanation, setExplanation] = useState<string>("Analyzing response...");
  const [allResources, setAllResources] = useState<{hospitals: Hospital[], ambulances: Ambulance[], bloodBanks: BloodBank[]} | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Load prefs
    const saved = localStorage.getItem('sera_prefs');
    if (saved) {
      const parsedPrefs = JSON.parse(saved);
      setPrefs(parsedPrefs);
      if (parsedPrefs.setupComplete && parsedPrefs.mode === 'voice') {
          setStep("voice");
      }
    } else {
      setPrefs({ mode: null, language: 'hinglish', voiceFeedback: false, setupComplete: false });
    }

    fetch("/api/resources")
      .then(res => res.json())
      .then(data => setAllResources(data))
      .catch((e) => {
          setIsOffline(true);
          console.warn("Offline mode active.");
      });
    
    // Default Ghaziabad location
    setUserLocation({ lat: 28.6650, lng: 77.4300 });
  }, []);

  const handleSetupComplete = (newPrefs: UserPreferences) => {
    setPrefs(newPrefs);
    localStorage.setItem('sera_prefs', JSON.stringify(newPrefs));
    if (newPrefs.voiceFeedback) {
        speakAudio("Setup complete. Dabaye ya bole madad ke liye.", newPrefs, true, () => {
            if (newPrefs.mode === 'voice') setStep("voice");
        });
    } else {
        if (newPrefs.mode === 'voice') setStep("voice");
    }
  };

  const speak = (text: string) => {
      if (prefs) speakAudio(text, prefs);
  };

  const handleSaveSettings = (newPrefs: UserPreferences, resetFlow: boolean) => {
    setPrefs(newPrefs);
    localStorage.setItem('sera_prefs', JSON.stringify(newPrefs));
    if (resetFlow) {
        window.speechSynthesis?.cancel();
        setStep(newPrefs.mode === 'voice' ? 'voice' : 'home');
        setEmergencyDescription('');
    } else if (newPrefs.mode === 'voice' && step === 'home') {
        setStep('voice');
    }
    setIsSettingsOpen(false);
  };

  const toggleVoice = () => {
      if (prefs) {
          const newPrefs = { ...prefs, voiceFeedback: !prefs.voiceFeedback };
          setPrefs(newPrefs);
          localStorage.setItem('sera_prefs', JSON.stringify(newPrefs));
          if (!newPrefs.voiceFeedback && window.speechSynthesis) {
              window.speechSynthesis.cancel();
          }
      }
  };

  const handleSOS = () => {
    if (prefs?.mode === 'touch') {
        setStep("guided");
    } else {
        speak("Emergency activated. Say Ambulance or Help.");
        setStep("voice");
    }
  };

  const goBack = () => {
    window.speechSynthesis?.cancel();
    setStep("home");
  };

  const submitEmergency = async (description: string) => {
    const finalDesc = description.trim() || "Emergency requested";
    setEmergencyDescription(finalDesc);
    setStep("allocating");
    setAllocation(null);
    speak("Connecting...");

    try {
      let data;
      // If offline flag is true, use purely offline engine
      if (isOffline) {
          data = { 
              success: true, 
              allocation: offlineAllocate(finalDesc, userLocation?.lat || 28.6650, userLocation?.lng || 77.4300) 
          };
      } else {
          // Attempt Fast Allocation via backend
          const resp = await fetch("/api/allocate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emergencyDescription: finalDesc, userLocation })
          });
          data = await resp.json();
      }

      if (!data.success) {
        alert("Error: " + data.error);
        setStep("home");
        return;
      }
      
      setAllocation(data.allocation);
      setExplanation(data.allocation.explanation);
      setStep("result");

      // Short TTS
      const msg = [];
      if (data.allocation.ambulance) msg.push(`Ambulance aa rahi hai.`);
      if (data.allocation.hospital) msg.push(`Hospital assigned.`);
      speak(msg.join(" "));

      // Async Explain if online
      if (!isOffline) {
          fetch("/api/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emergencyDescription: finalDesc, allocation: data.allocation })
          })
          .then(res => res.json())
          .then(explainData => {
            if (explainData.explanation) setExplanation(explainData.explanation);
          })
          .catch(console.error);
      } else {
          setExplanation("Offline Mode Active. Fast allocation successful.");
      }

    } catch (e: any) {
      console.warn("Fallback to offline...");
      setIsOffline(true);
      const fallbackResult = offlineAllocate(finalDesc, userLocation?.lat || 28.6650, userLocation?.lng || 77.4300);
      setAllocation(fallbackResult);
      setExplanation("Offline Mode Active.");
      setStep("result");
      speak("Ambulance aa rahi hai. Offline mode.");
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "bg-[#b71c1c] text-white";
      case "high": return "bg-orange-600 text-white";
      case "moderate": return "bg-yellow-500 text-black";
      default: return "bg-blue-600 text-white";
    }
  };

  if (!prefs) return <div className="p-8 text-center"><Activity className="animate-spin w-12 h-12 mx-auto" /></div>;

  if (!prefs.setupComplete) {
      return <SetupFlow onComplete={handleSetupComplete} />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 font-sans text-gray-900 pb-28 selection:bg-red-200 flex flex-col ${prefs.mode === 'accessible' ? 'text-xl' : ''}`}>
      {isOffline && (
          <div className="bg-orange-500 text-white text-center font-bold px-2 py-1 text-sm tracking-wide">
              OFFLINE MODE ACTIVED - ALLOCATING LOCALLY
          </div>
      )}

      <header className="bg-white border-b-4 border-[#b71c1c] p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter text-[#b71c1c]">
          <Activity className="w-8 h-8" />
          SERA 112
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95"
          aria-label="Settings"
        >
          <SettingsIcon className="w-7 h-7 text-gray-800" />
        </button>
      </header>

      <main className="max-w-xl mx-auto flex-grow flex flex-col gap-6 mt-6 overflow-hidden w-full px-4">
          <AnimatePresence mode="wait">
            
            {step === "home" && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center flex-grow py-8 gap-12"
                role="main"
              >
                <div className="text-center" aria-live="polite">
                  <h1 className="text-4xl font-black leading-tight text-[#b71c1c]">Tap for Help</h1>
                  <p className="text-xl font-bold mt-2 text-gray-500">Madaad ke liye lal button dabayen</p>
                </div>

                <SOSButton onClick={handleSOS} />

                <div 
                  className="flex flex-col items-center text-gray-500 font-bold tracking-wide border-2 border-gray-200 px-8 py-5 rounded-3xl mt-4 cursor-pointer bg-white hover:bg-gray-50 shadow-sm w-full" 
                  onClick={() => { speak('Bystander mode active.'); setStep('guided'); }}
                  role="button"
                  tabIndex={0}
                >
                  <p className="text-xl uppercase tracking-widest leading-none text-gray-800">Bystander Mode</p>
                  <span className="text-sm mt-2 opacity-80">(I am helping someone else)</span>
                </div>
              </motion.div>
            )}

          {step === "voice" && (
             <motion.div key="voice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
               <VoiceInput 
                  onSubmit={submitEmergency} 
                  onCancel={() => setStep('home')}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  preferences={prefs}
               />
             </motion.div>
          )}

          {step === "guided" && (
             <motion.div key="guided" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GuidedMode onSubmit={submitEmergency} preferences={prefs} />
             </motion.div>
          )}

          {step === "allocating" && (
            <motion.div key="allocating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center flex-grow min-h-[50vh] gap-8">
              <div className="relative">
                <div className="absolute inset-0 border-8 border-red-100 rounded-full animate-ping"></div>
                <div className="bg-[#b71c1c] rounded-full p-8 text-white z-10 relative shadow-2xl">
                  <Activity className="w-20 h-20 animate-pulse" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-center px-4">Contacting Nearest<br/>Responders...</h2>
            </motion.div>
          )}

          {step === "result" && allocation && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 pb-12 w-full">
              
              <div className={`p-4 rounded-3xl flex items-center gap-4 text-white shadow-lg ${getSeverityColor(allocation.severity)}`}>
                <AlertCircle className="w-10 h-10 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-black text-2xl tracking-tight uppercase leading-none">{allocation.severity} PRIORITY</span>
                  <span className="font-medium opacity-90 mt-1">{allocation.extractedEmergencyType}</span>
                </div>
              </div>

              {/* Action Cards */}
              <div className="flex flex-col gap-4 mt-2">
                
                {allocation.ambulance && (
                  <div className="bg-white border-4 border-blue-500 p-6 rounded-3xl shadow-md flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <Navigation className="w-48 h-48" />
                    </div>
                    <div className="flex items-center gap-2 text-blue-800 font-black text-2xl uppercase tracking-tight relative z-10">
                      Ambulance Dispatched
                    </div>
                    <div className="flex justify-between items-end mt-4 relative z-10">
                      <div className="bg-gray-100 px-5 py-3 rounded-2xl shadow-inner">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest text-center">Vehicle</p>
                        <p className="font-black text-3xl text-gray-900 mt-1">{allocation.ambulance.vehicleNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">ETA</p>
                        <p className="font-black text-5xl text-blue-600 animate-pulse">~4m</p>
                      </div>
                    </div>
                  </div>
                )}

                {allocation.hospital && (
                  <div className="bg-white border-4 border-green-500 p-6 rounded-3xl shadow-md relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5">
                        <Activity className="w-48 h-48" />
                    </div>
                    <div className="flex items-center gap-2 text-green-800 font-black text-2xl uppercase tracking-tight mb-4 relative z-10">
                      Hospital Prepared
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-3xl font-black text-gray-900 leading-tight">{allocation.hospital.name}</h4>
                      <div className="flex gap-4 mt-4">
                         <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-2xl flex-1 text-center">
                           <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">ICU Beds</span>
                           <span className="block font-black text-2xl text-green-800 mt-1">{allocation.hospital.icuAvailable}</span>
                         </div>
                         <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl flex-1 text-center">
                           <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Gen Beds</span>
                           <span className="block font-black text-2xl text-gray-800 mt-1">{allocation.hospital.bedsAvailable}</span>
                         </div>
                      </div>
                    </div>
                    <a href={`tel:${allocation.hospital.contact}`} className="mt-6 w-full flex items-center justify-center gap-3 bg-green-700 hover:bg-green-800 text-white py-5 rounded-2xl font-black text-2xl shadow-xl active:scale-95 transition-all relative z-10">
                      <Phone className="w-8 h-8" /> CALL DESK
                    </a>
                  </div>
                )}

                {/* AI Explanation (Secondary) */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 mt-2 flex gap-4 text-gray-800 items-start">
                    <button 
                        onClick={() => speak(explanation)} 
                        className="bg-gray-100 p-3 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors shrink-0"
                        aria-label="Replay explanation"
                    >
                        <Volume2 className="w-6 h-6 text-gray-600" />
                    </button>
                    <p className="text-lg font-semibold leading-snug mt-1">{explanation}</p>
                </div>
              </div>

              {/* Map View */}
              <div className="bg-white p-2 rounded-3xl shadow-md border-2 border-gray-200 h-64 relative mt-2 z-10 overflow-hidden">
                 {userLocation && (
                    <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={13} style={{ height: "100%", width: "100%", borderRadius: "1rem", zIndex: 1, backgroundColor: '#f3f4f6' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      
                      <Marker position={[userLocation.lat, userLocation.lng]}>
                        <Popup>Emergency Site</Popup>
                      </Marker>

                      {allResources?.ambulances.map(a => (
                        <Marker key={a.id} position={[a.location.lat, a.location.lng]}>
                          <Popup>{a.vehicleNumber} {a.id === allocation?.recommendedAmbulanceId ? "(YOUR AMBULANCE)" : ""}</Popup>
                        </Marker>
                      ))}
                      {allResources?.hospitals.map(h => (
                        <Marker key={h.id} position={[h.location.lat, h.location.lng]}>
                          <Popup>{h.name}</Popup>
                        </Marker>
                      ))}

                    </MapContainer>
                 )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Thumb-friendly Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 pb-8 flex justify-between items-center z-50">
        <button 
          onClick={goBack} 
          disabled={step === "home"}
          className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xl transition-all ${step !== "home" ? 'bg-gray-900 text-white shadow-md hover:bg-gray-800 active:scale-95' : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'}`}
          aria-label="Go Back"
        >
          <ArrowLeft className="w-8 h-8"/> {prefs.language === 'hinglish' ? 'Peeche / Back' : 'Go Back'}
        </button>

        <button
          onClick={toggleVoice}
          className={`p-4 rounded-2xl transition-all ${prefs.voiceFeedback ? 'bg-blue-100 text-blue-800 shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          aria-label={prefs.voiceFeedback ? "Mute Voice" : "Enable Voice"}
        >
          {prefs.voiceFeedback ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
        </button>
      </div>

      {isSettingsOpen && prefs && (
          <SettingsPanel 
             prefs={prefs} 
             onClose={() => setIsSettingsOpen(false)} 
             onSave={handleSaveSettings} 
             isFlowActive={step !== 'home'} 
          />
      )}
    </div>
  );
}
