import type { ReactNode } from 'react';
import styles from './StatusMessage.module.css';

type StatusAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type StatusMessageProps = {
  title: string;
  details?: string;
  /** Shown between the text and the buttons, e.g. a field the main action needs. */
  children?: ReactNode;
  /** Buttons under the text; the first one is the main action. */
  actions?: StatusAction[];
};

export function StatusMessage({ title, details, children, actions = [] }: StatusMessageProps) {
  return (
    <section className={styles.status} role="status">
      <p className={styles.title}>{title}</p>
      {details && <p className={styles.details}>{details}</p>}
      {children}
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action, index) => (
            <button
              className={index === 0 ? styles.primary : styles.secondary}
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
