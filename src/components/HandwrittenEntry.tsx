import React, { useEffect, useState } from 'react';

interface HandwrittenEntryProps {
  text: string;
  animate?: boolean;
  variant?: 'input' | 'output';
  onAnimationEnd?: () => void;
}

const HandwrittenEntry: React.FC<HandwrittenEntryProps> = ({
  text,
  animate = false,
  variant = 'input',
  onAnimationEnd,
}) => {
  const [displayed, setDisplayed] = useState(animate ? '' : text);

  useEffect(() => {
    if (!animate) {
      setDisplayed(text);
      return;
    }

    setDisplayed('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        onAnimationEnd?.();
      }
    }, 32);

    return () => window.clearInterval(timer);
  }, [text, animate, onAnimationEnd]);

  const isWriting = animate && displayed.length < text.length;

  return (
    <div
      className={`ledger-line ${variant === 'output' ? 'ledger-line--output' : 'ledger-line--input'}`}
      role="listitem"
    >
      <p className="ledger-handwriting">
        <span>{displayed}</span>
        {isWriting && <span className="ledger-pen-cursor" aria-hidden="true" />}
      </p>
    </div>
  );
};

export default HandwrittenEntry;
