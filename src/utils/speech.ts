import { UserPreferences } from '../types';

export const speakAudio = (text: string, preferences: UserPreferences, force: boolean = false, onEnd?: () => void) => {
  // Respect silent mode
  if (!preferences.voiceFeedback && !force) {
    if (onEnd) onEnd();
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop playing whatever is currently playing
    
    // Safety check to avoid very long TTS
    if (text.length > 100) {
      console.warn("TTS string too long, clipping for safety.");
      text = text.substring(0, 100);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (onEnd) {
      utterance.onend = () => {
        onEnd();
      };
      utterance.onerror = (e) => {
        console.warn("SpeechSynthesisError", e);
        onEnd();
      };
    }

    // HINGLISH tuning
    // Use en-IN base for English/Hinglish blend, slightly faster rate so it doesn't drag
    utterance.lang = preferences.language === 'hinglish' ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.1; 
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  } else {
    if (onEnd) onEnd();
  }
};
