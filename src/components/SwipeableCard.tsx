import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
  type TapInfo,
} from 'motion/react';
import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import styles from './SwipeableCard.module.css';

const SWIPE_DISTANCE_RATIO = 0.3;
const SWIPE_VELOCITY = 500;
const MAX_ROTATION_DEG = 12;
const FLY_OUT_DURATION_S = 0.25;
const TAP_MAX_DISTANCE_PX = 8;

export type SwipeableCardHandle = {
  swipe: (remembered: boolean) => void;
};

type SwipeableCardProps = {
  ref?: Ref<SwipeableCardHandle>;
  children: ReactNode;
  onTap: () => void;
  onAnswer: (remembered: boolean) => void;
};

export function SwipeableCard({ ref, children, onTap, onAnswer }: SwipeableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isLeavingRef = useRef(false);
  const tapStartRef = useRef({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG]);
  const rememberHintOpacity = useTransform(x, [0, 100], [0, 1]);
  const forgetHintOpacity = useTransform(x, [-100, 0], [1, 0]);

  function flyOut(remembered: boolean) {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    const cardWidth = cardRef.current?.offsetWidth ?? 0;
    const distance = window.innerWidth / 2 + cardWidth;
    animate(x, remembered ? distance : -distance, {
      duration: shouldReduceMotion ? 0 : FLY_OUT_DURATION_S,
      ease: 'easeIn',
    }).then(() => onAnswer(remembered));
  }

  function returnToCenter() {
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
  }

  function handleDragEnd(event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    // The browser took over the gesture (e.g. started moving the page) — the finger was not lifted.
    if (event.type === 'pointercancel') {
      returnToCenter();
      return;
    }

    const cardWidth = cardRef.current?.offsetWidth ?? 0;
    const { x: offsetX } = info.offset;
    const { x: velocityX } = info.velocity;
    const isFarEnough = Math.abs(offsetX) > cardWidth * SWIPE_DISTANCE_RATIO;
    const isFastEnough =
      Math.abs(velocityX) > SWIPE_VELOCITY && Math.sign(velocityX) === Math.sign(offsetX);

    if (offsetX !== 0 && (isFarEnough || isFastEnough)) {
      flyOut(offsetX > 0);
      return;
    }

    returnToCenter();
  }

  function handleTapStart(_event: PointerEvent, info: TapInfo) {
    tapStartRef.current = info.point;
  }

  function handleTap(_event: PointerEvent, info: TapInfo) {
    if (isLeavingRef.current) return;

    // A short swipe can still end as a tap; ignore it if the pointer actually moved.
    const start = tapStartRef.current;
    const distance = Math.hypot(info.point.x - start.x, info.point.y - start.y);
    if (distance > TAP_MAX_DISTANCE_PX) return;

    onTap();
  }

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    // iOS Safari may still scroll or bounce the page under the finger despite `touch-action: none`,
    // which cancels the pointer mid-swipe.
    function handleTouchMove(event: TouchEvent) {
      event.preventDefault();
    }

    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => element.removeEventListener('touchmove', handleTouchMove);
  }, []);

  useImperativeHandle(ref, () => ({ swipe: flyOut }));

  return (
    <motion.div
      className={styles.swipeable}
      ref={cardRef}
      style={{ x, rotate, touchAction: 'none' }}
      drag="x"
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onTapStart={handleTapStart}
      onTap={handleTap}
    >
      {children}
      <motion.div
        className={`${styles.hint} ${styles.rememberHint}`}
        style={{ opacity: rememberHintOpacity }}
        aria-hidden
      >
        Помню
      </motion.div>
      <motion.div
        className={`${styles.hint} ${styles.forgetHint}`}
        style={{ opacity: forgetHintOpacity }}
        aria-hidden
      >
        Не помню
      </motion.div>
    </motion.div>
  );
}
