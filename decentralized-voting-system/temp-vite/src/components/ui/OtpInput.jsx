import React, { useRef, useEffect } from 'react';

export default function OtpInput({ length = 6, value = '', onChange, onComplete }) {
  const inputsRef = useRef([]);
  const vals = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first empty input when value changes and not full
    const firstEmpty = vals.findIndex((v) => !v);
    if (firstEmpty >= 0) {
      inputsRef.current[firstEmpty]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setChar = (index, char) => {
    const chars = value.split('');
    chars[index] = char;
    const next = chars.join('').slice(0, length);
    onChange?.(next);
    if (next.length === length && !next.includes('')) {
      onComplete?.(next);
    }
  };

  const handleChange = (e, index) => {
    const raw = e.target.value;
    // allow only digits
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    setChar(index, digit);
    // move focus to next
    inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (vals[index]) {
        // clear current
        const chars = value.split('');
        chars[index] = '';
        onChange?.(chars.join(''));
      } else {
        // move back
        inputsRef.current[index - 1]?.focus();
        const chars = value.split('');
        if (index > 0) chars[index - 1] = '';
        onChange?.(chars.join(''));
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange?.(text.padEnd(length, ''));
    if (text.length === length) onComplete?.(text);
  };

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          className="w-10 h-12 text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={vals[i]}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
        />
      ))}
    </div>
  );
}
