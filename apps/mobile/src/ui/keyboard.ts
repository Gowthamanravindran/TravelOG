import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** How tall the on-screen keyboard is right now, in points; 0 when it is closed. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setHeight(e?.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/** Calls `onHide` each time the keyboard closes, however it was closed. */
export function useKeyboardHidden(onHide: () => void): void {
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => sub.remove();
  }, [onHide]);
}
