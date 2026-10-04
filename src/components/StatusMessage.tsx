import styles from './StatusMessage.module.css';

type StatusAction = {
  label: string;
  onClick: () => void;
};

type StatusMessageProps = {
  title: string;
  details?: string;
  /** Buttons under the text; the first one is the main action. */
  actions?: StatusAction[];
};

export function StatusMessage({ title, details, actions = [] }: StatusMessageProps) {
  return (
    <section className={styles.status} role="status">
      <p className={styles.title}>{title}</p>
      {details && <p className={styles.details}>{details}</p>}
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action, index) => (
            <button
              className={index === 0 ? styles.primary : styles.secondary}
              key={action.label}
              type="button"
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
