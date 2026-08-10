import { useState, useRef, useCallback } from 'react';

/**
 * Parse voice input for workout sets.
 * Patterns: "5 at 225 2 RIR", "5 reps at 225 pounds RIR 2", "5 at 225"
 * Returns: { reps, weight, rir } — rir may be null if not spoken
 */
function parseVoiceInput(transcript) {
  const t = transcript.toLowerCase().replace(/[.,]/g, '').trim();

  // Extract reps
  const repsMatch = t.match(/^(\d+)\s*(?:reps?)?/);
  const reps = repsMatch ? parseInt(repsMatch[1]) : null;

  // Extract weight — "at 225", "225 lbs", "225 pounds"
  const weightMatch = t.match(/at\s+(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/);
  const weight = weightMatch ? parseFloat(weightMatch[1] || weightMatch[2]) : null;

  // Extract RIR — "RIR 2", "2 RIR", "2 in reserve", comma then number
  const rirMatch = t.match(/(?:rir\s+(\d+)|(\d+)\s+rir|(\d+)\s+in\s+reserve|,\s*(\d+)\s*$)/);
  const rir = rirMatch ? parseInt(rirMatch[1] || rirMatch[2] || rirMatch[3] || rirMatch[4]) : null;

  return { reps, weight, rir };
}

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const startListening = useCallback((onResult) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setError(null);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      const parsed = parseVoiceInput(text);
      if (onResult) onResult(text, parsed);
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isListening, transcript, error, startListening, stopListening, parseVoiceInput };
}
