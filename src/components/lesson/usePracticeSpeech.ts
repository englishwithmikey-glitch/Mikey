import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech recognition is optional and browser-specific. Never use the
// transcript as a pronunciation score, and never request the microphone on load.
export function usePracticeSpeech(scope: string) {
  const recognition = useRef<any>(null);
  const generation = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const stop = useCallback(() => {
    generation.current++;
    recognition.current?.abort();
    recognition.current = null;
    if (audio.current) { audio.current.pause(); audio.current = null; }
    window.speechSynthesis?.cancel();
    setListening(false);
    setSpeaking(false);
  }, []);

  useEffect(() => {
    stop(); setTranscript(''); setMessage('');
    return stop;
  }, [scope, stop]);

  function speak(text: string, rate = 1, audioUrl?: string) {
    stop(); setMessage('');
    const current = generation.current;
    const tts = () => {
      if (current !== generation.current) return;
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setMessage('Thiết bị chưa hỗ trợ giọng đọc. Bạn vẫn có thể đọc và luyện trực tiếp.');
        setSpeaking(false); return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB'; utterance.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(item => item.lang.toLowerCase() === 'en-gb');
      if (voice) utterance.voice = voice;
      utterance.onend = () => { if (current === generation.current) setSpeaking(false); };
      utterance.onerror = () => {
        if (current === generation.current) { setSpeaking(false); setMessage('Không phát được giọng đọc. Vui lòng thử lại.'); }
      };
      setSpeaking(true); window.speechSynthesis.speak(utterance);
    };
    if (!audioUrl) { tts(); return; }
    const element = new Audio(audioUrl);
    audio.current = element; element.playbackRate = rate;
    element.onended = () => { if (current === generation.current) setSpeaking(false); };
    element.onerror = tts;
    setSpeaking(true); void element.play().catch(tts);
  }

  function startRecognition() {
    stop(); setTranscript(''); setMessage('');
    const BrowserRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!BrowserRecognition) {
      setMessage('Trình duyệt này chưa hỗ trợ nhận dạng. Bạn có thể tự nói, gõ ghi chú và tiếp tục.'); return;
    }
    const current = generation.current;
    try {
      const instance = new BrowserRecognition();
      instance.lang = 'en-GB'; instance.interimResults = false;
      instance.onresult = (event: any) => {
        if (current === generation.current) setTranscript(event.results[0][0].transcript);
      };
      instance.onerror = (event: any) => {
        if (current === generation.current) {
          setListening(false);
          setMessage(event.error === 'not-allowed' ? 'Micro chưa được cho phép. Bạn vẫn có thể tự luyện.' : 'Không nhận dạng được lời nói. Bạn có thể thử lại hoặc tự luyện.');
        }
      };
      instance.onend = () => { if (current === generation.current) setListening(false); };
      recognition.current = instance; instance.start(); setListening(true);
    } catch {
      setListening(false); setMessage('Không bật được micro. Bạn có thể tự luyện và tiếp tục.');
    }
  }
  return { speak, stop, startRecognition, speaking, listening, transcript, message };
}
