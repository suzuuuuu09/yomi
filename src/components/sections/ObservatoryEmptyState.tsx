import { Plus } from "lucide-react";
import styles from "@/components/observatory.module.css";

export default function ObservatoryEmptyState({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <section
      className={styles.emptyState}
      aria-labelledby="empty-universe-title"
    >
      <h1 id="empty-universe-title">あなたの宇宙は、ここから始まる。</h1>
      <p>最初の本を登録して、自分だけの星空を作ろう。</p>
      <button type="button" className={styles.primaryButton} onClick={onAdd}>
        <Plus size={20} aria-hidden="true" />
        最初の星を生み出す
      </button>
    </section>
  );
}
