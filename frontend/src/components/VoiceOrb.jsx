import { useState, useEffect, useRef } from 'react';
import { Mic, Radio, Check, ArrowDownLeft } from 'lucide-react';

export default function VoiceOrb({ onVoiceInput, loading }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [justTransferred, setJustTransferred] = useState(false);

  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        startWaveform();
      };

      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        transcriptRef.current = currentText;
      };

      recognition.onerror = () => {
        setIsListening(false);
        stopWaveform();
      };

      recognition.onend = () => {
        setIsListening(false);
        stopWaveform();
      };

      recognitionRef.current = recognition;
    }

    return () => {
      stopWaveform();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) { }
      }
    };
  }, []);

  const startWaveform = () => {
    const animate = () => {
      setAudioLevel(Math.random() * 0.6 + 0.3);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  };

  const stopWaveform = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setAudioLevel(0);
  };


  const toggleVoiceMode = () => {
    if (isListening) {

      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      setIsListening(false);
      stopWaveform();

      const textToTransfer = transcriptRef.current || transcript;
      if (textToTransfer && textToTransfer.trim()) {
        transferToChatBox(textToTransfer);
      }
    } else {

      setTranscript('');
      transcriptRef.current = '';
      setJustTransferred(false);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          try { recognitionRef.current.stop(); } catch (err) { }
          setTimeout(() => {
            try { recognitionRef.current.start(); } catch (err) { }
          }, 150);
        }
      } else {
        setIsListening(true);
        startWaveform();
        setTranscript('Listening for instruction...');
      }
    }
  };

  const transferToChatBox = (text) => {
    if (!text || !text.trim()) return;
    if (onVoiceInput) {
      onVoiceInput(text.trim());
    }
    setJustTransferred(true);
    setTimeout(() => {
      setJustTransferred(false);
    }, 2500);
  };

  const quickPrompts = [
    { label: "API 510 Turnaround Approval Note", prompt: "Review scanned ultrasonic thickness testing report for Distillation Column C-101. Calculate corrosion rate and remaining life per API 510, check against ASME Sec VIII minimum wall thickness, and draft a formal PSU Approval Note (.docx) and calculation workbook (.xlsx)." },
    { label: "Heat Exchanger Simulation & Plot", prompt: "Write and execute a Python simulation for Shell & Tube Heat Exchanger E-204 in the sandbox. Calculate Heat Duty (Q), LMTD, and Overall Heat Transfer Coefficient (U) under counter-current flow (Hot: 280°C->160°C @ 35 kg/s; Cold: 45°C->130°C). Plot temperature profiles across tube length and verify energy conservation." },
    { label: "P&ID Safety & DBB Valve Audit", prompt: "Inspect the P&ID drawing for Crude Feed Pre-Flash Train (PID-ADU2-04-102-REV4). Identify all control valves and transmitters, check the bypass line around FV-104 against refinery standard SOP-SAF-402, flag missing Double Block and Bleed (DBB) isolation, and generate a visual safety audit." },
    { label: "GFR-2017 Tender Bid Evaluation", prompt: "Evaluate vendor technical bids for High-Pressure Boiler Feed Pump Spares against General Financial Rules (GFR 2017) Rule 144. Prepare a comparative evaluation note for the Tender Committee with commercial deviation analysis." }
  ];

  return (
    <div className="flex flex-col justify-between h-full p-6 bg-[#f4efe6] border-l border-[#e5ded1] select-none text-[#1c1917]">
      <div className="text-center space-y-1 pb-4 border-b border-[#e5ded1]">
        <div className="text-xs font-semibold tracking-wider uppercase text-[#1c1917]">
          Voice Dictation
        </div>
        <div className="text-[11px] text-[#78716c] font-mono">
          Speak & Transcribe directly to Chat Box
        </div>
      </div>
      <div className="my-auto flex flex-col items-center space-y-6">
        <div
          onClick={toggleVoiceMode}
          className="relative flex items-center justify-center cursor-pointer group"
          title={isListening ? "Click to stop & insert text to chat box" : "Click to start speaking"}
        >
          <div
            className={`absolute rounded-full transition-all duration-700 pointer-events-none ${isListening
              ? 'w-36 h-36 bg-[#ea580c]/15 animate-ping'
              : 'w-32 h-32 border border-[#d6cebf] opacity-40 group-hover:scale-105'
              }`}
          />
          <div
            className={`absolute rounded-full transition-all duration-700 pointer-events-none ${isListening
              ? 'w-32 h-32 border-2 border-dashed border-[#ea580c] animate-spin'
              : 'w-28 h-28 border border-[#d6cebf] group-hover:border-[#ea580c]/50'
              }`}
            style={{ animationDuration: isListening ? '5s' : '20s' }}
          />
          <div
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${isListening
              ? 'bg-[#ea580c] text-white shadow-orange-500/20 scale-105'
              : 'bg-[#ffffff] border-2 border-[#d6cebf] text-[#1c1917] group-hover:border-[#ea580c]'
              }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isListening
                ? 'bg-white text-[#ea580c]'
                : 'bg-[#faf8f5] text-[#57534e] group-hover:text-[#ea580c]'
                }`}
            >
              {isListening ? (
                <Radio className="w-5 h-5 animate-pulse" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>
        <div className="text-center space-y-2 max-w-[220px]">
          <button
            onClick={toggleVoiceMode}
            className={`px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all shadow-xs ${isListening
              ? 'bg-[#ea580c] text-white animate-pulse'
              : 'bg-[#ffffff] text-[#1c1917] hover:bg-[#ede7dc] border border-[#d6cebf]'
              }`}
          >
            {isListening ? 'CLICK TO FINISH & INSERT' : 'TAP MIC TO SPEAK'}
          </button>
          {isListening && (
            <div className="flex items-center justify-center space-x-1 h-5 pt-1">
              {[30, 60, 90, 50, 80, 40, 70].map((h, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-[#ea580c] rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(3, h * (audioLevel || 0.4))}px`,
                    opacity: 0.75 + idx * 0.03
                  }}
                />
              ))}
            </div>
          )}
          {justTransferred && (
            <div className="p-2 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[11px] text-[#16a34a] font-medium flex items-center justify-center space-x-1 shadow-xs">
              <Check className="w-3.5 h-3.5" />
              <span>Transferred to chat box!</span>
            </div>
          )}
          {transcript && !justTransferred && (
            <div className="p-2.5 rounded-lg bg-[#ffffff] border border-[#d6cebf] text-[11px] text-[#44403c] italic text-left shadow-sm">
              "{transcript}"
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2 pt-4 border-t border-[#e5ded1]">
        <div className="text-[10px] uppercase tracking-wider text-[#78716c] font-semibold px-1 flex items-center justify-between">
          <span>Quick Prompts</span>
          <span className="text-[9px] font-normal text-[#a8a29e]">Insert to chat</span>
        </div>
        <div className="space-y-1">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => transferToChatBox(qp.prompt)}
              disabled={loading}
              className="w-full text-left p-2 rounded-lg bg-[#ffffff] hover:bg-[#ede7dc] border border-[#e2dacb] hover:border-[#ea580c]/50 text-[11px] text-[#44403c] hover:text-[#1c1917] transition-all flex items-center justify-between group shadow-sm"
              title="Click to insert into chat box"
            >
              <span className="truncate">{qp.label}</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#a8a29e] group-hover:text-[#ea580c] shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
