import { useState, type ReactNode } from 'react';

interface Step {
  color: string;
  bg: string;
  icon: ReactNode;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    color: 'var(--gold)',
    bg: 'rgba(255,214,10,0.10)',
    icon: (
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    ),
    title: 'Ajoute tes joueurs',
    desc: "Dans Admin → Mes joueurs, saisis le prénom de chaque membre de l'équipe. Tu n'auras à le faire qu'une seule fois.",
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
    title: 'Ouvre le vote',
    desc: "Avant chaque match, sélectionne les joueurs présents et lance le vote. L'accès se fait instantanément depuis leur téléphone.",
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
    title: 'Partage le lien',
    desc: "Envoie le lien d'équipe dans ton groupe de discussion. Chaque joueur vote anonymement depuis son téléphone, sans app à installer.",
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
    title: 'Dévoile les résultats',
    desc: "Lance le dépouillement depuis le match en cours. Les votes se révèlent un par un pour créer la surprise. La Pépite et le Citron sont couronnés !",
  },
];

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 env(safe-area-inset-bottom, 0)',
    }}>
      <div style={{
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
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--label1)', letterSpacing: '-0.02em', marginBottom: 10 }}>
            {s.title}
          </div>
          <div style={{ fontSize: 15, color: 'var(--label3)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
            {s.desc}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {step === 0 ? (
            <button onClick={onClose} style={{
              flex: 1, padding: '13px', background: 'var(--bg3)', border: 'none',
              borderRadius: 14, fontSize: 15, fontWeight: 600, color: 'var(--label3)', cursor: 'pointer',
            }}>
              Passer
            </button>
          ) : (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: '13px', background: 'var(--bg3)', border: 'none',
              borderRadius: 14, fontSize: 15, fontWeight: 600, color: 'var(--label3)', cursor: 'pointer',
            }}>
              ← Retour
            </button>
          )}
          <button onClick={() => isLast ? onClose() : setStep(s => s + 1)} style={{
            flex: 2, padding: '13px', background: s.color, border: 'none',
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            color: step === 1 || step === 2 ? '#fff' : '#000', cursor: 'pointer',
          }}>
            {isLast ? "C'est parti ! 🚀" : 'Suivant →'}
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
