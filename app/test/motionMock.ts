import React from "react";

// Strips motion-specific props so they don't land on DOM elements
function motionEl(tag: string) {
  return function MotionStub({
    children,
    layoutId: _layoutId,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    whileHover: _whileHover,
    whileTap: _whileTap,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) {
    return React.createElement(tag, rest, children);
  };
}

export const motion = new Proxy({} as Record<string, ReturnType<typeof motionEl>>, {
  get: (_target, tag: string) => motionEl(tag),
});

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const LayoutGroup = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);
