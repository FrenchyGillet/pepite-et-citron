import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useModalA11y } from '@/hooks/useModalA11y';
import { track, EVENTS } from '@/utils/analytics';
import { useT, type TKey } from '@/i18n';

interface Step {
  color: string;
  bg: string;
  icon: ReactNode;
  title: TKey;
  desc: TKey;
}

const STEPS: Step[] = [
  {
    color: 'var(--gold)',
    bg: 'rgba(255,214,10,0.10)',
    icon: (
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    ),
    title: 'onboarding.playersTitle',
    desc: 'onboarding.playersDesc',
  },
  {
    color: '#34C759',
    bg: 'rgba(52,199,89,0.10)',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01"/>
      </>
    ),
    title: 'onboarding.voteTitle',
    desc: 'onboarding.voteDesc',
  },
  {
    color: '#007AFF',
    bg: 'rgba(0,122,255,0.10)',
    icon: (
      <>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </>
    ),
    title: 'onboarding.shareTitle',
    desc: 'onboarding.shareDesc',
  },
  {
    color: 'var(--lemon)',
    bg: 'rgba(170,221,0,0.10)',
    icon: (
      <>
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </>
    ),
    title: 'onboarding.revealTitle',
    desc: 'onboarding.revealDesc',
  },
];

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const t = useT();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  // The step is read through a ref so `close` stays stable: useModalA11y
  // re-runs its focus trap whenever its callback changes.
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  const close = useCallback(() => {
    const reached = stepRef.current + 1;
    track(EVENTS.ONBOARDING_CLOSED, { step: reached, completed: reached === STEPS.length });
    onClose();
  }, [onClose]);
  const dialogRef = useModalA11y(close);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom, 0)',
      }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('onboarding.ariaLabel', { step: step + 1, total: STEPS.length, title: t(s.title) })}
        style={{
          background: 'var(--bg2)', borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: 480, padding: '8px 24px 32px',
          animation: 'slideUp 0.3s ease',
        }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--separator)', margin: '12px auto 28px' }}/>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 6, borderRadius: 3,
              width: i === step ? 20 : 6,
              background: i === step ? s.color : 'var(--bg4)',
              transition: 'all 0.3s ease',
            }}/>
          ))}
        </div>

        <div style={{
          width: 72, height: 72, borderRadius: 20, background: s.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke={s.color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {s.icon}
          </svg>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--label)', letterSpacing: '-0.02em', marginBottom: 10 }}>
            {t(s.title)}
          </div>
          <div style={{ fontSize: 15, color: 'var(--label3)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
            {t(s.desc)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {step === 0 ? (
            <button onClick={close} style={{
              flex: 1, padding: '13px', background: 'var(--bg3)', border: 'none',
              borderRadius: 14, fontSize: 15, fontWeight: 600, color: 'var(--label3)', cursor: 'pointer',
            }}>
              {t('onboarding.skip')}
            </button>
          ) : (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: '13px', background: 'var(--bg3)', border: 'none',
              borderRadius: 14, fontSize: 15, fontWeight: 600, color: 'var(--label3)', cursor: 'pointer',
            }}>
              {t('common.back')}
            </button>
          )}
          <button onClick={() => isLast ? close() : setStep(s => s + 1)} style={{
            flex: 2, padding: '13px', background: s.color, border: 'none',
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            color: step === 1 || step === 2 ? '#fff' : '#000', cursor: 'pointer',
          }}>
            {isLast ? t('onboarding.go') : t('onboarding.next')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
