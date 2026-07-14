/**
 * Horizontal fulfillment tracker: Placed → Packed → Shipped → Delivered.
 * A cancelled order shows a single cancelled state instead.
 */
const STAGES = ['Placed', 'Packed', 'Shipped', 'Delivered'];

export default function OrderTimeline({ status }) {
  if (status === 'Cancelled') {
    return <div className="timeline cancelled">✕ Cancelled</div>;
  }

  const currentIndex = STAGES.indexOf(status);

  return (
    <div className="timeline">
      {STAGES.map((stage, i) => {
        const done = i <= currentIndex;
        const current = i === currentIndex;
        return (
          <div className={`t-step ${done ? 'done' : ''} ${current ? 'current' : ''}`} key={stage}>
            <span className="t-dot" />
            <span className="t-label">{stage}</span>
            {i < STAGES.length - 1 && <span className={`t-bar ${i < currentIndex ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}
