import { motion } from 'framer-motion'

const shimmer = {
  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.07) 75%)',
  backgroundSize: '400% 100%',
}

const boneAnimate = { backgroundPosition: ['100% 0%', '-100% 0%'] }
const boneTransition = { duration: 4, repeat: Infinity, ease: 'linear' }
const pulseAnimate = { opacity: [0.4, 1, 0.4] }
const pulseTransition = { duration: 2, repeat: Infinity, ease: 'easeInOut' }

function Bone({ width = '100%', height = 16, borderRadius = 8, style = {} }) {
  return (
    <motion.div
      animate={boneAnimate}
      transition={boneTransition}
      style={{ width, height, borderRadius, ...shimmer, ...style }}
    />
  )
}

function AccordionSkeleton({ labelWidth }) {
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '18px 20px',
      marginBottom: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Bone width={labelWidth} height={14} />
      <Bone width={12} height={12} borderRadius={4} style={{ flexShrink: 0, marginLeft: 16 }} />
    </div>
  )
}

export default function ReportSkeleton({ topOffset = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        top: topOffset,
        left: 0, right: 0, bottom: 0,
        background: '#070a0d',
        overflowY: 'auto',
        padding: '48px 12%',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 20,
      }}
    >
      {/* Generating label */}
      <motion.p
        animate={pulseAnimate}
        transition={pulseTransition}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 13,
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 36,
          letterSpacing: '0.04em',
        }}
      >
        Generating report...
      </motion.p>

      {/* Section heading */}
      <Bone width={160} height={22} borderRadius={6} style={{ marginBottom: 40 }} />

      {/* Score block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <Bone width={120} height={80} borderRadius={12} />
        <Bone width={480} height={18} borderRadius={6} />
        <Bone width={380} height={18} borderRadius={6} />
        <Bone width={420} height={18} borderRadius={6} />
      </div>

      {/* Body text paragraph */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
        <Bone width="100%" height={13} />
        <Bone width="96%" height={13} />
        <Bone width="88%" height={13} />
        <Bone width="93%" height={13} />
      </div>

      {/* Accordion sections */}
      <AccordionSkeleton labelWidth="38%" />
      <AccordionSkeleton labelWidth="32%" />
      <AccordionSkeleton labelWidth="35%" />
    </motion.div>
  )
}
