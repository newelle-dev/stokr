import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface LogoMarkProps extends Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> {
  className?: string;
  alt?: string;
}

export function LogoMark({ className, alt = 'Stokr logo mark', ...props }: LogoMarkProps) {
  return (
    <Image
      src="/logo-mark.svg"
      alt={alt}
      width={32}
      height={32}
      className={className}
      priority
      {...props}
    />
  );
}

export interface LogoProps extends Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> {
  className?: string;
  alt?: string;
}

export function Logo({
  className,
  alt = 'Stokr logo',
  width = 115,
  height = 64,
  priority = true,
  ...props
}: LogoProps) {
  return (
    <>
      <Image
        src="/logo-dark.svg"
        alt={alt}
        width={width}
        height={height}
        className={cn('dark:hidden', className)}
        priority={priority}
        {...props}
      />
      <Image
        src="/logo.svg"
        alt={alt}
        width={width}
        height={height}
        className={cn('hidden dark:block', className)}
        priority={priority}
        {...props}
      />
    </>
  );
}

