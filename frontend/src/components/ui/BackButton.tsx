import { motion } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Reusable BackButton component for multi-step flows
 * Features enhanced visibility, hover/tap feedback, and consistent styling
 */
export function BackButton({ onClick, label = 'Back', className = '' }: BackButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ 
        scale: 1.02,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`
        inline-flex items-center gap-2
        px-4 py-2.5
        text-sm sm:text-base font-medium
        text-gray-300 hover:text-white
        bg-white/5 hover:bg-white/10
        border border-white/10 hover:border-white/20
        rounded-xl
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-purple-500/50
        ${className}
      `}
    >
      <ArrowBackIcon sx={{ fontSize: 18 }} />
      <span>{label}</span>
    </motion.button>
  );
}
