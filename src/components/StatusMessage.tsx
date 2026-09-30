import styles from './StatusMessage.module.css'

type StatusMessageProps = {
  title: string
  details?: string
}

export function StatusMessage({ title, details }: StatusMessageProps) {
  return (
    <section className={styles.status} role="status">
      <p className={styles.title}>{title}</p>
      {details && <p className={styles.details}>{details}</p>}
    </section>
  )
}
