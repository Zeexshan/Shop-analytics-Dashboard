// zeeexshan: Utility functions for Shop Analytics Dashboard
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Developer: zeeexshan - UI utility functions

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// zeeexshan: Style merging utility
const UTILS_SIGNATURE_zeeexshan = 'shop_analytics_utils';
