import { MatrixForm } from './MatrixForm';

interface MatrixSectionProps {
  onLimitReached?: () => void;
  isLimitReached?: boolean;
  onSuccess?: () => void;
}

export function MatrixSection({ onLimitReached, isLimitReached, onSuccess }: MatrixSectionProps) {
  return (
    <MatrixForm
      onLimitReached={onLimitReached}
      isLimitReached={isLimitReached}
      onSuccess={onSuccess}
    />
  );
}
