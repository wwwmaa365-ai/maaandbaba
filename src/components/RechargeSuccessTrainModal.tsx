import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  Zap,
  Sparkles,
} from 'lucide-react';
import { trainAudio } from '../utils/trainAudio.ts';

export interface RechargeSuccessCelebrationData {
  txId: string;
  service: string;
  provider: string;
  targetAccount: string;
  amount: number;
  cashbackAmount: number;
  operatorRef: string;
}

interface RechargeSuccessTrainModalProps {
  data: RechargeSuccessCelebrationData | null;
  onClose: () => void;
}

export const RechargeSuccessTrainModal: React.FC<RechargeSuccessTrainModalProps> = ({
  data,
  onClose,
}) => {
  const [animRunKey, setAnimRunKey] = useState(0);
  const [muted, setMuted] = useState(trainAudio.getMuted());

  useEffect(() => {
    if (data) {
      trainAudio.playIndianTrainSuccessSound();
    }
  }, [data, animRunKey]);

  if (!data) return null;

  const handleReplay = () => {
    setAnimRunKey((prev) => prev + 1);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    trainAudio.setMuted(next);
    if (!next) {
      trainAudio.playIndianTrainSuccessSound();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <style>{`
        @keyframes expressTrainRun {
          0% { transform: translateX(-115%); }
          35% { transform: translateX(0%); }
          70% { transform: translateX(6%); }
          100% { transform: translateX(118%); }
        }
        @keyframes trackSleepersMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(-48px); }
        }
        @keyframes speedLinesSlide {
          0% { transform: translateX(100%); opacity: 0.9; }
          100% { transform: translateX(-120%); opacity: 0.2; }
        }
        .animate-express-train {
          animation: expressTrainRun 3.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .animate-track-sleepers {
          animation: trackSleepersMove 0.18s linear infinite;
        }
        .animate-speed-lines {
          animation: speedLinesSlide 0.55s linear infinite;
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Top Animated Indian Railways "Recharge Expres" Stage */}
        <div className="relative bg-gradient-to-b from-[#002B80] via-[#0047CC] to-[#001F5C] pt-6 pb-8 px-6 text-white overflow-hidden">
          {/* Top Bar Controls */}
          <div className="relative z-10 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Zap className="w-4 h-4 fill-amber-300" />
              <span>RECHARGE EXPRES SUPERFAST CONFIRMATION</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={muted ? 'Unmute Train Sound' : 'Mute Train Sound'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Overhead Catenary Wire & Speed Lines */}
          <div className="relative h-28 flex items-end overflow-hidden rounded-2xl bg-slate-950/35 border border-white/15 px-2 pb-3">
            {/* Overhead Electric Line */}
            <div className="absolute top-3 left-0 right-0 h-[1.5px] bg-amber-300/40" />

            {/* Speed Lines */}
            <div className="absolute top-8 left-0 right-0 flex justify-around pointer-events-none animate-speed-lines">
              <div className="w-16 h-0.5 bg-white/40 rounded-full" />
              <div className="w-24 h-0.5 bg-amber-300/50 rounded-full" />
              <div className="w-12 h-0.5 bg-sky-300/40 rounded-full" />
            </div>

            {/* Animated Indian Express Locomotive + Coach SVG */}
            <div
              key={animRunKey}
              className="relative z-10 w-full flex items-center justify-center animate-express-train"
            >
              <svg
                viewBox="0 0 380 76"
                className="w-full max-w-[350px] h-auto drop-shadow-lg"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Coach 1 (Left Passenger Coach) */}
                <rect x="6" y="18" width="142" height="42" rx="6" fill="#0052FF" stroke="#93C5FD" strokeWidth="1.5" />
                <rect x="6" y="34" width="142" height="7" fill="#FACC15" />
                {/* Coach Windows */}
                {[18, 42, 66, 90, 114].map((wx) => (
                  <rect
                    key={wx}
                    x={wx}
                    y="23"
                    width="16"
                    height="9"
                    rx="2"
                    fill="#E0F2FE"
                  />
                ))}
                {/* Coupler */}
                <rect x="148" y="46" width="10" height="6" fill="#64748B" />

                {/* Locomotive Body (Indian WAP-7 / Vande Bharat Express Livery) */}
                <path
                  d="M158 22C158 18.6863 160.686 16 164 16H318C332 16 346 28 354 42L360 52C362 56 359 60 354 60H158V22Z"
                  fill="url(#locoGrad)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Pantograph on Roof */}
                <path
                  d="M195 16L208 6L222 16M200 6H216"
                  stroke="#FACC15"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Golden Express Stripe */}
                <path d="M158 38H351L356 46H158V38Z" fill="#FACC15" />

                {/* Brand Text on Locomotive */}
                <text
                  x="172"
                  y="32"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="sans-serif"
                  letterSpacing="0.6"
                >
                  RECHARGE EXPRES
                </text>

                {/* Locomotive Cab Windshield */}
                <path
                  d="M316 21H334L345 34H316V21Z"
                  fill="#BAE6FD"
                />

                {/* Glowing Headlight Beam */}
                <polygon
                  points="358,48 380,38 380,58"
                  fill="#FEF08A"
                  opacity="0.75"
                />
                <circle cx="356" cy="48" r="3.5" fill="#FEF08A" />

                {/* Bogies & Wheels */}
                {[28, 52, 104, 128, 182, 210, 290, 320].map((cx) => (
                  <g key={cx}>
                    <circle cx={cx} cy="62" r="7" fill="#1E293B" stroke="#CBD5E1" strokeWidth="2" />
                    <circle cx={cx} cy="62" r="2.5" fill="#FACC15" />
                  </g>
                ))}

                <defs>
                  <linearGradient id="locoGrad" x1="158" y1="16" x2="360" y2="60" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0039A6" />
                    <stop offset="0.55" stopColor="#0066FF" />
                    <stop offset="1" stopColor="#0284C7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Steel Railway Track & Moving Sleepers */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-slate-900 overflow-hidden">
              <div className="w-[200%] h-full flex items-center gap-4 animate-track-sleepers">
                {Array.from({ length: 28 }).map((_, idx) => (
                  <div key={idx} className="w-3 h-2 bg-amber-500/50 rounded-xs shrink-0" />
                ))}
              </div>
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-300" />
            </div>
          </div>

          {/* Success Headline */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>INSTANT EXPRESS SETTLEMENT COMPLETED</span>
            </div>
            <div className="text-3xl font-extrabold font-mono tabular-nums mt-1">
              ₹{Number(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-blue-100 mt-0.5">
              {data.service} · {data.provider} ({data.targetAccount})
            </div>
          </div>
        </div>

        {/* Receipt & Audio Replay Body */}
        <div className="p-6 space-y-4">
          {data.cashbackAmount > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Instant Cashback Credited to Wallet!
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Double-entry reward ledger updated automatically
                  </div>
                </div>
              </div>
              <span className="text-base font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                +₹{Number(data.cashbackAmount).toFixed(2)}
              </span>
            </div>
          )}

          <div className="space-y-2 text-xs border-y border-slate-200 dark:border-slate-800 py-3.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction ID</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{data.txId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Operator / Gateway Ref</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{data.operatorRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Biller / Subscriber</span>
              <span className="font-mono text-slate-900 dark:text-white">{data.targetAccount}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReplay}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Replay Train Horn & Animation</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
