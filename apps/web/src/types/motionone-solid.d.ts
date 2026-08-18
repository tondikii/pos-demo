// @motionone/solid ships types at dist/types/index.d.ts but its package.json
// "exports" lacks a "types" condition, so TS moduleResolution "bundler" can't
// resolve them. Mirror the real API (MotionProxy) here until upstream fixes it.
declare module '@motionone/solid' {
  import type { ParentProps } from 'solid-js'
  import type { JSX } from 'solid-js/jsx-runtime'

  export interface MotionEventHandlers {
    onMotionStart?: (event: unknown) => void
    onMotionComplete?: (event: unknown) => void
    onHoverStart?: (event: unknown) => void
    onHoverEnd?: (event: unknown) => void
    onPressStart?: (event: unknown) => void
    onPressEnd?: (event: unknown) => void
    onViewEnter?: (event: unknown) => void
    onViewLeave?: (event: unknown) => void
  }

  export type Options = {
    initial?: false | Record<string, unknown> | string
    animate?: Record<string, unknown> | string
    inView?: Record<string, unknown> | string
    hover?: Record<string, unknown> | string
    press?: Record<string, unknown> | string
    exit?: Record<string, unknown> | string
    variants?: Record<string, Record<string, unknown>>
    inViewOptions?: { amount?: number | 'some' | 'all'; once?: boolean; margin?: string }
    transition?: Record<string, unknown>
  }

  export type MotionComponentProps = ParentProps<MotionEventHandlers & Options>

  export type MotionProxyComponent<T> = (props: T & MotionComponentProps) => JSX.Element

  export type MotionProxy = {
    [K in keyof JSX.IntrinsicElements]: MotionProxyComponent<JSX.IntrinsicElements[K]>
  } & MotionComponent

  export type MotionComponent = {
    <T extends keyof JSX.IntrinsicElements>(
      props: JSX.IntrinsicElements[T] & MotionComponentProps & { tag?: T }
    ): JSX.Element
  }

  export const motion: MotionProxy
  export const Motion: MotionProxy
  export const Presence: (props: ParentProps<{ initial?: boolean }>) => JSX.Element
  export function createMotion(
    target: Element,
    options: Options | (() => Options)
  ): unknown
}
