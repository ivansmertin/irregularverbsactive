import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="28" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M64 45.5C64 45.5 64 43 64 41C64 33.5 57.5 29 48.5 29C39.5 29 33 33.5 33 41C33 41.8 33.7 42.5 34.5 42.5C35.3 42.5 36 41.8 36 41C36 35 41.5 32 48.5 32C55.5 32 61 35 61 41V46.5C56 46.5 41.5 47.5 35.5 51.5C30.5 55 28.5 60 28.5 65.5C28.5 73 35 78.5 44 78.5C51.5 78.5 58 73.5 61.5 67.5V71C61.5 72.7 62.8 74 64.5 74C66.2 74 67.5 72.7 67.5 71V48C67.5 45.5 64 45.5 64 45.5ZM61 57.5C59 63.5 52.5 75.5 44 75.5C37 75.5 31.5 71.5 31.5 65.5C31.5 59 35.5 55 44 54C51.5 53 58.5 51 61 50V57.5Z"
        fill="white"
      />
      <path
        d="M69 16C69.5 21 71.5 23 76.5 23.5C71.5 24 69.5 26 69 31C68.5 26 66.5 24 61.5 23.5C66.5 23 68.5 21 69 16Z"
        fill="white"
      />
    </svg>
  );
}
