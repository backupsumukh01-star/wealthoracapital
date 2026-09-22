'use client'

import type { ElementType, ReactNode } from 'react'
import type { Variants } from 'framer-motion'

import { cn } from '@/lib/cn'

import { DURATION, EASE_OUT } from './motion-tokens'
import { useMotionComponent } from './use-motion-component'

export interface StaggerGroupProps {
  children: ReactNode
  className?: string
  as?: ElementType
  /** 60ms between siblings. Past eight items the delay stops being charming. */
  stagger?: number
  delay?: number
  amount?: number
}

const containerVariants = (stagger: number, delay: number): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
})

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slower, ease: EASE_OUT },
  },
}

/** Wraps a grid or list; each `<StaggerItem>` inside inherits the timing. */
export function StaggerGroup({
  children,
  className,
  as = 'div',
  stagger = 0.06,
  delay = 0,
  amount = 0.15,
}: StaggerGroupProps) {
  const Component = useMotionComponent(as)

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={containerVariants(stagger, delay)}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  const Component = useMotionComponent(as)

  return (
    <Component variants={itemVariants} className={cn(className)}>
      {children}
    </Component>
  )
}
